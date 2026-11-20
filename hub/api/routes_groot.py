"""
Groot Gateway API Routes
GET /v1/groot/status
POST /v1/groot/query
POST /v1/groot/voice
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from groot.groot_gateway import groot_service
from config import DECISION_SUPPORT_DISCLAIMER

router = APIRouter(prefix="/v1/groot", tags=["Groot"])


class GrootTextQueryRequest(BaseModel):
    query: str = Field(..., description="Query for Groot intent router or knowledge base")
    source: Optional[str] = Field("chat", description="Origin: chat, terminal, or voice")


@router.get("/status")
def get_groot_status():
    """Returns Groot health, wake word status, latency baseline, and disclaimer."""
    return {
        "status": "ONLINE",
        "wake_word": "Hey Groot",
        "stt_engine": "Vosk (Local)",
        "tts_engine": "Piper (Local)",
        "isolation_level": "ZERO_PLAINTEXT_ZERO_CIPHERTEXT",
        "disclaimer": DECISION_SUPPORT_DISCLAIMER
    }


@router.post("/query")
def post_groot_query(req: GrootTextQueryRequest):
    """Processes text query through intent router or knowledge retriever with audit logging."""
    res = groot_service.process_query(query=req.query, source=req.source)
    return res


@router.post("/voice")
async def post_groot_voice(request: Request):
    """Accepts raw audio bytes from push-to-talk microphone, processes STT and returns answer."""
    audio_bytes = await request.body()
    res = groot_service.process_query(query="", source="voice", audio_bytes=audio_bytes if audio_bytes else None)
    return res

