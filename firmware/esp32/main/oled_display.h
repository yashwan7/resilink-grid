/*
 * RESILINK GRID v4 — ESP32 OLED Display Header (SSD1306)
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef OLED_DISPLAY_H
#define OLED_DISPLAY_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

void oled_display_init(void);

void oled_display_render(
    const char *role_str,
    const char *ip_str,
    int8_t rssi,
    uint8_t p0_count,
    uint8_t p1_count,
    uint8_t p2_count,
    const char *route_str
);

#ifdef __cplusplus
}
#endif

#endif /* OLED_DISPLAY_H */
