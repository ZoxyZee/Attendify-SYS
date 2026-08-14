# Mobile Kiosk Source

Expo React Native source code for the attendance kiosk app.

## Main Areas

- `components/`: reusable mobile UI pieces
- `context/`: kiosk session, SQLite-backed data state, sync orchestration
- `hooks/`: scanner lifecycle hooks
- `screens/`: top-level mobile screens
- `services/`: API clients, SQLite storage, recognition, sync, embeddings
- `shims/`: compatibility shims for React Native dependencies

## Backend Link

The mobile app must use the laptop LAN IP, not `127.0.0.1`.

Example:

```text
API Base URL: http://10.113.111.211:5000
Recognition API URL: http://10.113.111.211:5000
```

