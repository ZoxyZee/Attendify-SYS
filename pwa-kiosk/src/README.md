# PWA Source

This folder contains the standalone Attendify PWA kiosk. It connects to the existing dashboard backend and does not depend on Expo or the old mobile app.

## Runtime Flow

1. `App.jsx` manages kiosk state.
2. `services/apiClient.js` calls the existing backend.
3. `hooks/useRealtimeAttendance.js` listens for dashboard realtime updates.
4. `screens/KioskScreen.jsx` composes the visible kiosk UI.
5. `components/` renders the smaller UI pieces.
