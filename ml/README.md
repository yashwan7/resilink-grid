# RESILINK GRID v4 — Machine Learning & Edge TinyML Subsystem
**Owner:** Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)

---

## 1. Overview
The `/ml` module contains the training pipelines, feature engineering, clinical validation benchmarks, and quantization workflows for the two TinyML models deployed on the NXP FRDM-MCXN236 edge microcontroller:

1. **Clinical Risk Classifier (`risk_model_data.h`)**:
   - Evaluates real-time 1 Hz physiological measurements (HR, $\text{SpO}_2$, Temp, Resp) and 10-second rolling trend features (mean, slope).
   - Predicts clinical risk score ($0 - 100$), classification (`LOW`, `MED`, `HIGH`, `CRITICAL`), and identifies the top 3 contributing physiological factors.
   - Includes on-device fallback to **NEWS2 (National Early Warning Score 2)** and an **on-device disagreement detector**.
   - Quantized to symmetric INT8 with execution latency $< 1.0\text{ ms}$ on Cortex-M33 @ 150 MHz and static tensor arena $< 16\text{ KB}$.

2. **RF Link-State Classifier (`link_model_data.h`)**:
   - Assesses real-time physical and link layer metrics (RSSI, Packet Delivery Ratio, Retry count, Round-Trip Time, Buffer Queue Depth, Jitter).
   - Classifies link condition into `HEALTHY`, `DEGRADING`, and `CRITICAL`.
   - Drives the deterministic route manager with hysteresis damping (3 windows for Critical, 5 windows for Degrading, 60s minimum dwell time).

---

## 2. Evaluation Metrics & Confusion Matrix

### 2.1 Clinical Risk Model Performance
- **Overall Accuracy:** `98.69%`
- **Critical (P0) Sensitivity / Recall:** `99.52%` (High sensitivity ensures that life-threatening conditions are virtually never missed)
- **Critical Specificity:** `98.30%`

#### Confusion Matrix (Test Set: $N = 3,750$ windows)
| Ground Truth | Predicted LOW | Predicted MED | Predicted HIGH | Predicted CRITICAL |
|---|---|---|---|---|
| **LOW** | 751 | 0 | 0 | 0 |
| **MED** | 0 | 60 | 10 | 7 |
| **HIGH** | 0 | 3 | 625 | 18 |
| **CRITICAL** | 0 | 1 | 10 | 2,265 |

---

## 3. Honest Limitations & Regulatory Disclaimers
1. **Synthetic Training Baseline:**
   - The training and validation datasets are synthetically generated using autoregressive physiological models parameterized by published clinical distributions (MIMIC-III / PhysioNet).
   - **This model is a research prototype, not a certified medical device.** It has not undergone prospective clinical trials or FDA / CE-MDR clearance.
2. **Mandatory UI Disclaimer:**
   - The line `"Decision support, not a diagnosis"` **MUST** be rendered alongside any risk score, class, or Groot output in the dashboard and patient application.
3. **Deterministic Fail-Safe (NEWS2 Fallback):**
   - If the TinyML prediction diverges from the deterministic NEWS2 score by $> 25$ points or $> 1$ priority tier, the on-board firmware sets the `DISAGREEMENT_FLAG` in the packet header and warns clinicians.

---

## 4. How to Retrain and Export

```bash
# Run data synthesis and train both models:
python3 train_risk_model.py
python3 train_link_model.py

# Headers are automatically exported to:
# - /ml/risk_model_data.h
# - /ml/link_model_data.h
# - /firmware/mcxn236/include/risk_model_data.h
# - /firmware/mcxn236/include/link_model_data.h
```
