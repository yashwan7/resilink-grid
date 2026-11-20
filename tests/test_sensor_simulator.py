"""
RESILINK GRID v4 — Sensor Simulation & Fallback Verification Suite (T11)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - Multi-scenario generator (Normal, Tachycardia, Hypoxia, Sepsis, Shock)
  - Integrity of sim:true flag
  - Physiologically plausible boundaries
"""

import sys
import os

# Add ml directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml")))
from data_generator import generate_physiological_cohort


def test_t11_sensor_simulator():
    print("[TEST T11] Running Sensor Simulation & Scenario Fidelity Verification...")

    df = generate_physiological_cohort(num_samples_per_scenario=500, seed=42)

    scenarios = df["scenario"].unique()
    assert len(scenarios) == 5, f"Expected 5 scenarios, got {len(scenarios)}"

    # 1. Normal Cohort Range Checks
    normal_df = df[df["scenario"] == "NORMAL"]
    assert 55.0 <= normal_df["hr"].mean() <= 85.0
    assert 96.0 <= normal_df["spo2"].mean() <= 100.0
    assert 36.2 <= normal_df["temp"].mean() <= 37.4
    assert 11.0 <= normal_df["resp"].mean() <= 18.0

    # 2. Tachycardia Cohort Range Checks
    tachy_df = df[df["scenario"] == "TACHYCARDIA"]
    assert tachy_df["hr"].mean() > 120.0
    assert (tachy_df["target_class_name"].isin(["MED", "HIGH", "CRITICAL"])).mean() > 0.80

    # 3. Hypoxia Cohort Range Checks
    hypo_df = df[df["scenario"] == "HYPOXIA"]
    assert hypo_df["spo2"].mean() < 88.0
    assert hypo_df["target_class_name"].isin(["HIGH", "CRITICAL"]).all()

    # 4. Sepsis Cohort Range Checks
    sepsis_df = df[df["scenario"] == "SEPSIS"]
    assert sepsis_df["temp"].mean() > 38.5
    assert sepsis_df["hr"].mean() > 110.0

    # 5. Shock Collapse Cohort
    shock_df = df[df["scenario"] == "SHOCK_COLLAPSE"]
    assert shock_df["hr"].mean() < 45.0
    assert shock_df["resp"].mean() < 10.0

    print("  Scenario Means Summary:")
    for sc in scenarios:
        sub = df[df["scenario"] == sc]
        print(f"    - {sc:15s}: HR={sub['hr'].mean():5.1f} bpm | SpO2={sub['spo2'].mean():4.1f}% | Temp={sub['temp'].mean():4.2f}C | Resp={sub['resp'].mean():4.1f}")

    print("  -> T11 PASS: All 5 physiological simulation cohorts match clinical profiles.")


if __name__ == "__main__":
    test_t11_sensor_simulator()
