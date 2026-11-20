/*
 * RESILINK GRID v4 — Vitals Sensor Interface & Multi-Scenario Simulator
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef VITALS_SENSOR_H
#define VITALS_SENSOR_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    SIM_SCENARIO_NORMAL       = 0,
    SIM_SCENARIO_TACHYCARDIA  = 1,
    SIM_SCENARIO_HYPOXIA      = 2,
    SIM_SCENARIO_SEPSIS       = 3,
    SIM_SCENARIO_SHOCK        = 4,
    SIM_SCENARIO_COUNT        = 5
} sim_scenario_t;

typedef struct {
    bool           physical_sensor_present;
    sim_scenario_t current_scenario;
    uint32_t       sample_count;
    float          last_hr;
    float          last_spo2;
    float          last_temp;
    float          last_resp;
} sensor_manager_t;

void vitals_sensor_init(sensor_manager_t *mgr, bool force_simulation);
bool vitals_sensor_sample(sensor_manager_t *mgr, uint32_t timestamp, vitals_sample_t *out_sample);
void vitals_sensor_next_scenario(sensor_manager_t *mgr);
void vitals_sensor_set_scenario(sensor_manager_t *mgr, sim_scenario_t scenario);
const char* vitals_sensor_get_scenario_name(sim_scenario_t scenario);

#ifdef __cplusplus
}
#endif

#endif /* VITALS_SENSOR_H */
