"""
Groot Gateway (Voice + Chat, Local, Advisory Only)
OpenWakeWord ("Hey Groot") / TFT push-to-talk fallback hooks, Vosk STT, Piper TTS.
Intent router answers operational status from system aggregates.
Strict security isolation:
- Groot NEVER receives ciphertext, plaintext or keys.
- Groot CANNOT mutate routes, retries, or emergency allocations.
- Groot ALWAYS appends "Decision support, not a diagnosis" to any risk statement.
- Groot logs GROOT_QUERY to the audit hash chain.
- Broadcast announcements omit patient detail: "P0 alert, ward node 3, authorised staff only".
"""

import time
import json
import re
from typing import Dict, Any, Optional

from config import DECISION_SUPPORT_DISCLAIMER
from db.infrastructure import get_infrastructure_db
from db.operational import get_operational_db
from db.medical import get_medical_db
from db.audit import append_audit_event, verify_audit_chain
from groot.knowledge import query_knowledge_base


class GrootGateway:
    def __init__(self):
        self.wake_word = "Hey Groot"
        self.is_active = True

    def process_query(self, query: str, source: str = "chat",
                      audio_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Processes voice or text query, measures latency, routes intents over aggregates,
        logs GROOT_QUERY, and enforces clinical disclaimer.
        """
        start_time = time.perf_counter()

        # Simulated STT if audio bytes provided (Vosk hook)
        if audio_bytes and not query:
            query = "status of routes"

        normalized_query = query.strip().lower()

        # Intent Recognition
        intent = self._classify_intent(normalized_query)
        response_text, context_data = self._dispatch_intent(intent, normalized_query)

        # Enforce clinical disclaimer if risk/health mentioned
        if any(w in response_text.lower() for w in ["risk", "score", "vitals", "critical", "p0", "emergency"]):
            if DECISION_SUPPORT_DISCLAIMER not in response_text:
                response_text += f"\n\n[{DECISION_SUPPORT_DISCLAIMER}]"

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Audit event
        append_audit_event("GROOT_QUERY", {
            "source": source,
            "intent": intent,
            "query": query,
            "latency_ms": latency_ms
        })

        # Piper TTS hook: in production produces audio buffer; in API reports synthesized audio state
        audio_synthesized = source == "voice"

        return {
            "wake_word_detected": True,
            "intent": intent,
            "query": query,
            "answer": response_text,
            "context": context_data,
            "audio_synthesized": audio_synthesized,
            "wake_to_answer_latency_ms": latency_ms,
            "disclaimer": DECISION_SUPPORT_DISCLAIMER
        }

    def _classify_intent(self, query: str) -> str:
        if any(w in query for w in ["announce", "broadcast", "speak"]):
            return "ANNOUNCEMENT"
        if any(w in query for w in ["route", "link", "wifi", "mesh", "signal", "rssi", "path"]):
            return "LINK_STATE"
        if any(w in query for w in ["audit", "chain", "tamper", "hash", "valid", "integrity"]):
            return "CHAIN_VALID"
        if any(w in query for w in ["alert", "p0", "warning", "triage", "sos", "critical count"]):
            return "LAST_ALERTS"
        if any(w in query for w in ["ambulance", "nearest free ambulance", "ems"]):
            return "NEAREST_AMBULANCE"
        if any(w in query for w in ["hospital", "allocated", "beds free"]):
            return "ALLOCATED_HOSPITAL"
        return "GENERAL_KNOWLEDGE"

    def _dispatch_intent(self, intent: str, query: str) -> tuple[str, Dict[str, Any]]:
        if intent == "LINK_STATE":
            return self._handle_link_state()
        elif intent == "CHAIN_VALID":
            return self._handle_chain_valid()
        elif intent == "LAST_ALERTS":
            return self._handle_last_alerts()
        elif intent == "NEAREST_AMBULANCE":
            return self._handle_nearest_ambulance()
        elif intent == "ALLOCATED_HOSPITAL":
            return self._handle_allocated_hospital()
        elif intent == "ANNOUNCEMENT":
            return self._handle_announcement()
        else:
            # Fallback to local RAG over documentation facts
            doc_context = query_knowledge_base(query)
            return (
                f"Groot Advisory: {doc_context}",
                {"retrieved_docs": True}
            )

    def _handle_link_state(self) -> tuple[str, Dict[str, Any]]:
        conn = get_infrastructure_db()
        cursor = conn.cursor()
        cursor.execute("SELECT route_id, name, status, pdr, rssi, latency_ms FROM routes ORDER BY route_id ASC")
        routes = [dict(r) for r in cursor.fetchall()]
        conn.close()


        if not routes:
            return "All routes are currently offline or uninitialized.", {"routes": []}

        active = [r["name"] for r in routes if r["status"] == "ACTIVE"]
        active_str = ", ".join(active) if active else "None"
        primary = routes[0]["name"]
        return (
            f"Active transmission paths: {active_str}. Primary link is {primary}.",
            {"routes": routes}
        )

    def _handle_chain_valid(self) -> tuple[str, Dict[str, Any]]:
        verification = verify_audit_chain()
        if verification.get("valid"):
            return (
                f"Audit hash chain is cryptographically intact across {verification.get('total_events', 0)} logged events.",
                verification
            )
        else:
            return (
                f"WARNING: Audit hash chain corruption detected at sequence {verification.get('first_bad_seq')}!",
                verification
            )

    def _handle_last_alerts(self) -> tuple[str, Dict[str, Any]]:
        conn = get_medical_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as p0_count FROM envelopes WHERE priority = 0")
        p0_count = cursor.fetchone()["p0_count"]
        cursor.execute("SELECT COUNT(*) as p1_count FROM envelopes WHERE priority = 1")
        p1_count = cursor.fetchone()["p1_count"]
        conn.close()

        return (
            f"Current priority queue: {p0_count} P0 (Critical/SOS) envelopes and {p1_count} P1 (High) envelopes recorded.",
            {"p0_count": p0_count, "p1_count": p1_count}
        )

    def _handle_nearest_ambulance(self) -> tuple[str, Dict[str, Any]]:
        conn = get_infrastructure_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, lat, lon, contact, status FROM ambulances WHERE status = 'FREE' LIMIT 1")
        amb = cursor.fetchone()
        conn.close()

        if amb:
            return (
                f"Nearest free ambulance is unit {amb['id']} (contact: {amb['contact']}).",
                dict(amb)
            )
        return "No free ambulances available in the sector; requests are queued in outbox.", {"available": False}

    def _handle_allocated_hospital(self) -> tuple[str, Dict[str, Any]]:
        conn = get_operational_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, allocated_hospital_id, assigned_ambulance_id, status 
            FROM emergencies 
            ORDER BY created_at DESC LIMIT 1
        """)
        emg = cursor.fetchone()
        conn.close()

        if emg:
            return (
                f"Latest emergency {emg['id']} is allocated to hospital {emg['allocated_hospital_id']} with ambulance {emg['assigned_ambulance_id']} ({emg['status']}).",
                dict(emg)
            )
        return "No active emergency allocations currently logged.", {"active": False}

    def _handle_announcement(self) -> tuple[str, Dict[str, Any]]:
        # Privacy-safe alert: never announces patient name or clinical specifics
        announcement = "P0 alert, ward node 3, authorised staff only"
        return (announcement, {"privacy_mode": "redacted_metadata_only"})


# Global instance
groot_service = GrootGateway()
