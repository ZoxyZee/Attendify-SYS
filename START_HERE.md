# Attendify Start Guide

Use this guide when you want to run the full Attendify project locally.

## Project Parts

- Web dashboard: React/Vite app in the project root
- Backend API: Express/MongoDB app in `node-backend`
- Backup backend: FastAPI app in `python-backend`
- Kiosk app: Expo React Native app in `kiosk-app`

See [README.md](README.md) for the full folder structure map.

## Required Tools

- Node.js and npm
- Python 3.11 or newer
- MongoDB Atlas connection string, or local MongoDB
- Expo Go app on your phone, if you want to test the kiosk app on mobile

## 1. Start The Backend

## Start Everything In One Go

From the project root:

```powershell
cd D:\attendify\Attendify
npm run start:all
```

If the mobile app is showing an old bundle, start everything with Expo cache clear:

```powershell
npm run start:all:clear
```

To stop the local stack:

```powershell
npm run stop:all
```

The script starts:

- Docker MongoDB container
- JS backend on `5000`
- Vite web dashboard on `5173`
- Expo Metro on `8081`

If you see `uvicorn is not recognized`, use `python -m uvicorn` or run the one-go script above. The script uses the backend virtual environment directly, so it does not need `uvicorn` on your global PATH.

## 1. Start The Backend Manually

Start MongoDB with Docker:

```powershell
docker run -d --name attendify-mongo -p 27017:27017 -v attendify-mongo-data:/data/db mongo:7
```

If the container already exists, start it again with:

```powershell
docker start attendify-mongo
```

Open a terminal in the project root:

```powershell
cd D:\attendify\Attendify\python-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create or update `python-backend\.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/attendify
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN_DAYS=30
RATE_LIMIT_TIMES=200
RATE_LIMIT_SECONDS=900
```

Start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

Check it in the browser:

```text
http://127.0.0.1:5000/health
```

If MongoDB is not reachable in development, the backend may use an in-memory fallback database. That is okay for quick testing, but data will not be saved permanently.

## 2. Start The Web Dashboard

Open a second terminal in the project root:

```powershell
cd D:\attendify\Attendify
npm install
```

Create or update the root `.env`:

```env
VITE_API_URL=http://127.0.0.1:5000
```

Start the dashboard:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## 3. Start The Kiosk App

Open a third terminal:

```powershell
cd D:\attendify\Attendify\kiosk-app
npm install
npx expo start
```

Use Expo Go to scan the QR code.

Inside the kiosk app admin settings, set:

```text
API Base URL: http://YOUR_COMPUTER_LAN_IP:5000
Recognition API URL: http://YOUR_COMPUTER_LAN_IP:5000
```

Do not use `localhost` on the phone. On a phone, `localhost` means the phone itself, not your laptop. Use your laptop Wi-Fi IP address, for example:

```text
http://192.168.1.10:5000
```

## Useful Commands

Build the web dashboard:

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

Start backend from the root shortcut:

```powershell
npm run backend:dev
```

## Common Ports

- Backend API: `5000`
- Web dashboard: `5173`
- Expo Metro: `8081`

If a port is already busy, either close the old process or start the service on another port.

## Quick Health Check

Backend:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:5000/health -UseBasicParsing
```

Dashboard:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:5173 -UseBasicParsing
```

Expo Metro:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8081/status -UseBasicParsing
```
