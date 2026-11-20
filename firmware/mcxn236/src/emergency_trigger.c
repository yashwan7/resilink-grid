/*
 * RESILINK GRID v4 — Emergency Trigger Engine Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "emergency_trigger.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void emergency_engine_init(emergency_engine_t *engine, bool initial_consent) {
    if (!engine) return;
    memset(engine, 0, sizeof(emergency_engine_t));
    engine->patient_consent_granted = initial_consent;
    /* Default last-known fallback position (e.g. Bangalore center for demo) */
    engine->current_gps.latitude = 12.971598;
    engine->current_gps.longitude = 77.594566;
    engine->current_gps.has_fix = false;
    engine->current_gps.fix_age_s = 9999;
}

void emergency_engine_set_consent(emergency_engine_t *engine, bool consent) {
    if (engine) {
        engine->patient_consent_granted = consent;
    }
}

/* Minimal parser for $GPRMC / $GNRMC NMEA sentence */
void emergency_engine_feed_nmea(emergency_engine_t *engine, const char *nmea, uint32_t now_s) {
    if (!engine || !nmea) return;

    if (strncmp(nmea, "$GPRMC", 6) == 0 || strncmp(nmea, "$GNRMC", 6) == 0) {
        /* Example: $GPRMC,123519,A,1258.2958,N,07735.6740,E,022.4,084.4,230324,003.1,W*6A */
        const char *p = nmea;
        char status = 'V';
        char lat_str[16] = {0}, lat_dir = 'N';
        char lon_str[16] = {0}, lon_dir = 'E';

        int field = 0;
        const char *token_start = p;

        while (*p) {
            if (*p == ',' || *p == '*') {
                size_t len = p - token_start;
                if (field == 2 && len > 0) status = *token_start;
                else if (field == 3 && len < 16) { strncpy(lat_str, token_start, len); lat_str[len] = 0; }
                else if (field == 4 && len > 0) lat_dir = *token_start;
                else if (field == 5 && len < 16) { strncpy(lon_str, token_start, len); lon_str[len] = 0; }
                else if (field == 6 && len > 0) lon_dir = *token_start;

                token_start = p + 1;
                field++;
            }
            p++;
        }

        if (status == 'A' && strlen(lat_str) > 0 && strlen(lon_str) > 0) {
            /* Convert DDMM.MMMM to decimal degrees */
            double raw_lat = atof(lat_str);
            double raw_lon = atof(lon_str);

            int lat_deg = (int)(raw_lat / 100);
            double lat_min = raw_lat - (lat_deg * 100);
            double dec_lat = lat_deg + (lat_min / 60.0);
            if (lat_dir == 'S') dec_lat = -dec_lat;

            int lon_deg = (int)(raw_lon / 100);
            double lon_min = raw_lon - (lon_deg * 100);
            double dec_lon = lon_deg + (lon_min / 60.0);
            if (lon_dir == 'W') dec_lon = -dec_lon;

            engine->current_gps.latitude = dec_lat;
            engine->current_gps.longitude = dec_lon;
            engine->current_gps.has_fix = true;
            engine->current_gps.fix_timestamp = now_s;
            engine->current_gps.fix_age_s = 0;
        }
    }
}

int emergency_engine_build_trigger(
    emergency_engine_t *engine,
    const crypto_state_t *crypto,
    uint8_t risk_score,
    uint8_t need_mask,
    uint32_t now_s,
    char *out_json,
    size_t max_json_len,
    uint8_t sig_out[RESILINK_ECDSA_SIG_SIZE]
) {
    if (!engine || !crypto || !out_json || !sig_out) return -1;
    if (!engine->patient_consent_granted) {
        return -2; /* Blocked: Patient consent required for off-board plaintext transmission */
    }

    uint32_t age = engine->current_gps.has_fix ? (now_s - engine->current_gps.fix_timestamp) : 9999;

    /* Build need list: ICU, O2, BLOOD, GENERAL */
    char need_buf[64] = "[";
    bool first = true;
    if (need_mask & 0x01) { strcat(need_buf, "\"ICU\""); first = false; }
    if (need_mask & 0x02) { if (!first) strcat(need_buf, ","); strcat(need_buf, "\"O2\""); first = false; }
    if (need_mask & 0x04) { if (!first) strcat(need_buf, ","); strcat(need_buf, "\"BLOOD\""); first = false; }
    if (need_mask & 0x08) { if (!first) strcat(need_buf, ","); strcat(need_buf, "\"GENERAL\""); first = false; }
    if (first) strcat(need_buf, "\"GENERAL\"");
    strcat(need_buf, "]");

    /* Minimal canonical JSON */
    int written = snprintf(
        out_json, max_json_len,
        "{\"pseudonym\":\"%s\",\"device_id\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,\"gps_fix\":%s,\"fix_age_s\":%u,\"ts\":%u,\"class\":\"P0\",\"score\":%u,\"need\":%s}",
        RESILINK_PATIENT_PSEUDONYM,
        RESILINK_DEVICE_NAME,
        engine->current_gps.latitude,
        engine->current_gps.longitude,
        engine->current_gps.has_fix ? "true" : "false",
        age,
        now_s,
        risk_score,
        need_buf
    );

    if (written <= 0 || (size_t)written >= max_json_len) {
        return -3;
    }

    /* Sign JSON with device ECDSA key */
    int sig_rc = resilink_crypto_sign_raw(crypto, (const uint8_t*)out_json, (size_t)written, sig_out);
    if (sig_rc != 0) return -4;

    engine->last_trigger_timestamp = now_s;
    engine->trigger_active = true;

    return written;
}
