"""
RESILINK GRID v4 — Synthetic Physiological & RF Link Dataset Generator
Generates realistic multi-scenario 1 Hz physiological time series and RF link telemetry
informed by clinical vitals dynamics (PhysioNet / MIMIC-style distributions).
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from news2_engine import calculate_news2


def generate_physiological_cohort(
    num_samples_per_scenario: int = 2500,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generates a realistic multi-scenario physiological dataset.
    Scenarios:
      0: Normal Baseline (Healthy)
      1: Tachycardia / Cardiac Arrhythmia
      2: Hypoxia / Respiratory Distress
      3: Sepsis / Systemic Inflammatory Response
      4: Acute Shock / Bradycardia Collapse
    """
    np.random.seed(seed)
    records = []

    scenarios = [
        # (Scenario_id, name, HR_mean, HR_std, SpO2_mean, SpO2_std, Temp_mean, Temp_std, Resp_mean, Resp_std)
        (0, "NORMAL", 72.0, 6.0, 98.2, 0.8, 36.8, 0.25, 14.5, 1.8),
        (1, "TACHYCARDIA", 138.0, 14.0, 95.5, 1.5, 37.1, 0.4, 21.0, 2.5),
        (2, "HYPOXIA", 112.0, 12.0, 83.5, 3.8, 37.0, 0.35, 29.0, 4.0),
        (3, "SEPSIS", 122.0, 10.0, 92.0, 2.2, 39.4, 0.6, 26.0, 3.2),
        (4, "SHOCK_COLLAPSE", 38.0, 4.5, 79.0, 5.0, 34.8, 0.8, 8.0, 2.0)
    ]

    for sc_id, sc_name, hr_m, hr_s, spo2_m, spo2_s, tmp_m, tmp_s, rsp_m, rsp_s in scenarios:
        # Generate correlated time series using autoregressive noise
        hr = np.zeros(num_samples_per_scenario)
        spo2 = np.zeros(num_samples_per_scenario)
        temp = np.zeros(num_samples_per_scenario)
        resp = np.zeros(num_samples_per_scenario)

        # Initial values
        hr[0] = np.random.normal(hr_m, hr_s)
        spo2[0] = np.clip(np.random.normal(spo2_m, spo2_s), 50.0, 100.0)
        temp[0] = np.random.normal(tmp_m, tmp_s)
        resp[0] = np.clip(np.random.normal(rsp_m, rsp_s), 4.0, 50.0)

        # Autoregressive AR(1) smoothing to create continuous realistic physiological drifts
        phi = 0.85
        for t in range(1, num_samples_per_scenario):
            hr[t] = phi * hr[t-1] + (1 - phi) * np.random.normal(hr_m, hr_s)
            spo2[t] = np.clip(phi * spo2[t-1] + (1 - phi) * np.random.normal(spo2_m, spo2_s), 50.0, 100.0)
            temp[t] = phi * temp[t-1] + (1 - phi) * np.random.normal(tmp_m, tmp_s)
            resp[t] = np.clip(phi * resp[t-1] + (1 - phi) * np.random.normal(rsp_m, rsp_s), 4.0, 55.0)

        # Extract features with 10s rolling window
        window_size = 10
        for i in range(num_samples_per_scenario):
            start_idx = max(0, i - window_size + 1)
            hr_win = hr[start_idx:i+1]
            spo2_win = spo2[start_idx:i+1]
            temp_win = temp[start_idx:i+1]
            resp_win = resp[start_idx:i+1]

            cur_hr = float(hr[i])
            cur_spo2 = float(spo2[i])
            cur_temp = float(temp[i])
            cur_resp = float(resp[i])

            # Slopes
            if len(hr_win) > 1:
                hr_slope = float((hr_win[-1] - hr_win[0]) / len(hr_win))
                spo2_slope = float((spo2_win[-1] - spo2_win[0]) / len(spo2_win))
                temp_slope = float((temp_win[-1] - temp_win[0]) / len(temp_win))
                resp_slope = float((resp_win[-1] - resp_win[0]) / len(resp_win))
            else:
                hr_slope = 0.0
                spo2_slope = 0.0
                temp_slope = 0.0
                resp_slope = 0.0

            hr_mean = float(np.mean(hr_win))
            spo2_mean = float(np.mean(spo2_win))
            temp_mean = float(np.mean(temp_win))
            resp_mean = float(np.mean(resp_win))

            # Ground truth NEWS2 score
            n2 = calculate_news2(cur_hr, cur_spo2, cur_temp, cur_resp)
            news2_score = n2["score"]
            news2_class = n2["class"]
            
            # Map class to integer: 0: LOW, 1: MED, 2: HIGH, 3: CRITICAL
            class_map = {"LOW": 0, "MED": 1, "HIGH": 2, "CRITICAL": 3}
            class_idx = class_map[news2_class]

            records.append({
                "scenario": sc_name,
                "hr": round(cur_hr, 1),
                "spo2": round(cur_spo2, 1),
                "temp": round(cur_temp, 2),
                "resp": round(cur_resp, 1),
                "hr_mean10": round(hr_mean, 1),
                "spo2_mean10": round(spo2_mean, 1),
                "temp_mean10": round(temp_mean, 2),
                "resp_mean10": round(resp_mean, 1),
                "hr_slope10": round(hr_slope, 2),
                "spo2_slope10": round(spo2_slope, 2),
                "temp_slope10": round(temp_slope, 2),
                "resp_slope10": round(resp_slope, 2),
                "target_score": news2_score,
                "target_class": class_idx,
                "target_class_name": news2_class
            })

    return pd.DataFrame(records)


def generate_rf_link_dataset(
    num_samples: int = 5000,
    seed: int = 123
) -> pd.DataFrame:
    """
    Generates synthetic RF link quality measurements:
    Features: RSSI (dBm), PDR (%), Retries (count), RTT (ms), QueueDepth (pkts), Jitter (ms)
    Classes:
      0: HEALTHY
      1: DEGRADING
      2: CRITICAL
    """
    np.random.seed(seed)
    records = []
    
    # Split across classes
    n_per = num_samples // 3

    # 1. Healthy: Good signal, high PDR, low latency
    for _ in range(n_per):
        rssi = np.random.uniform(-65.0, -35.0)
        pdr = np.random.uniform(96.0, 100.0)
        retries = int(np.random.choice([0, 0, 0, 1, 2]))
        rtt = np.random.uniform(10.0, 45.0)
        q_depth = int(np.random.choice([0, 1, 2]))
        jitter = np.random.uniform(1.0, 8.0)
        records.append({
            "rssi": round(rssi, 1),
            "pdr": round(pdr, 1),
            "retries": retries,
            "rtt": round(rtt, 1),
            "queue_depth": q_depth,
            "jitter": round(jitter, 1),
            "link_class": 0,
            "link_class_name": "HEALTHY"
        })

    # 2. Degrading: Marginal signal, packet drops, retries climbing
    for _ in range(n_per):
        rssi = np.random.uniform(-82.0, -68.0)
        pdr = np.random.uniform(70.0, 94.0)
        retries = int(np.random.choice([2, 3, 4, 5]))
        rtt = np.random.uniform(60.0, 220.0)
        q_depth = int(np.random.choice([3, 4, 6, 8]))
        jitter = np.random.uniform(15.0, 65.0)
        records.append({
            "rssi": round(rssi, 1),
            "pdr": round(pdr, 1),
            "retries": retries,
            "rtt": round(rtt, 1),
            "queue_depth": q_depth,
            "jitter": round(jitter, 1),
            "link_class": 1,
            "link_class_name": "DEGRADING"
        })

    # 3. Critical: Severe fading, heavy loss, buffers full
    for _ in range(num_samples - 2 * n_per):
        rssi = np.random.uniform(-98.0, -83.0)
        pdr = np.random.uniform(10.0, 68.0)
        retries = int(np.random.choice([6, 7, 8, 10, 15]))
        rtt = np.random.uniform(250.0, 1200.0)
        q_depth = int(np.random.choice([10, 16, 24, 32]))
        jitter = np.random.uniform(80.0, 300.0)
        records.append({
            "rssi": round(rssi, 1),
            "pdr": round(pdr, 1),
            "retries": retries,
            "rtt": round(rtt, 1),
            "queue_depth": q_depth,
            "jitter": round(jitter, 1),
            "link_class": 2,
            "link_class_name": "CRITICAL"
        })

    return pd.DataFrame(records)


if __name__ == "__main__":
    df_physio = generate_physiological_cohort(1000)
    df_link = generate_rf_link_dataset(1000)
    print(f"Generated {len(df_physio)} physiological records across {df_physio['scenario'].nunique()} scenarios.")
    print(f"Generated {len(df_link)} RF link records across {df_link['link_class_name'].nunique()} classes.")
