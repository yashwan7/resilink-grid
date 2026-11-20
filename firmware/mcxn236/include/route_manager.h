/*
 * RESILINK GRID v4 — Route Manager & Link-State AI Interface
 * Multi-route failover, dwell damping, transition limits, SOS flood
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef ROUTE_MANAGER_H
#define ROUTE_MANAGER_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float   rssi;           /* dBm */
    float   pdr;            /* 0 - 100% */
    uint8_t retries;        /* count */
    float   rtt_ms;         /* ms */
    uint8_t queue_depth;    /* packets in queue */
    float   jitter_ms;      /* ms */
} link_telemetry_t;

typedef struct {
    network_route_t  current_route;
    link_state_t     current_link_state;
    uint32_t         last_transition_time_ms;
    uint32_t         route_enter_time_ms;
    uint8_t          critical_windows_count;
    uint8_t          degrading_windows_count;
    uint8_t          rapid_transition_count;
    bool             sos_flood_active;
} route_manager_t;

/* Audit record emitted on every route transition */
typedef struct {
    uint32_t        timestamp;
    network_route_t previous_route;
    network_route_t new_route;
    link_state_t    triggering_state;
    char            reason[64];
} route_change_audit_t;

void route_manager_init(route_manager_t *mgr);

/* Evaluates link AI and runs stability arbitration rules */
bool route_manager_evaluate(
    route_manager_t *mgr,
    const link_telemetry_t *telemetry,
    uint32_t now_ms,
    priority_t active_priority,
    route_change_audit_t *out_audit
);

const char* route_manager_get_route_name(network_route_t route);
const char* route_manager_get_state_name(link_state_t state);

#ifdef __cplusplus
}
#endif

#endif /* ROUTE_MANAGER_H */
