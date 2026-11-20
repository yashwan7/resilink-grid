"""
RESILINK GRID - Hub Backend Application
Lead: Harshith
Principle: AI predicts, rules decide, logs prove.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT, DEBUG, DECISION_SUPPORT_DISCLAIMER
from db import init_all_databases
from api.routes_ingest import router as ingest_router
from api.routes_facilities import router as facilities_router
from api.routes_emergency import router as emergency_router
from api.routes_snapshots import router as snapshots_router
from api.routes_triage import router as triage_router
from api.routes_consult import router as consult_router
from api.routes_groot import router as groot_router
from api.routes_audit import router as audit_router

from services.facility_service import mutate_facilities_simulation_step
from services.emergency_service import process_outbox_retry_worker
from scripts.seed_data import seed_all_demo_data


# Background periodic tasks
async def background_simulation_loop():
    while True:
        try:
            await asyncio.sleep(10)
            mutate_facilities_simulation_step()
            process_outbox_retry_worker()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[BACKGROUND TASK ERROR] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize isolated databases and seed demo data if fresh
    init_all_databases()
    seed_all_demo_data()

    # Start simulation worker
    sim_task = asyncio.create_task(background_simulation_loop())
    yield
    # Shutdown
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="RESILINK GRID Hub Backend",
    description="Offline-first, end-to-end encrypted medical communication hub. Ingests ciphertext only. Built by Harshith.",
    version="4.0.0",
    lifespan=lifespan
)

# CORS middleware for doctor dashboard & patient app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routers
app.include_router(ingest_router)
app.include_router(facilities_router)
app.include_router(emergency_router)
app.include_router(snapshots_router)
app.include_router(triage_router)
app.include_router(consult_router)
app.include_router(groot_router)
app.include_router(audit_router)


@app.get("/")
def root():
    return {
        "system": "RESILINK GRID Hub Backend",
        "version": "4.0.0",
        "owner": "Harshith",
        "status": "OPERATIONAL",
        "architecture": "FastAPI + 4 Isolated SQLite WAL Schemas",
        "security_boundary": "Ciphertext-only ingest (Hub never holds keys or plaintext)",
        "disclaimer": DECISION_SUPPORT_DISCLAIMER,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }


@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "wal_mode": True, "schemas_isolated": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)
