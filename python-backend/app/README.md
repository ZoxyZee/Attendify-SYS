# Backend App

FastAPI application package.

## Main Files

- `main.py`: FastAPI app setup, CORS, health check, router registration
- `config.py`: environment-backed settings
- `database.py`: MongoDB client and indexes
- `dependencies.py`: auth/session dependencies and serialization helpers
- `schemas.py`: Pydantic request/response models
- `security.py`: password hashing and JWT helpers

## Subfolders

- `routers/`: API endpoints grouped by resource
- `utils/`: attendance and schedule calculations

