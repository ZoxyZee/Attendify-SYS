# Attendify Fast PWA Scratch

Fresh browser/PWA attendance system with a lightweight JS backend.

## Structure

```text
pwa-scratch/
  backend/   Express + MongoDB API on port 5055
  web/       Vite React PWA on port 5176
  scripts/   start, stop, and health checks
```

## Start

```powershell
cd D:\attendify\Attendify\pwa-scratch
npm run install:all
npm run start:all
```

Open:

```text
http://127.0.0.1:5176
```

Backend health:

```text
http://127.0.0.1:5055/health
```

## Stop

```powershell
npm run stop:all
```

## Check

```powershell
npm run check
```

The check creates a test employee, marks attendance, verifies realtime SSE, and confirms dashboard summary data.

## Phone/PWA Use

For phone testing, open the LAN URL shown by Vite, for example:

```text
http://YOUR_LAPTOP_IP:5176
```

Camera access from a phone browser usually requires HTTPS in production. On deployed HTTPS hosting, install from the browser menu using "Add to Home screen".

## Speed

- Employee registration is a single lightweight API write.
- Attendance marking is a single lightweight API write.
- No heavy on-device ML is used in this scratch PWA flow.
