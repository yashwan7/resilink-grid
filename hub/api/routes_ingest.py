"""
Ingest API Route
POST /v1/ingest/envelope
Accepts binary envelope or JSON hex payload.
Enforces strict ingest pipeline and returns trusted-time ACK or standard NACK codes.
"""

from fastapi import APIRouter, Request, HTTPException, Response
from pydantic import BaseModel, Field
from typing import Optional

from services.ingest_service import ingest_envelope, IngestNACK

router = APIRouter(prefix="/v1/ingest", tags=["Ingest"])


class EnvelopeJSONRequest(BaseModel):
    envelope_hex: str = Field(..., description="Hex-encoded envelope wire format")


@router.post("/envelope")
async def post_envelope(request: Request, body: Optional[EnvelopeJSONRequest] = None):
    """
    Ingests an encrypted envelope from Node B (Hub Gateway Node) or network client.
    Strict Ingest Order: Length -> Version -> Expiry -> Replay -> Signature -> Store.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Support raw octet-stream or JSON payload
    content_type = request.headers.get("content-type", "")
    if "application/octet-stream" in content_type:
        raw_bytes = await request.body()
    elif body and body.envelope_hex:
        try:
            raw_bytes = bytes.fromhex(body.envelope_hex)
        except ValueError:
            raise HTTPException(status_code=400, detail={"status": "NACK", "code": "BAD_LENGTH", "detail": "Invalid hex encoding"})
    else:
        # Fallback check for raw body
        raw_bytes = await request.body()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail={"status": "NACK", "code": "BAD_LENGTH", "detail": "Empty request body"})

    try:
        ack_res = ingest_envelope(raw_bytes, client_ip=client_ip)
        return ack_res
    except IngestNACK as e:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "NACK",
                "code": e.code,
                "detail": e.detail
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "ERROR", "detail": str(e)})
