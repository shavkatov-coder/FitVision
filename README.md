# FitVision AI

Premium virtual try-on demo app: live camera fitting, upload photo mode, before/after compare, save/share, favorites, AI size recommendation, AI stylist, trend radar and Node.js backend APIs.

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .\start-fitvision.ps1
```

Then open:

```text
http://localhost:4173
```

## What's inside

- `server.js` - Node.js backend with product catalog, size recommendation, stylist, favorites, trends and voice-command APIs.
- `public/index.html` - responsive app shell.
- `public/styles.css` - premium glassmorphism UI, mobile/tablet/desktop layouts.
- `public/app.js` - camera system, MediaPipe pose integration, canvas try-on renderer, upload photo, compare, save/share, voice command and Three.js avatar preview.

MediaPipe, Three.js and Lucide load from CDN when internet is available. The try-on canvas keeps working with a smart fitting fallback if those libraries are unavailable.
