# Attendify

Attendify is a full-stack attendance system with three linked parts:

- Web dashboard: React/Vite dashboard in the repository root
- Mobile kiosk app: Expo React Native app in `kiosk-app`
- Backend API: Express/MongoDB service in `node-backend`
- Backup backend: FastAPI service in `python-backend`

The mobile app and web dashboard both talk to the same backend, and the backend stores shared company, employee, device, face-profile, and attendance data in MongoDB.

## Start Locally

Use [START_HERE.md](START_HERE.md) for the full local setup and start guide.

## Repository Structure

```text
Attendify/
├─ src/                         Web dashboard source code
├─ public/                      Web dashboard static assets
├─ python-backend/              FastAPI backend and recognition API
│  ├─ app/
│  │  ├─ routers/               API route modules
│  │  └─ utils/                 Attendance and schedule helpers
│  └─ requirements.txt          Backend Python dependencies
├─ kiosk-app/                   Expo mobile kiosk app
│  ├─ src/
│  │  ├─ components/            Mobile UI components
│  │  ├─ context/               Kiosk session and data state
│  │  ├─ hooks/                 Scanner flow hooks
│  │  ├─ screens/               Mobile screens
│  │  └─ services/              Mobile API, SQLite, sync, recognition logic
│  └─ assets/models/            On-device face embedding model assets
├─ scripts/                     Local helper scripts
├─ START_HERE.md                Local run guide
└─ README.md                    Project overview
```

## Data Flow

```text
Web Dashboard ─┐
               ├─ FastAPI Backend ─ MongoDB
Mobile Kiosk ──┘

Mobile Kiosk ─ captures face samples
Mobile Kiosk ─ saves employee face embeddings locally and syncs them to backend
Mobile Kiosk ─ marks attendance
Web Dashboard ─ shows employees, devices, attendance, reports, and settings
```

## Folder Guides

- [src/README.md](src/README.md)
- [public/README.md](public/README.md)
- [python-backend/README.md](python-backend/README.md)
- [python-backend/app/README.md](python-backend/app/README.md)
- [kiosk-app/README.md](kiosk-app/README.md)
- [kiosk-app/src/README.md](kiosk-app/src/README.md)
- [kiosk-app/assets/README.md](kiosk-app/assets/README.md)
- [scripts/README.md](scripts/README.md)

## Run the web dashboard

```bash
npm install
npm run dev
```

## Run the JS backend

```bash
cd node-backend
npm install
npm run dev
```

## Python backend backup

Use the guide inside `python-backend/README.md`.

## PWA Kiosk

The dashboard includes an installable PWA kiosk at:

```text
/kiosk
```

After signing in, open `/kiosk` on a phone browser and install it from the browser menu or the in-app install action. It uses the same backend session and realtime attendance pipeline as the dashboard.

## Frontend environment

Create a root `.env` with:

```env
VITE_API_URL=http://localhost:5000
```

## Deployment

### Backend on Render

Create a Web Service from this GitHub repo. Render can use `render.yaml`; the backend root is `node-backend`.

Set these Render environment variables:

- `MONGODB_URI`: your MongoDB Atlas connection string
- `CLIENT_URL`: your Netlify site URL, for example `https://your-site.netlify.app`
- `JWT_SECRET`: Render can generate this from `render.yaml`

The backend start command is:

```bash
npm start
```

### Dashboard on Netlify

Create a Netlify site from this GitHub repo. The included `netlify.toml` uses:

- Build command: `npm run build`
- Publish directory: `dist`

Set this Netlify environment variable:

- `VITE_API_URL`: your Render backend URL, for example `https://attendify-backend.onrender.com`

After Netlify deploys, set Render `CLIENT_URL` to the Netlify URL so browser requests and realtime attendance events are allowed by CORS.
