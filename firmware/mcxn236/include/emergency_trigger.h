/*
 * RESILINK GRID v4 — Emergency Trigger Engine & NMEA GPS Parser
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef EMERGENCY_TRIGGER_H
#define EMERGENCY_TRIGGER_H

#include "resilink_types.h"
#include "resilink_crypto.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    gps_telemetry_t current_gps;
    bool            patient_consent_granted;
    uint32_t        last_trigger_timestamp;
    bool            trigger_active;
} emergency_engine_t;

void emergency_engine_init(emergency_engine_t *engine, bool initial_consent);
void emergency_engine_feed_nmea(emergency_engine_t *engine, const char *nmea_sentence, uint32_t now_s);
void emergency_engine_set_consent(emergency_engine_t *engine, bool consent);

/* Build minimal signed plaintext Emergency JSON payload */
int emergency_engine_build_trigger(
    emergency_engine_t *engine,
    const crypto_state_t *crypto,
    uint8_t risk_score,
    uint8_t need_mask,
    uint32_t now_s,
    char *out_json,
    size_t max_json_len,
    uint8_t sig_out[RESILINK_ECDSA_SIG_SIZE]
);

#ifdef __cplusplus
}
#endif

#endif /* EMERGENCY_TRIGGER_H */
