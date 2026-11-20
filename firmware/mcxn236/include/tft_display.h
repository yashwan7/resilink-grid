/*
 * RESILINK GRID v4 — 2.8" SPI TFT Display Interface
 * Real-time 1 Hz render: numbers, 60s sparkline, risk badge, link state, GPS, epoch
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef TFT_DISPLAY_H
#define TFT_DISPLAY_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float    hr_sparkline[RESILINK_SPARKLINE_HISTORY_LEN];
    float    spo2_sparkline[RESILINK_SPARKLINE_HISTORY_LEN];
    uint8_t  sparkline_idx;
    uint8_t  sparkline_count;
    uint32_t last_render_ms;
} tft_display_t;

void tft_display_init(tft_display_t *disp);

void tft_display_update(
    tft_display_t *disp,
    const vitals_sample_t *sample,
    uint8_t risk_score,
    risk_class_t risk_class,
    link_state_t link_state,
    network_route_t current_route,
    const gps_telemetry_t *gps,
    uint32_t epoch_id,
    bool disagreement_flag
);

#ifdef __cplusplus
}
#endif

#endif /* TFT_DISPLAY_H */
