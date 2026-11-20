"""
Docker-less Run Script for RESILINK GRID Hub Backend
Owner: Harshith
Starts the FastAPI backend with uvicorn, initializing databases and seeding Bangalore demo data.
"""

import sys
import uvicorn
from pathlib import Path

# Ensure hub root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import HOST, PORT, DEBUG
from db import init_all_databases
from scripts.seed_data import seed_all_demo_data
from scripts.export_openapi import export_openapi


def main():
    print("=" * 70)
    print("  RESILINK GRID - Hub Backend")
    print(f"  Starting server on http://{HOST}:{PORT}")
    print("  Schemas: medical.db | operational.db | infrastructure.db | audit.db")
    print("  FastAPI docs: http://localhost:8000/docs")
    print("=" * 70)

    # Initialize databases and seed initial data
    init_all_databases()
    seed_all_demo_data()
    export_openapi()

    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)


if __name__ == "__main__":
    main()
