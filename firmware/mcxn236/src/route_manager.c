/*
 * RESILINK GRID v4 — Route Manager & Link-State AI Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "route_manager.h"
#include "link_model_data.h"
#include <string.h>
#include <stdio.h>

static const char* s_route_names[] = {
    "PORT_A_WIFI",
    "PORT_B_BACKUP_WIFI",
    "MESH_NRF24",
    "SMS_FALLBACK"
};

static const char* s_state_names[] = {
    "HEALTHY",
    "DEGRADING",
    "CRITICAL",
    "UNSTABLE"
};

const char* route_manager_get_route_name(network_route_t route) {
    if (route <= ROUTE_SMS_FALLBACK) return s_route_names[route];
    return "UNKNOWN";
}

const char* route_manager_get_state_name(link_state_t state) {
    if (state <= LINK_STATE_UNSTABLE) return s_state_names[state];
    return "UNKNOWN";
}

void route_manager_init(route_manager_t *mgr) {
    if (!mgr) return;
    memset(mgr, 0, sizeof(route_manager_t));
    mgr->current_route = ROUTE_PORT_A_WIFI;
    mgr->current_link_state = LINK_STATE_HEALTHY;
}

static link_state_t evaluate_link_tinyml(const link_telemetry_t *t) {
    float raw[LINK_MODEL_NUM_INPUTS] = {
        t->rssi, t->pdr, (float)t->retries, t->rtt_ms, (float)t->queue_depth, t->jitter_ms
    };

    float norm[LINK_MODEL_NUM_INPUTS];
    for (int i = 0; i < LINK_MODEL_NUM_INPUTS; i++) {
        norm[i] = (raw[i] - LINK_FEATURE_MEANS[i]) / LINK_FEATURE_STDS[i];
    }

    /* Dense 6 -> 12 (ReLU) */
    float l1[LINK_MODEL_L1_NODES];
    for (int j = 0; j < LINK_MODEL_L1_NODES; j++) {
        float sum = (float)LINK_BIAS_L1[j] * LINK_SCALE_L1;
        for (int i = 0; i < LINK_MODEL_NUM_INPUTS; i++) {
            sum += norm[i] * ((float)LINK_WEIGHTS_L1[i][j] * LINK_SCALE_L1);
        }
        l1[j] = (sum > 0.0f) ? sum : 0.0f;
    }

    /* Output 12 -> 3 */
    float max_s = -1e9f;
    int best = 0;
    for (int j = 0; j < LINK_MODEL_NUM_CLASSES; j++) {
        float sum = (float)LINK_BIAS_OUT[j] * LINK_SCALE_OUT;
        for (int i = 0; i < LINK_MODEL_L1_NODES; i++) {
            sum += l1[i] * ((float)LINK_WEIGHTS_OUT[i][j] * LINK_SCALE_OUT);
        }
        if (sum > max_s) {
            max_s = sum;
            best = j;
        }
    }

    return (link_state_t)best;
}

bool route_manager_evaluate(
    route_manager_t *mgr,
    const link_telemetry_t *telemetry,
    uint32_t now_ms,
    priority_t active_priority,
    route_change_audit_t *out_audit
) {
    if (!mgr || !telemetry) return false;

    /* 1. Evaluate Link AI */
    link_state_t predicted = evaluate_link_tinyml(telemetry);

    /* Check rapid oscillation / instability rule */
    if (predicted == LINK_STATE_CRITICAL) {
        mgr->critical_windows_count++;
        mgr->degrading_windows_count = 0;
    } else if (predicted == LINK_STATE_DEGRADING) {
        mgr->degrading_windows_count++;
        mgr->critical_windows_count = 0;
    } else {
        mgr->critical_windows_count = 0;
        mgr->degrading_windows_count = 0;
    }

    mgr->current_link_state = predicted;

    /* 2. SOS Flood Override (P0 sends on ALL routes) */
    if (active_priority == PRIORITY_P0) {
        mgr->sos_flood_active = true;
    } else {
        mgr->sos_flood_active = false;
    }

    /* 3. Transition Rate Limiting: Max 1 transition per 30 seconds */
    if (now_ms - mgr->last_transition_time_ms < RESILINK_ROUTE_MIN_PERIOD_MS) {
        return false; /* Suppressed by rate limit */
    }

    network_route_t prev_route = mgr->current_route;
    network_route_t new_route = prev_route;
    char reason[64] = {0};

    /* 4. Escalation Damping Rules */
    if (mgr->critical_windows_count >= RESILINK_CRITICAL_ESCALATE_WIN) {
        /* Critical link requires immediate failover to next tier */
        if (prev_route == ROUTE_PORT_A_WIFI) {
            new_route = ROUTE_PORT_B_BACKUP;
            snprintf(reason, sizeof(reason), "Critical Link AI: Primary Wi-Fi down 3 windows");
        } else if (prev_route == ROUTE_PORT_B_BACKUP) {
            new_route = ROUTE_MESH_NRF24;
            snprintf(reason, sizeof(reason), "Critical Link AI: Backup Wi-Fi down, switching to nRF24 Mesh");
        } else if (prev_route == ROUTE_MESH_NRF24) {
            new_route = ROUTE_SMS_FALLBACK;
            snprintf(reason, sizeof(reason), "Critical Link AI: Mesh unreachable, activating SMS fallback");
        }
    } else if (mgr->degrading_windows_count >= RESILINK_DEGRADING_ESCALATE_WIN) {
        /* Degrading link escalates only after 5 consecutive windows */
        if (prev_route == ROUTE_PORT_A_WIFI) {
            new_route = ROUTE_PORT_B_BACKUP;
            snprintf(reason, sizeof(reason), "Degrading Link AI: Sustained packet loss on Port A");
        } else if (prev_route == ROUTE_PORT_B_BACKUP) {
            new_route = ROUTE_MESH_NRF24;
            snprintf(reason, sizeof(reason), "Degrading Link AI: Sustained packet loss on Port B");
        }
    } else if (predicted == LINK_STATE_HEALTHY && prev_route != ROUTE_PORT_A_WIFI) {
        /* Recovery check: Must satisfy minimum dwell time (60 seconds) before restoring primary */
        if (now_ms - mgr->route_enter_time_ms >= RESILINK_ROUTE_MIN_DWELL_MS) {
            new_route = ROUTE_PORT_A_WIFI;
            snprintf(reason, sizeof(reason), "Healthy Link AI: Primary route restored after 60s dwell");
        }
    }

    /* 5. Apply Transition if changed */
    if (new_route != prev_route) {
        mgr->current_route = new_route;
        mgr->last_transition_time_ms = now_ms;
        mgr->route_enter_time_ms = now_ms;
        mgr->critical_windows_count = 0;
        mgr->degrading_windows_count = 0;

        if (out_audit) {
            out_audit->timestamp = now_ms / 1000;
            out_audit->previous_route = prev_route;
            out_audit->new_route = new_route;
            out_audit->triggering_state = predicted;
            strncpy(out_audit->reason, reason, sizeof(out_audit->reason) - 1);
        }
        return true;
    }

    return false;
}
