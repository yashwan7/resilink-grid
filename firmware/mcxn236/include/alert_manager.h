/*
 * RESILINK GRID v4 — Alert Manager & Failsafe Relay Interface
 * Immediate offline buzzer, distinct auditory patterns, ACK button, relay trip
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    BUZZER_SILENT   = 0,
    BUZZER_HIGH     = 1, /* 500ms ON / 500ms OFF */
    BUZZER_CRITICAL = 2  /* 200ms ON / 100ms OFF urgent warble */
} buzzer_pattern_t;

typedef struct {
    risk_class_t     active_class;
    buzzer_pattern_t active_pattern;
    bool             acknowledged;
    uint32_t         alert_start_time_ms;
    uint32_t         ack_time_ms;
    bool             relay_energized;    /* Fail-safe: false = safe de-energized trip */
    bool             buzzer_state;       /* Current physical pin state */
    uint32_t         last_toggle_time_ms;
} alert_manager_t;

void alert_manager_init(alert_manager_t *mgr);
void alert_manager_update(alert_manager_t *mgr, risk_class_t new_class, uint32_t now_ms);
void alert_manager_button_press(alert_manager_t *mgr, uint32_t now_ms);
void alert_manager_tick(alert_manager_t *mgr, uint32_t now_ms);

#ifdef __cplusplus
}
#endif

#endif /* ALERT_MANAGER_H */
