/*
 * RESILINK GRID v4 — Risk Engine Interface (TinyML + NEWS2 Rule Fallback)
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef RISK_ENGINE_H
#define RISK_ENGINE_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define RISK_HISTORY_DEPTH 10

typedef struct {
    float hr_hist[RISK_HISTORY_DEPTH];
    float spo2_hist[RISK_HISTORY_DEPTH];
    float temp_hist[RISK_HISTORY_DEPTH];
    float resp_hist[RISK_HISTORY_DEPTH];
    uint8_t count;
    uint8_t head;
} vitals_history_t;

typedef struct {
    uint8_t      tinyml_score;          /* 0 - 100 */
    risk_class_t tinyml_class;          /* LOW, MED, HIGH, CRITICAL */
    uint8_t      news2_score;           /* 0 - 20 normalized to 0 - 100 */
    risk_class_t news2_class;
    priority_t   derived_priority;      /* P0, P1, P2 */
    uint8_t      top_factors[3];        /* 1: HR, 2: SPO2, 3: TEMP, 4: RESP */
    bool         disagreement_flag;     /* True if TinyML and NEWS2 diverge */
    uint32_t     latency_us;            /* Measured inference latency */
} risk_assessment_t;

void risk_engine_init(vitals_history_t *hist);
void risk_engine_push_sample(vitals_history_t *hist, const vitals_sample_t *sample);
bool risk_engine_evaluate(
    vitals_history_t *hist,
    const vitals_sample_t *current,
    risk_assessment_t *out_assessment
);

/* Direct NEWS2 calculation */
uint8_t compute_news2_raw(float hr, float spo2, float temp, float resp);

#ifdef __cplusplus
}
#endif

#endif /* RISK_ENGINE_H */
