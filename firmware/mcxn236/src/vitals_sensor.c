/*
 * RESILINK GRID v4 — Vitals Sensor & Seeded Simulator Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "vitals_sensor.h"
#include <string.h>
#include <math.h>

static const char* s_scenario_names[] = {
    "NORMAL",
    "TACHYCARDIA",
    "HYPOXIA",
    "SEPSIS",
    "SHOCK_COLLAPSE"
};

const char* vitals_sensor_get_scenario_name(sim_scenario_t scenario) {
    if (scenario < SIM_SCENARIO_COUNT) {
        return s_scenario_names[scenario];
    }
    return "UNKNOWN";
}

void vitals_sensor_init(sensor_manager_t *mgr, bool force_simulation) {
    if (!mgr) return;
    memset(mgr, 0, sizeof(sensor_manager_t));
    mgr->physical_sensor_present = !force_simulation;
    mgr->current_scenario = SIM_SCENARIO_NORMAL;
    mgr->last_hr = 72.0f;
    mgr->last_spo2 = 98.4f;
    mgr->last_temp = 36.8f;
    mgr->last_resp = 14.0f;
}

void vitals_sensor_next_scenario(sensor_manager_t *mgr) {
    if (!mgr) return;
    mgr->current_scenario = (sim_scenario_t)((mgr->current_scenario + 1) % SIM_SCENARIO_COUNT);
}

void vitals_sensor_set_scenario(sensor_manager_t *mgr, sim_scenario_t scenario) {
    if (!mgr) return;
    if (scenario < SIM_SCENARIO_COUNT) {
        mgr->current_scenario = scenario;
    }
}

/* Pseudo-random gaussian approximation using Box-Muller or linear congruence */
static float fast_noise(uint32_t step, float scale) {
    uint32_t h = step * 1664525u + 1013904223u;
    float norm = ((float)(h & 0xFFFF) / 65535.0f) * 2.0f - 1.0f;
    return norm * scale;
}

bool vitals_sensor_sample(sensor_manager_t *mgr, uint32_t timestamp, vitals_sample_t *out_sample) {
    if (!mgr || !out_sample) return false;

    mgr->sample_count++;
    uint32_t s = mgr->sample_count;

    float target_hr, target_spo2, target_temp, target_resp;

    switch (mgr->current_scenario) {
        case SIM_SCENARIO_NORMAL:
            target_hr = 72.0f + fast_noise(s, 2.0f);
            target_spo2 = 98.2f + fast_noise(s + 1, 0.4f);
            target_temp = 36.8f + fast_noise(s + 2, 0.1f);
            target_resp = 14.0f + fast_noise(s + 3, 0.8f);
            break;

        case SIM_SCENARIO_TACHYCARDIA:
            target_hr = 142.0f + fast_noise(s, 5.0f);
            target_spo2 = 95.0f + fast_noise(s + 1, 0.8f);
            target_temp = 37.2f + fast_noise(s + 2, 0.15f);
            target_resp = 22.0f + fast_noise(s + 3, 1.2f);
            break;

        case SIM_SCENARIO_HYPOXIA:
            target_hr = 118.0f + fast_noise(s, 4.0f);
            target_spo2 = 82.5f + fast_noise(s + 1, 1.5f);
            target_temp = 37.0f + fast_noise(s + 2, 0.1f);
            target_resp = 30.0f + fast_noise(s + 3, 2.0f);
            break;

        case SIM_SCENARIO_SEPSIS:
            target_hr = 124.0f + fast_noise(s, 3.5f);
            target_spo2 = 91.5f + fast_noise(s + 1, 1.0f);
            target_temp = 39.5f + fast_noise(s + 2, 0.2f);
            target_resp = 26.0f + fast_noise(s + 3, 1.5f);
            break;

        case SIM_SCENARIO_SHOCK:
        default:
            target_hr = 36.0f + fast_noise(s, 2.0f);
            target_spo2 = 78.0f + fast_noise(s + 1, 2.5f);
            target_temp = 34.6f + fast_noise(s + 2, 0.3f);
            target_resp = 8.0f + fast_noise(s + 3, 1.0f);
            break;
    }

    /* Autoregressive exponential drift */
    mgr->last_hr = 0.85f * mgr->last_hr + 0.15f * target_hr;
    mgr->last_spo2 = 0.85f * mgr->last_spo2 + 0.15f * target_spo2;
    mgr->last_temp = 0.85f * mgr->last_temp + 0.15f * target_temp;
    mgr->last_resp = 0.85f * mgr->last_resp + 0.15f * target_resp;

    if (mgr->last_spo2 > 100.0f) mgr->last_spo2 = 100.0f;
    if (mgr->last_spo2 < 50.0f) mgr->last_spo2 = 50.0f;

    out_sample->timestamp = timestamp;
    out_sample->hr = mgr->last_hr;
    out_sample->spo2 = mgr->last_spo2;
    out_sample->temp = mgr->last_temp;
    out_sample->resp = mgr->last_resp;
    out_sample->motion = 0.02f;
    out_sample->simulated = !mgr->physical_sensor_present;

    return true;
}
