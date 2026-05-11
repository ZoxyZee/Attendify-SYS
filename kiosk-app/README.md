# Attendify Kiosk

Expo React Native kiosk app for employee attendance scanning.

## Stack

- React Native
- Expo Camera
- Expo SQLite
- Axios
- NativeWind

## Notes

- The backend in this repository supports attendance marking and batch sync.
- True facial recognition is isolated behind `src/services/recognitionService.js`.
- The current implementation uses a kiosk-safe local matcher stub so the app flow, offline queue, and sync engine work immediately.
- To replace it with a production face model, keep the UI and sync flow and swap only the recognition service.

## Run

```bash
cd kiosk-app
npm install
npx expo start
```

## Admin Mode

- Long press the `Attendify Kiosk` badge on the scanner screen.
- Configure:
  - API Base URL
  - JWT token
  - Device ID
  - Device Name
- Register employees locally on the kiosk.
- Review queued/synced attendance logs.
- Trigger manual sync.

## Backend Integration

- `POST /attendance/mark`
- `POST /attendance/sync`

The kiosk stores unsent records in SQLite and retries sync automatically when the network returns.
