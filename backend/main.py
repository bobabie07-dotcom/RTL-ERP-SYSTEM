from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import engine
from routers import alerts, auth, batch_plans, batches, dashboard, farms, feed, harvest, health, inventory, maintenance, mortality, procurement, reports, sales


def run_startup_migrations():
    with engine.begin() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN "
                "is_first_login BOOLEAN NOT NULL DEFAULT FALSE"
            ))
        except Exception:
            pass  # column already exists


app = FastAPI(
    title="RTL Poultry Farming ERP",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api"
app.include_router(auth.router,      prefix=API)
app.include_router(dashboard.router, prefix=API)
app.include_router(farms.router,     prefix=API)
app.include_router(batches.router,   prefix=API)
app.include_router(feed.router,      prefix=API)
app.include_router(mortality.router, prefix=API)
app.include_router(health.router,    prefix=API)
app.include_router(inventory.router, prefix=API)
app.include_router(sales.router,        prefix=API)
app.include_router(procurement.router,  prefix=API)
app.include_router(reports.router,      prefix=API)
app.include_router(batch_plans.router, prefix=API)
app.include_router(harvest.router,     prefix=API)
app.include_router(alerts.router,       prefix=API)
app.include_router(maintenance.router,  prefix=API)


run_startup_migrations()


@app.get("/api/health-check")
def health_check():
    return {"status": "ok", "service": "RTL Poultry ERP API"}
