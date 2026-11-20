/*
 * RESILINK GRID v4 — NXP FRDM-MCXN236 Main Firmware Entry Point
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 * Principle: AI predicts, rules decide, logs prove.
 */

#include "resilink_config.h"
#include "resilink_types.h"
#include "resilink_crypto.h"
#include "vitals_sensor.h"
#include "risk_engine.h"
#include "delta_snapshot.h"
#include "alert_manager.h"
#include "emergency_trigger.h"
#include "route_manager.h"
#include "tft_display.h"
#include "local_uart_stream.h"
#include <stdio.h>
#include <string.h>

/* Global Subsystem Handles */
static crypto_state_t         s_crypto;
static sensor_manager_t       s_sensor_mgr;
static vitals_history_t       s_vitals_hist;
static snapshot_session_t     s_snapshot_sess;
static snapshot_ring_buffer_t s_snapshot_ring;
static alert_manager_t        s_alert_mgr;
static emergency_engine_t     s_emergency_engine;
static route_manager_t        s_route_mgr;
static tft_display_t          s_display;

/* High-Speed UART TX Buffer to ESP32 */
static uint8_t s_wire_tx_buf[1024];

void app_init(void) {
    printf("[RESILINK MCXN236] Booting RESILINK GRID v4 Firmware...\n");

    /* 1. Cryptographic Initialization */
    resilink_crypto_init(&s_crypto, RESILINK_NODE_ID);
    printf("  [CRYPTO] Node ID: 0x%08X, Epoch: #%u, Nonce Counter: %u\n",
           s_crypto.node_id, s_crypto.epoch_id, s_crypto.counter);

    /* 2. Sensor & Simulator Initialization */
    vitals_sensor_init(&s_sensor_mgr, true /* default simulated until MAX30102 detected */);
    printf("  [SENSORS] Initialized. Initial Scenario: %s\n",
           vitals_sensor_get_scenario_name(s_sensor_mgr.current_scenario));

    /* 3. Risk Engine */
    risk_engine_init(&s_vitals_hist);

    /* 4. Delta Snapshot Engine */
    delta_snapshot_init(&s_snapshot_sess, &s_snapshot_ring);

    /* 5. Alert Manager */
    alert_manager_init(&s_alert_mgr);

    /* 6. Emergency Engine */
    emergency_engine_init(&s_emergency_engine, true /* Patient Consent Granted */);

    /* 7. Route Manager */
    route_manager_init(&s_route_mgr);

    /* 8. TFT Display */
    tft_display_init(&s_display);

    printf("[RESILINK MCXN236] System Initialization Complete. Starting 1 Hz loop.\n\n");
}

/* Executes once every 1000 ms */
void app_tick_1hz(uint32_t now_ms) {
    uint32_t now_s = now_ms / 1000;

    /* 1. Acquire Vitals */
    vitals_sample_t sample;
    vitals_sensor_sample(&s_sensor_mgr, now_s, &sample);

    /* 2. Run TinyML Risk Inference + NEWS2 Fallback */
    risk_assessment_t assessment;
    risk_engine_evaluate(&s_vitals_hist, &sample, &assessment);

    /* 3. Update Alert Manager (Buzzer warble on HIGH/CRITICAL + Relay Trip) */
    alert_manager_update(&s_alert_mgr, assessment.tinyml_class, now_ms);
    alert_manager_tick(&s_alert_mgr, now_ms);

    /* 4. Ingest Vitals into Delta Snapshot Engine */
    uint8_t payload[256];
    size_t payload_len = 0;
    msg_type_t msg_type = MSG_TYPE_HEARTBEAT;

    delta_snapshot_ingest(
        &s_snapshot_sess,
        &s_snapshot_ring,
        &sample,
        assessment.tinyml_score,
        assessment.tinyml_class,
        assessment.top_factors,
        payload,
        &payload_len,
        &msg_type
    );

    /* 5. Emergency Trigger Check (On CRITICAL and Patient Consent) */
    if (assessment.tinyml_class == RISK_CLASS_CRITICAL && s_emergency_engine.patient_consent_granted) {
        char trigger_json[256];
        uint8_t trigger_sig[RESILINK_ECDSA_SIG_SIZE];
        int rc = emergency_engine_build_trigger(
            &s_emergency_engine,
            &s_crypto,
            assessment.tinyml_score,
            0x03 /* ICU + O2 */,
            now_s,
            trigger_json,
            sizeof(trigger_json),
            trigger_sig
        );
        if (rc > 0) {
            /* Dispatch emergency trigger over ALL routes (SOS flood override) */
        }
    }

    /* 6. Evaluate RF Link AI & Route Arbitration */
    link_telemetry_t link_telem = {
        .rssi = -62.0f,
        .pdr = 98.5f,
        .retries = 0,
        .rtt_ms = 22.0f,
        .queue_depth = 1,
        .jitter_ms = 3.5f
    };
    route_change_audit_t audit;
    bool route_changed = route_manager_evaluate(&s_route_mgr, &link_telem, now_ms, assessment.derived_priority, &audit);
    if (route_changed) {
        printf("  [ROUTE CHANGE AUDIT] %s -> %s (Reason: %s)\n",
               route_manager_get_route_name(audit.previous_route),
               route_manager_get_route_name(audit.new_route),
               audit.reason);
    }

    /* 7. Format 1 Hz Localhost JSON Telemetry */
    char local_json[384];
    local_uart_stream_format(
        &sample,
        assessment.tinyml_score,
        assessment.tinyml_class,
        s_route_mgr.current_link_state,
        s_route_mgr.current_route,
        &s_emergency_engine.current_gps,
        s_crypto.epoch_id,
        local_json,
        sizeof(local_json)
    );

    /* 8. Render to 2.8" SPI TFT Display */
    tft_display_update(
        &s_display,
        &sample,
        assessment.tinyml_score,
        assessment.tinyml_class,
        s_route_mgr.current_link_state,
        s_route_mgr.current_route,
        &s_emergency_engine.current_gps,
        s_crypto.epoch_id,
        assessment.disagreement_flag
    );

    /* 9. Construct Encrypted Wire Envelope for Dispatch to ESP32 Radio Bridge */
    s_crypto.counter++;
    aad_header_t aad;
    aad.magic = RESILINK_PROTOCOL_MAGIC;
    aad.version = RESILINK_PROTOCOL_VERSION;
    aad.msg_type = (uint8_t)msg_type;
    aad.node_id = s_crypto.node_id;
    aad.epoch_id = s_crypto.epoch_id;
    aad.seq = s_crypto.counter;
    aad.counter = s_crypto.counter;
    aad.priority = (uint8_t)assessment.derived_priority;
    aad.flags = (sample.simulated ? 0x01 : 0x00) |
                (s_emergency_engine.patient_consent_granted ? 0x02 : 0x00) |
                (assessment.disagreement_flag ? 0x04 : 0x00);
    aad.payload_len = (uint16_t)payload_len;

    /* Assemble into wire transmit buffer */
    memcpy(s_wire_tx_buf, &aad, sizeof(aad_header_t));
    if (payload_len > 0) {
        memcpy(s_wire_tx_buf + sizeof(aad_header_t), payload, payload_len);
    }

    /* Print Status Line */
    printf("[%04u s] HR: %4.1f | SpO2: %4.1f%% | Temp: %4.2f C | TinyML: %2u (%s) | NEWS2: %2u | Priority: P%u | Route: %s\n",
           now_s, sample.hr, sample.spo2, sample.temp,
           assessment.tinyml_score,
           (assessment.tinyml_class == RISK_CLASS_CRITICAL) ? "CRIT" : (assessment.tinyml_class == RISK_CLASS_HIGH ? "HIGH" : "NORM"),
           assessment.news2_score,
           aad.priority,
           route_manager_get_route_name(s_route_mgr.current_route));
}

int main(void) {
    app_init();

    /* Simulate 5 1-second cycles for host test harness */
    for (uint32_t t = 1; t <= 5; t++) {
        app_tick_1hz(t * 1000);
    }

    return 0;
}
