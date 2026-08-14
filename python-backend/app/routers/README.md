# Backend Routers

FastAPI route modules.

- `auth.py`: company registration, login, `/auth/me`
- `employees.py`: employee CRUD
- `devices.py`: kiosk/device registration and listing
- `attendance.py`: attendance marking, sync, today view, summary
- `company.py`: company settings
- `recognition.py`: face embedding extraction and recognition endpoints

All protected routers use `get_current_user` from `app/dependencies.py`.

