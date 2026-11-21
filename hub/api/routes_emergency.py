"""
Emergency Engine API Routes
POST /v1/emergency/trigger
GET /v1/emergency/{id}
POST /v1/emergency/{id}/override
"""

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field
from typing import List, Optional

from services.emergency_service import (
    trigger_emergency, get_emergency_by_id, apply_human_override,
    get_prearrival_handoff, execute_break_glass_unlock, generate_fhir_bundle
)

router = APIRouter(prefix="/v1/emergency", tags=["Emergency"])


class EmergencyTriggerRequest(BaseModel):
    pseudonym: str = Field(..., description="Patient pseudonym (clinical details remain encrypted on-device)")
    lat: float = Field(..., description="Patient GPS latitude")
    lon: float = Field(..., description="Patient GPS longitude")
    ts: int = Field(..., description="Timestamp in seconds")
    priority_class: str = Field("P0", alias="class", description="Priority class (must be P0 for emergency trigger)")
    need: List[str] = Field(..., description="Specific resource needs: ICU, O2, BLOOD, VENTILATOR, GENERAL")
    device_id: str = Field(..., description="Originating NXP device ID")
    counter: int = Field(..., description="Monotonic sequence counter for replay defense and idempotency")
    signature_hex: str = Field(..., description="64-byte raw ECDSA signature hex over canonical trigger payload")


class BreakGlassRequest(BaseModel):
    shares: List[str] = Field(..., min_items=2, description="At least 2 valid Shamir key shares for threshold quorum")
    actor_id: str = Field(..., description="ID of clinician or paramedic initiating break-glass")
    reason: str = Field("Unconscious trauma patient emergency admission", description="Audited clinical justification")


class HumanOverrideRequest(BaseModel):
    operator_id: str = Field(..., description="ID of dispatch operator")
    new_status: Optional[str] = Field(None, description="New status: ASSIGNED, EN_ROUTE, ARRIVED, CANCELLED")
    new_ambulance_id: Optional[str] = Field(None, description="Reassigned ambulance ID")
    new_hospital_id: Optional[str] = Field(None, description="Reassigned hospital ID")
    reason: str = Field("Manual operator override", description="Clinical or dispatch reason")


@router.get("/{id}/handoff")
def get_emergency_handoff(id: str = Path(..., description="Emergency ID")):
    """
    Pre-arrival Golden Hour Handoff endpoint.
    Delivers encrypted patient medical context, ABHA identifier, 10-minute vitals trend,
    and net time saved metrics to receiving ER hospital before ambulance arrival.
    """
    try:
        return get_prearrival_handoff(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": str(e)})


@router.post("/{id}/break-glass")
def post_break_glass_unlock(id: str, req: BreakGlassRequest):
    """
    Shamir 2-of-3 break-glass threshold unlock for unconscious patients.
    Validates quorum of key shares and creates an immutable cryptographic audit event
    in the HMAC-SHA256 hash chain before granting access.
    """
    try:
        return execute_break_glass_unlock(
            emergency_id=id,
            shares=req.shares,
            actor_id=req.actor_id,
            reason=req.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})


@router.get("/{id}/fhir")
def get_emergency_fhir(id: str = Path(..., description="Emergency ID")):
    """
    Exports pre-arrival patient context as a compliant FHIR R4 Bundle
    meeting Ayushman Bharat Digital Mission (ABDM) / NRCeS specifications.
    """
    try:
        return generate_fhir_bundle(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": str(e)})


@router.post("/trigger")
def post_emergency_trigger(req: EmergencyTriggerRequest):
    """
    Triggers deterministic offline emergency allocation:
    Picks nearest FREE ambulance, scores best hospital (distance + capability + beds - stale penalty),
    queues multi-path dispatch, enforces idempotency, and logs every audit step.
    """
    try:
        sig_bytes = bytes.fromhex(req.signature_hex)
        res = trigger_emergency(
            pseudonym=req.pseudonym,
            lat=req.lat,
            lon=req.lon,
            ts_sec=req.ts,
            priority_class=req.priority_class,
            need=req.need,
            device_id=req.device_id,
            counter=req.counter,
            signature_bytes=sig_bytes
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Internal allocation failure: {str(e)}"})


@router.get("/{id}")
def get_emergency(id: str = Path(..., description="Emergency ID")):
    """Returns active emergency status, assigned ambulance, and allocated hospital."""
    emg = get_emergency_by_id(id)
    if emg is None:
        raise HTTPException(status_code=404, detail={"error": f"Emergency '{id}' not found"})
    return emg


@router.post("/{id}/override")
def post_emergency_override(id: str, req: HumanOverrideRequest):
    """Applies human operator override to emergency assignment or status."""
    try:
        res = apply_human_override(
            emergency_id=id,
            operator_id=req.operator_id,
            new_status=req.new_status,
            new_ambulance_id=req.new_ambulance_id,
            new_hospital_id=req.new_hospital_id,
            reason=req.reason
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
