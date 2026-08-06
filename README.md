# Meridian FX Calendar

High-impact forex economic calendar. Cross-checked against ForexFactory, Investing.com
and Myfxbook. Installs to an Android or iOS home screen as a PWA and works offline.

## Put it online (required before you can install it)

Android will not install the app, and the alert scheduler will not run, unless the
files are served over **HTTPS**. GitHub Pages does that for free.

1. Upload every file in this folder to the repository root — keep the folder
   structure exactly as it is (`icons/` stays a folder).
2. In the repository: **Settings → Pages**.
3. Under *Build and deployment*, set **Source: Deploy from a branch**,
   **Branch: main**, folder **/ (root)**. Save.
4. Wait one or two minutes. Your app is live at
   `https://<your-username>.github.io/Calendar/`

## Install on Android

1. Open that URL in **Chrome** on your phone (Chrome or Edge — Samsung Internet
   and Firefox do not support the scheduled alerts).
2. Three-dot menu → **Install app**.
3. Launch it from the **home-screen icon**, not from a Chrome tab.
4. Tap **ALERTS OFF** in the top bar so it turns green, and **Allow** the
   notification permission.
5. **DATA → TEST NOTIFICATION** to confirm it reaches your lock screen.
6. **Settings → Apps → Meridian FX → Battery → Unrestricted**, so Android does
   not delay alerts.

The full guide is inside the app: **DATA → ANDROID GUIDE**.

## Install on iPhone

Share → **Add to Home Screen**. Alerts fire while the app is backgrounded; iOS
does not support scheduled notification triggers, so fully-closed delivery needs
server-side push.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Entry point; redirects to the app |
| `app.dc.html` | The application — all UI, logic and calendar data |
| `support.js` | Runtime the app needs to render |
| `sw.js` | Service worker: offline cache + scheduled release alerts |
| `manifest.webmanifest` | Makes it installable |
| `icons/` | Home-screen and notification icons |
| `.nojekyll` | Stops GitHub Pages mangling the files |

## Updating the calendar data

Event data lives in `app.dc.html` in the `MRDN_EVENTS` array. Either edit it and
re-upload, or connect a JSON feed URL under **DATA** in the app, which refreshes
on every load without touching the source.

## Disclaimer

Economic calendar data is provided for information only and can change without
notice. Not investment advice.
