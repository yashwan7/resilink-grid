"""
Snapshot Relay API Routes
POST /v1/snapshots/request
Verifies doctor's ECDSA signature, relays to device, stores returned ciphertext, and handles NO_BASE.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from services.snapshot_service import process_snapshot_request

router = APIRouter(prefix="/v1/snapshots", tags=["Snapshots"])


class SnapshotRequestModel(BaseModel):
    doctor_id: str = Field(..., description="Authorized doctor ID")
    device_id: str = Field(..., description="Target patient/ward node ID")
    timestamp: int = Field(..., description="Request timestamp (seconds)")
    requested_keyframe_id: str = Field("latest", description="Base keyframe ID or 'latest'")
    signature_hex: str = Field(..., description="64-byte raw ECDSA signature hex over SNAPSHOT_REQ payload")
    device_response_ciphertext_hex: Optional[str] = Field(None, description="Simulated device returned ciphertext")
    device_reports_no_base: Optional[bool] = Field(False, description="Flag simulating device NO_BASE condition")


@router.post("/request")
def request_snapshot(req: SnapshotRequestModel):
    """Relays signed snapshot request to device, stores ciphertext, and audits request."""
    try:
        sig_bytes = bytes.fromhex(req.signature_hex)
        resp_ciphertext = bytes.fromhex(req.device_response_ciphertext_hex) if req.device_response_ciphertext_hex else None
        
        result = process_snapshot_request(
            doctor_id=req.doctor_id,
            device_id=req.device_id,
            timestamp_sec=req.timestamp,
            requested_keyframe_id=req.requested_keyframe_id,
            signature_bytes=sig_bytes,
            device_response_ciphertext=resp_ciphertext,
            device_reports_no_base=req.device_reports_no_base
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
