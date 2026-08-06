/* Meridian FX Calendar — service worker
   Offline shell + scheduled release alerts.

   Delivery strategy, best first:
   1. Notification Triggers (TimestampTrigger) — the OS fires these even if the
      browser and app are fully closed. Chrome/Edge desktop + Android.
   2. setTimeout inside the worker — survives the page being closed for as long
      as the browser keeps the worker alive (typically minutes to hours).
   3. The page re-arms everything on every open, so nothing is lost permanently.
   True closed-app delivery on iOS needs server-side Web Push (VAPID). */

const CACHE = 'meridian-fx-v3';
const SHELL = [
  './',
  './app.dc.html',
  './support.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(r).then(hit => {
      const live = fetch(r).then(res => {
        if (res && res.status === 200) caches.open(CACHE).then(c => c.put(r, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || live;
    })
  );
});

/* ---- alert scheduling ---------------------------------------------------- */

const TRIGGERS_OK = (function () {
  try { return 'showTrigger' in Notification.prototype; } catch (e) { return false; }
})();

let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function opts(a, trigger) {
  const o = {
    body: a.body,
    tag: a.tag,
    renotify: true,
    requireInteraction: a.critical === true,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: a.critical ? [90, 60, 90, 60, 160] : [70, 50, 70],
    silent: false,
    data: { url: './app.dc.html#today' }
  };
  if (trigger) o.showTrigger = new TimestampTrigger(a.at);
  return o;
}

async function arm(list) {
  clearTimers();
  const now = Date.now();
  const due = list.filter(a => a.at > now && a.at - now < 8 * 24 * 3600e3);

  /* Clear previously scheduled triggers so re-arming never double-fires. */
  if (TRIGGERS_OK) {
    try {
      const pending = await self.registration.getNotifications({ includeTriggered: false });
      pending.forEach(n => n.close());
    } catch (e) {}
  }

  for (const a of due) {
    if (TRIGGERS_OK) {
      try { await self.registration.showNotification(a.head, opts(a, true)); continue; } catch (e) {}
    }
    const delay = a.at - now;
    if (delay <= 26 * 3600e3) {
      timers.push(setTimeout(() => {
        self.registration.showNotification(a.head, opts(a, false));
      }, delay));
    }
  }
  return { scheduled: due.length, mode: TRIGGERS_OK ? 'triggers' : 'timers' };
}

self.addEventListener('message', e => {
  const d = e.data || {};
  const reply = msg => { try { e.source && e.source.postMessage(msg); } catch (err) {} };

  if (d.type === 'schedule') {
    e.waitUntil(arm(d.alerts || []).then(r => reply({ type: 'armed', ...r })));
  }
  if (d.type === 'clear') {
    clearTimers();
    if (TRIGGERS_OK) {
      e.waitUntil(self.registration.getNotifications({ includeTriggered: false })
        .then(ns => ns.forEach(n => n.close())).catch(() => {}));
    }
  }
  if (d.type === 'test') {
    e.waitUntil(self.registration.showNotification(d.head || 'Meridian FX', {
      body: d.body || 'Background alerts are armed.',
      icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      vibrate: [70, 50, 70], tag: 'mrdn-test', renotify: true,
      data: { url: './app.dc.html#today' }
    }));
  }
});

/* OS-granted background time — ask any live client to re-arm. */
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'mrdn-calendar') return;
  e.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true })
      .then(cs => cs.forEach(c => c.postMessage({ type: 'rearm' })))
  );
});

self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(p.head || 'Meridian FX', {
    body: p.body || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    vibrate: [90, 60, 90], tag: p.tag || 'mrdn-push', renotify: true,
    requireInteraction: !!p.critical,
    data: { url: './app.dc.html#today' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) if ('focus' in c) { c.postMessage({ type: 'rearm' }); return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
