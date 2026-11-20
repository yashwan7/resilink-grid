/*
 * RESILINK GRID v4 — Alert Manager & Failsafe Relay Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "alert_manager.h"
#include <string.h>

void alert_manager_init(alert_manager_t *mgr) {
    if (!mgr) return;
    memset(mgr, 0, sizeof(alert_manager_t));
    mgr->active_class = RISK_CLASS_LOW;
    mgr->active_pattern = BUZZER_SILENT;
    mgr->acknowledged = true;
    mgr->relay_energized = true; /* Normal energized */
    mgr->buzzer_state = false;
}

void alert_manager_update(alert_manager_t *mgr, risk_class_t new_class, uint32_t now_ms) {
    if (!mgr) return;

    if (new_class != mgr->active_class) {
        mgr->active_class = new_class;

        if (new_class == RISK_CLASS_CRITICAL) {
            mgr->active_pattern = BUZZER_CRITICAL;
            mgr->acknowledged = false;
            mgr->alert_start_time_ms = now_ms;
            mgr->relay_energized = false; /* Trip relay to trigger external nurse-call */
        } else if (new_class == RISK_CLASS_HIGH) {
            mgr->active_pattern = BUZZER_HIGH;
            mgr->acknowledged = false;
            mgr->alert_start_time_ms = now_ms;
            mgr->relay_energized = true;
        } else {
            mgr->active_pattern = BUZZER_SILENT;
            mgr->acknowledged = true;
            mgr->buzzer_state = false;
            mgr->relay_energized = true;
        }
    } else if (!mgr->acknowledged) {
        /* Check re-alert timeout if un-acknowledged */
        if (now_ms - mgr->alert_start_time_ms > RESILINK_ALERT_REALERT_MS) {
            /* Force buzzer back on with maximum urgency */
            mgr->active_pattern = BUZZER_CRITICAL;
            mgr->relay_energized = false;
        }
    }
}

void alert_manager_button_press(alert_manager_t *mgr, uint32_t now_ms) {
    if (!mgr) return;
    /* Silence active buzzer pattern upon user ACK button press */
    mgr->acknowledged = true;
    mgr->ack_time_ms = now_ms;
    mgr->buzzer_state = false;
}

void alert_manager_tick(alert_manager_t *mgr, uint32_t now_ms) {
    if (!mgr) return;

    if (mgr->acknowledged || mgr->active_pattern == BUZZER_SILENT) {
        mgr->buzzer_state = false;
        return;
    }

    uint32_t period = (mgr->active_pattern == BUZZER_CRITICAL) ? 300 : 1000;
    uint32_t on_time = (mgr->active_pattern == BUZZER_CRITICAL) ? 200 : 500;

    uint32_t phase = (now_ms - mgr->alert_start_time_ms) % period;
    mgr->buzzer_state = (phase < on_time);
}
