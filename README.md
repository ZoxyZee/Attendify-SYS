# Attendify

This repository now has:

- the React/Vite admin dashboard in the project root
- the single Python backend in `python-backend`
- the Expo kiosk app in `kiosk-app`

## Run the web dashboard

```bash
npm install
npm run dev
```

## Run the Python backend

Use the guide inside `python-backend/README.md`.

## Frontend environment

Create a root `.env` with:

```env
VITE_API_URL=http://localhost:5000
```

## Deployment

### Backend on Render

Create a Web Service from this GitHub repo. Render can use `render.yaml`; the backend root is `python-backend`.

Set these Render environment variables:

- `MONGODB_URI`: your MongoDB Atlas connection string
- `CLIENT_URL`: your Netlify site URL, for example `https://your-site.netlify.app`
- `JWT_SECRET`: Render can generate this from `render.yaml`

The backend start command is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Dashboard on Netlify

Create a Netlify site from this GitHub repo. The included `netlify.toml` uses:

- Build command: `npm run build`
- Publish directory: `dist`

Set this Netlify environment variable:

- `VITE_API_URL`: your Render backend URL, for example `https://attendify-backend.onrender.com`
