"""
F4 Triage Queue Service (Metadata Only)
Hub ranks ONLY by clear unencrypted metadata (coarse priority, SOS, arrival time).
Fine criticality ranking is NOT computed on hub (Hub has zero plaintext).
Includes published contract formula for Harshavardhan (Doctor Client).
"""

from typing import List, Dict, Any
from db.medical import get_medical_db
from config import DECISION_SUPPORT_DISCLAIMER

# CONTRACT FORMULA PUBLISHED TO HARSHAVARDHAN (DOCTOR CLIENT)
DOCTOR_FINE_RANKING_FORMULA = """
// Formula for Doctor Client Fine Ranking (Computed in Browser after Decryption):
// priority_score = (clinical_score * time_sensitivity) / Math.max(1.0, eta_minutes)
// 
// Parameters:
// - clinical_score (0-100): Decrypted from on-device TinyML risk score payload.
// - time_sensitivity:
//     * CRITICAL: 10.0
//     * HIGH:      5.0
//     * MED:       2.0
//     * LOW:       1.0
// - eta_minutes: Float ETA from hub emergency engine assignment.
//
// Display Rule: SOS pinned to top, color-coded, always display:
// "Decision support, not a diagnosis"
"""


def get_triage_queue() -> List[Dict[str, Any]]:
    """
    Returns triage queue sorted by:
    1. SOS / P0 (priority 0) first
    2. Coarse priority class (0=P0, 1=P1, 2=P2)
    3. Device ID
    4. Arrival timestamp (FIFO)
    Note: Returns metadata ONLY. No ciphertext, no plaintext.
    """
    conn = get_medical_db()
    cursor = conn.cursor()
    # Query latest envelope per device to avoid queue bloat
    cursor.execute("""
        SELECT 
            device_id,
            seq,
            epoch,
            priority,
            counter,
            created_at,
            LENGTH(ciphertext) as ciphertext_bytes
        FROM envelopes e1
        WHERE e1.id = (
            SELECT MAX(e2.id) 
            FROM envelopes e2 
            WHERE e2.device_id = e1.device_id
        )
        ORDER BY 
            priority ASC,
            created_at ASC,
            device_id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    queue = []
    for r in rows:
        p = r["priority"]
        priority_label = "P0" if p == 0 else ("P1" if p == 1 else "P2")
        is_sos = (p == 0)
        coarse_class = "CRITICAL" if p == 0 else ("HIGH" if p == 1 else "MED_OR_LOW")

        queue.append({
            "device_id": r["device_id"],
            "seq": r["seq"],
            "epoch": r["epoch"],
            "priority": priority_label,
            "coarse_class": coarse_class,
            "is_sos": is_sos,
            "counter": r["counter"],
            "arrived_at": r["created_at"],
            "ciphertext_bytes": r["ciphertext_bytes"],
            "ranking_mode": "hub_metadata_only",
            "disclaimer": DECISION_SUPPORT_DISCLAIMER
        })

    return queue


def get_ranking_formula_spec() -> Dict[str, Any]:
    """Exposes the exact formula contract for the doctor dashboard."""
    return {
        "formula": "priority_score = (clinical_score * time_sensitivity) / Math.max(1.0, eta_minutes)",
        "weights": {
            "CRITICAL": 10.0,
            "HIGH": 5.0,
            "MED": 2.0,
            "LOW": 1.0
        },
        "disclaimer_required": DECISION_SUPPORT_DISCLAIMER,
        "contract_code": DOCTOR_FINE_RANKING_FORMULA.strip()
    }
