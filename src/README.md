# Web Dashboard Source

This folder contains the React/Vite web dashboard.

## Main Areas

- `main.jsx`: React app entry point
- `App.jsx`: route setup
- `pages/`: dashboard screens
- `components/`: reusable web UI components
- `layouts/`: dashboard shell/sidebar layout
- `context/`: auth and theme state
- `services/`: API clients for backend resources
- `utils/`: browser-side export/helper logic
- `index.css`: Tailwind and global styles

## Backend Link

The dashboard reads `VITE_API_URL` from the root `.env`.

```env
VITE_API_URL=http://127.0.0.1:5000
```

All web API calls go through `src/services/api.js`.

