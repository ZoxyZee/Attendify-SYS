import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import settings
from .database import check_database_connection, ensure_indexes
from .routers import attendance, auth, company, devices, employees, recognition


logger = logging.getLogger("attendify")
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_times}/{settings.rate_limit_seconds} seconds"])
app = FastAPI(title="Attendify Python Backend", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_client_urls,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup():
    try:
        ensure_indexes()
    except Exception:
        logger.exception("Database index initialization failed. The API will keep running for health checks.")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc) or "Internal server error."})


@app.get("/health")
@limiter.limit(f"{settings.rate_limit_times}/{settings.rate_limit_seconds} seconds")
async def health(request: Request):
    database_ok, database_message = check_database_connection()
    return {
        "success": database_ok,
        "message": "Attendify backend is running" if database_ok else "Attendify backend is running, but the database is unreachable.",
        "data": {
            "database": {
                "ok": database_ok,
                "message": database_message
            }
        }
    }


app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(devices.router)
app.include_router(attendance.router)
app.include_router(company.router)
app.include_router(recognition.router)
