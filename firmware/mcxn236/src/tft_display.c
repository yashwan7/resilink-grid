/*
 * RESILINK GRID v4 — 2.8" SPI TFT Display Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "tft_display.h"
#include <string.h>

void tft_display_init(tft_display_t *disp) {
    if (!disp) return;
    memset(disp, 0, sizeof(tft_display_t));
}

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
) {
    (void)risk_score;
    (void)risk_class;
    (void)link_state;
    (void)current_route;
    (void)gps;
    (void)epoch_id;
    (void)disagreement_flag;

    if (!disp || !sample) return;

    /* Push sample into 60s rolling sparkline buffer */
    disp->hr_sparkline[disp->sparkline_idx] = sample->hr;
    disp->spo2_sparkline[disp->sparkline_idx] = sample->spo2;
    disp->sparkline_idx = (disp->sparkline_idx + 1) % RESILINK_SPARKLINE_HISTORY_LEN;
    if (disp->sparkline_count < RESILINK_SPARKLINE_HISTORY_LEN) {
        disp->sparkline_count++;
    }
}
