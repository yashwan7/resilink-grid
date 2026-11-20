"""
RESILINK GRID v4 — NEWS2 (National Early Warning Score 2) Clinical Rule Engine
Reference: Royal College of Physicians (UK) NEWS2 standard guidelines.
Used as the verified on-device deterministic fallback and disagreement cross-check.
"""

from typing import Dict, Tuple, List, Any


def calculate_news2(
    hr: float,
    spo2: float,
    temp: float,
    resp: float,
    hypercapnic: bool = False
) -> Dict[str, Any]:
    """
    Computes NEWS2 score, severity tier, and component subscores.
    
    Returns:
        {
            "score": int (0-20),
            "class": "LOW" | "MED" | "HIGH" | "CRITICAL",
            "priority": "P0" | "P1" | "P2",
            "subscores": dict,
            "top_factors": list of str (top 3 factors contributing to score),
            "extreme_single_score": bool (True if any parameter >= 3)
        }
    """
    subscores = {}
    
    # 1. Respiration Rate (breaths/min)
    if resp <= 8:
        subscores["RESP"] = 3
    elif 9 <= resp <= 11:
        subscores["RESP"] = 1
    elif 12 <= resp <= 20:
        subscores["RESP"] = 0
    elif 21 <= resp <= 24:
        subscores["RESP"] = 2
    else:  # >= 25
        subscores["RESP"] = 3

    # 2. Oxygen Saturation SpO2 (%) - Scale 1 (Normal)
    if not hypercapnic:
        if spo2 <= 91:
            subscores["SPO2"] = 3
        elif 92 <= spo2 <= 93:
            subscores["SPO2"] = 2
        elif 94 <= spo2 <= 95:
            subscores["SPO2"] = 1
        else:  # >= 96
            subscores["SPO2"] = 0
    else:
        # Scale 2 (Hypercapnic respiratory failure target 88-92%)
        if spo2 <= 83:
            subscores["SPO2"] = 3
        elif 84 <= spo2 <= 85:
            subscores["SPO2"] = 2
        elif 86 <= spo2 <= 87:
            subscores["SPO2"] = 1
        elif 88 <= spo2 <= 92:
            subscores["SPO2"] = 0
        elif 93 <= spo2 <= 94:
            subscores["SPO2"] = 1
        elif 95 <= spo2 <= 96:
            subscores["SPO2"] = 2
        else:
            subscores["SPO2"] = 3

    # 3. Body Temperature (°C)
    if temp <= 35.0:
        subscores["TEMP"] = 3
    elif 35.1 <= temp <= 36.0:
        subscores["TEMP"] = 1
    elif 36.1 <= temp <= 38.0:
        subscores["TEMP"] = 0
    elif 38.1 <= temp <= 39.0:
        subscores["TEMP"] = 1
    else:  # >= 39.1
        subscores["TEMP"] = 2

    # 4. Heart Rate (beats/min)
    if hr <= 40:
        subscores["HR"] = 3
    elif 41 <= hr <= 50:
        subscores["HR"] = 1
    elif 51 <= hr <= 90:
        subscores["HR"] = 0
    elif 91 <= hr <= 110:
        subscores["HR"] = 1
    elif 111 <= hr <= 130:
        subscores["HR"] = 2
    else:  # >= 131
        subscores["HR"] = 3

    total_score = sum(subscores.values())
    extreme_single = any(s >= 3 for s in subscores.values())

    # Sort factors by subscore descending
    sorted_factors = sorted(subscores.items(), key=lambda x: x[1], reverse=True)
    top_factors = [f[0] for f in sorted_factors if f[1] > 0][:3]
    if not top_factors:
        top_factors = ["NORMAL"]

    # NEWS2 Clinical Risk Tiers:
    # 0-4: LOW
    # 5-6: MEDIUM
    # >=7: HIGH
    # Score >= 9 or extreme single + total >= 7: CRITICAL
    if total_score >= 9 or (total_score >= 7 and extreme_single):
        risk_class = "CRITICAL"
        priority = "P0"
    elif total_score >= 7 or (total_score >= 5 and extreme_single):
        risk_class = "HIGH"
        priority = "P1"
    elif total_score >= 4 or extreme_single:
        risk_class = "MED"
        priority = "P2"
    else:
        risk_class = "LOW"
        priority = "P2"

    # Normalized risk score 0 - 100
    # NEWS2 max is typically ~14 in real scenarios; cap at 100
    normalized_score = min(100, int((total_score / 14.0) * 100))

    return {
        "raw_news2": total_score,
        "score": normalized_score,
        "class": risk_class,
        "priority": priority,
        "subscores": subscores,
        "top_factors": top_factors,
        "extreme_single_score": extreme_single,
        "disclaimer": "Decision support, not a diagnosis"
    }


def check_disagreement(tinyml_score: int, tinyml_class: str, news2_res: Dict[str, Any], threshold: int = 25) -> Tuple[bool, str]:
    """
    Checks if TinyML prediction disagrees significantly with NEWS2 clinical baseline.
    Returns (disagreement_flag, rationale).
    """
    news2_score = news2_res["score"]
    diff = abs(tinyml_score - news2_score)
    
    # Priority mismatch check
    class_order = {"LOW": 0, "MED": 1, "HIGH": 2, "CRITICAL": 3}
    class_diff = abs(class_order.get(tinyml_class, 0) - class_order.get(news2_res["class"], 0))
    
    if diff >= threshold or class_diff >= 2:
        reason = f"DIVERGENCE: TinyML={tinyml_score} ({tinyml_class}) vs NEWS2={news2_score} ({news2_res['class']}), diff={diff}"
        return True, reason
    return False, "CONGRUENT"
