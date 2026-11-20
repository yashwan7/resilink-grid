/*
 * RESILINK GRID v4 — Local UART Stream Interface (Localhost Only)
 * Streams unencrypted 1 Hz JSON telemetry strictly to local web view
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef LOCAL_UART_STREAM_H
#define LOCAL_UART_STREAM_H

#include "resilink_types.h"
#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

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
);

#ifdef __cplusplus
}
#endif

#endif /* LOCAL_UART_STREAM_H */
