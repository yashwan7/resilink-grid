"""
Facilities API Routes
GET /v1/facilities/{hospitals|pharmacies|bloodbanks|ambulances}?lat&lon&radius_km
Provides radius search, near-expiry drug warnings (<30 days), and staleness badges (>15m).
"""

from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any

from services.facility_service import (
    get_hospitals, get_pharmacies, get_bloodbanks, get_ambulances
)

router = APIRouter(prefix="/v1/facilities", tags=["Facilities"])


@router.get("/hospitals")
def list_hospitals(
    lat: Optional[float] = Query(None, description="Center latitude for radius query"),
    lon: Optional[float] = Query(None, description="Center longitude for radius query"),
    radius_km: Optional[float] = Query(None, description="Search radius in kilometers")
):
    """Returns hospitals with free beds, ICU, O2, ventilators, and stale badges."""
    return {
        "facility_type": "hospitals",
        "count": len(get_hospitals(lat, lon, radius_km)),
        "data": get_hospitals(lat, lon, radius_km)
    }


@router.get("/pharmacies")
def list_pharmacies(
    lat: Optional[float] = Query(None, description="Center latitude"),
    lon: Optional[float] = Query(None, description="Center longitude"),
    radius_km: Optional[float] = Query(None, description="Search radius in kilometers")
):
    """Returns pharmacies with inventory, flagging rare drugs and expired/near-expiry (<30 days) medications."""
    return {
        "facility_type": "pharmacies",
        "count": len(get_pharmacies(lat, lon, radius_km)),
        "data": get_pharmacies(lat, lon, radius_km)
    }


@router.get("/bloodbanks")
def list_bloodbanks(
    lat: Optional[float] = Query(None, description="Center latitude"),
    lon: Optional[float] = Query(None, description="Center longitude"),
    radius_km: Optional[float] = Query(None, description="Search radius in kilometers")
):
    """Returns blood banks with available units per blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)."""
    return {
        "facility_type": "bloodbanks",
        "count": len(get_bloodbanks(lat, lon, radius_km)),
        "data": get_bloodbanks(lat, lon, radius_km)
    }


@router.get("/ambulances")
def list_ambulances(
    lat: Optional[float] = Query(None, description="Center latitude"),
    lon: Optional[float] = Query(None, description="Center longitude"),
    radius_km: Optional[float] = Query(None, description="Search radius in kilometers"),
    status: Optional[str] = Query(None, description="Status filter: FREE or BUSY")
):
    """Returns ambulances with real-time or cached status, contact, and distance."""
    return {
        "facility_type": "ambulances",
        "count": len(get_ambulances(lat, lon, radius_km, status_filter=status)),
        "data": get_ambulances(lat, lon, radius_km, status_filter=status)
    }
