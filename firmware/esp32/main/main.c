/*
 * RESILINK GRID v4 — ESP32 Radio Bridge Firmware Entry Point
 * Dual Role: Node A (Sender attached to NXP MCXN236) / Node B (Hub Gateway attached to Hub)
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "uart_bridge.h"
#include "priority_queue.h"
#include "wifi_manager.h"
#include "oled_display.h"
#include <stdio.h>
#include <string.h>

#define NODE_ROLE_SENDER 1  /* 1 for Node A (Sender), 0 for Node B (Hub Gateway) */

static priority_manager_t s_priority_mgr;

static void on_uart_packet_received(const uint8_t *payload, size_t len) {
    if (len < 26) return; /* Invalid AAD */

    /* Extract priority byte (Offset 20 in AAD) */
    uint8_t priority = payload[20];
    if (priority > 2) priority = 2;

    priority_queue_push(&s_priority_mgr, payload, len, priority, 1000);
}

void app_main(void) {
    printf("[RESILINK ESP32] Initializing Radio Bridge Coprocessor...\n");

    uart_bridge_init();
    priority_queue_init(&s_priority_mgr);
    wifi_manager_init();
    oled_display_init();

#if NODE_ROLE_SENDER
    printf("  [ROLE] Configured as Node A (Sender Coprocessor for NXP MCXN236)\n");
#else
    printf("  [ROLE] Configured as Node B (Hub Gateway Receiver for Hub Server)\n");
#endif

    printf("[RESILINK ESP32] Initialization Complete. Running bridge scheduler.\n");
}
