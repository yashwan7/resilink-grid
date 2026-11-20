/*
 * RESILINK GRID v4 — Local UART Stream Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "local_uart_stream.h"
#include <stdio.h>

static const char* s_risk_strings[] = {"LOW", "MED", "HIGH", "CRITICAL"};
static const char* s_route_strings[] = {"PORT_A_WIFI", "PORT_B_BACKUP", "MESH_NRF24", "SMS_FALLBACK"};
static const char* s_link_strings[] = {"HEALTHY", "DEGRADING", "CRITICAL", "UNSTABLE"};

int local_uart_stream_format(
    const vitals_sample_t *sample,
    uint8_t risk_score,
    risk_class_t risk_class,
    link_state_t link_state,
    network_route_t current_route,
    const gps_telemetry_t *gps,
    uint32_t epoch_id,
    char *out_buf,
    size_t max_buf_len
) {
    if (!sample || !out_buf) return -1;

    const char *r_str = (risk_class <= RISK_CLASS_CRITICAL) ? s_risk_strings[risk_class] : "UNKNOWN";
    const char *rt_str = (current_route <= ROUTE_SMS_FALLBACK) ? s_route_strings[current_route] : "UNKNOWN";
    const char *ls_str = (link_state <= LINK_STATE_UNSTABLE) ? s_link_strings[link_state] : "UNKNOWN";

    double lat = gps ? gps->latitude : 0.0;
    double lon = gps ? gps->longitude : 0.0;
    bool fix = gps ? gps->has_fix : false;
    uint32_t age = gps ? gps->fix_age_s : 9999;

    int written = snprintf(
        out_buf, max_buf_len,
        "{\"ts\":%u,\"hr\":%.1f,\"spo2\":%.1f,\"temp\":%.2f,\"resp\":%.1f,\"motion\":%.2f,\"sim\":%s,\"risk_score\":%u,\"risk_class\":\"%s\",\"route\":\"%s\",\"link_state\":\"%s\",\"gps\":{\"lat\":%.6f,\"lon\":%.6f,\"fix\":%s,\"age\":%u},\"epoch\":%u}\n",
        sample->timestamp,
        sample->hr,
        sample->spo2,
        sample->temp,
        sample->resp,
        sample->motion,
        sample->simulated ? "true" : "false",
        risk_score,
        r_str,
        rt_str,
        ls_str,
        lat,
        lon,
        fix ? "true" : "false",
        age,
        epoch_id
    );

    return written;
}
