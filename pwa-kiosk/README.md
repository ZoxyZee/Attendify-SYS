# Attendify PWA Kiosk

This is a separate phone-friendly PWA kiosk for the existing Attendify dashboard. It does not replace or modify the main dashboard UI.

## What It Does

- Logs in with the same admin account used by the main dashboard.
- Reads employees from the existing backend.
- Marks attendance through the fast dashboard-safe endpoint: `POST /attendance/mark-web`.
- Listens to realtime attendance events from `GET /attendance/events`.
- Uses IST display time.
- Shows camera preview only; attendance marking does not wait on heavy face ML.
- Uses browser face embeddings from `@vladmandic/face-api` for PWA face recognition.

## Folder Structure

```text
pwa-kiosk/
  public/
    icon.svg
    manifest.webmanifest
    sw.js
  src/
    components/       Reusable UI pieces
    config/           API URL and storage keys
    hooks/            Auth, camera, online, realtime, service worker hooks
    screens/          Top-level kiosk screen composition
    services/         Backend API client and endpoint wrappers
    utils/            Device ID and IST time helpers
    App.jsx           PWA state orchestration
    styles.css        PWA styling
  start-pwa.ps1       Windows one-command local starter
```

## Start Locally

From the project root:

```powershell
npm --prefix pwa-kiosk install
npm --prefix pwa-kiosk run dev
```

Open:

```text
http://127.0.0.1:5178
```

For phone testing on the same Wi-Fi, open:

```text
http://YOUR_COMPUTER_LAN_IP:5178
```

Mobile camera access normally requires HTTPS. For phone testing, prefer the tunnel script:

```powershell
powershell -ExecutionPolicy Bypass -File pwa-kiosk\start-tunnels.ps1
```

The PWA automatically talks to:

```text
http://SAME_HOST:5000
```

Set `VITE_API_URL` only when the backend is hosted somewhere else.

## Production Build

```powershell
npm --prefix pwa-kiosk run build
```

Deploy the generated `pwa-kiosk/dist` folder as a static site. In production, use HTTPS so camera permissions and PWA installation work reliably.
