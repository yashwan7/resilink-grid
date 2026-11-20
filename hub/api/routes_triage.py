"""
Triage Queue API Routes
GET /v1/triage/queue (metadata only)
GET /v1/triage/formula (published contract for doctor client)
"""

from fastapi import APIRouter
from services.triage_service import get_triage_queue, get_ranking_formula_spec

router = APIRouter(prefix="/v1/triage", tags=["Triage"])


@router.get("/queue")
def list_triage_queue():
    """Returns metadata-only triage queue ordered by SOS (P0), coarse priority, device, and arrival time."""
    queue = get_triage_queue()
    return {
        "count": len(queue),
        "queue": queue
    }


@router.get("/formula")
def get_formula():
    """Returns the published fine ranking formula and weights for Harshavardhan (Doctor Client)."""
    return get_ranking_formula_spec()
