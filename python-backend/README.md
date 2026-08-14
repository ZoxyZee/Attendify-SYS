# Attendify Python Backend

This is the single Python backend for Attendify. It mirrors the existing SaaS API surface used by the web dashboard and kiosk app and also exposes face-recognition endpoints from the same backend.

- `POST /auth/register-company`
- `POST /auth/login`
- `GET/POST/PUT/DELETE /employees/*`
- `POST /devices/register`
- `GET /devices/list`
- `GET /attendance/today`
- `GET /attendance/summary`
- `POST /attendance/mark`
- `POST /attendance/sync`
- `GET /company/settings`
- `PUT /company/settings`
- `POST /recognition/extract-embedding`
- `POST /recognition/recognize`

## Stack

- FastAPI
- MongoDB via PyMongo
- JWT auth
- bcrypt password hashing via Passlib
- SlowAPI rate limiting

## Folder Structure

```text
python-backend/
├─ app/
│  ├─ main.py                  FastAPI app and health endpoint
│  ├─ config.py                Environment settings
│  ├─ database.py              MongoDB connection and indexes
│  ├─ dependencies.py          JWT session validation
│  ├─ schemas.py               Pydantic models
│  ├─ security.py              Password/JWT helpers
│  ├─ routers/                 Auth, employees, devices, attendance, company, recognition
│  └─ utils/                   Attendance and work schedule helpers
├─ requirements.txt            Core backend dependencies
├─ requirements-recognition.txt Optional server-side face recognition dependencies
└─ README.md
```

More details:

- [app/README.md](app/README.md)
- [app/routers/README.md](app/routers/README.md)
- [app/utils/README.md](app/utils/README.md)

## Run

```bash
cd python-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

## Notes

- Keep your existing MongoDB running.
- Point the web dashboard and kiosk `API Base URL` to this Python backend.
- Point the kiosk `Recognition API URL` to this same backend URL too, for example `http://192.168.29.245:5000`.
- The phone must use your laptop LAN IP, not `127.0.0.1`.

## Optional recognition dependencies

The core backend starts with `requirements.txt`.

If you want server-side face recognition inside the same backend, install the optional recognition stack too:

```bash
pip install -r requirements-recognition.txt
```

On Windows with Python 3.12, `insightface` may require Microsoft C++ Build Tools. If that package is not installed yet, the backend still runs for auth, employees, attendance, devices, reports, and company settings, but `/recognition/*` will not be available until the optional package is installed successfully.
