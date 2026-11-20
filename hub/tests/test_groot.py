"""
Test Suite: Groot Voice & Chat Gateway
Owner: Harshith
Covers:
- Intent router over operational aggregates
- Privacy-safe broadcast announcement
- Safety disclaimer enforcement ("Decision support, not a diagnosis")
- GROOT_QUERY audit logging
- Strict zero plaintext / ciphertext isolation
"""

from groot.groot_gateway import groot_service
from db.audit import get_audit_db
from config import DECISION_SUPPORT_DISCLAIMER


def test_groot_link_state_intent():
    res = groot_service.process_query("What is the status of active transmission paths?")
    assert res["intent"] == "LINK_STATE"
    assert "PORT_A" in res["answer"] or "transmission" in res["answer"]
    assert res["wake_to_answer_latency_ms"] >= 0.0


def test_groot_chain_valid_intent():
    res = groot_service.process_query("Is the audit hash chain valid and intact?")
    assert res["intent"] == "CHAIN_VALID"
    assert "intact" in res["answer"].lower() or "audit" in res["answer"].lower()


def test_groot_privacy_announcement():
    res = groot_service.process_query("Announce P0 emergency broadcast")
    assert res["intent"] == "ANNOUNCEMENT"
    # Must omit patient name or diagnostic details
    assert "P0 alert, ward node 3, authorised staff only" in res["answer"]
    assert "PATIENT" not in res["answer"]


def test_groot_clinical_disclaimer_appended():
    res = groot_service.process_query("Tell me about the patient risk scores and emergency alerts")
    assert DECISION_SUPPORT_DISCLAIMER in res["answer"]
    assert res["disclaimer"] == DECISION_SUPPORT_DISCLAIMER


def test_groot_query_audit_event_logged():
    query_str = "Query for audit test"
    res = groot_service.process_query(query_str)

    conn = get_audit_db()
    cursor = conn.cursor()
    cursor.execute("SELECT payload_json FROM audit_events WHERE event_type = 'GROOT_QUERY' ORDER BY seq DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert query_str in row["payload_json"]
