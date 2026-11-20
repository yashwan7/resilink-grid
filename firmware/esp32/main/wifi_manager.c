/*
 * RESILINK GRID v4 — ESP32 Dual Wi-Fi Client Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "wifi_manager.h"
#include <string.h>

static wifi_status_t s_wifi_status = {
    .state = WIFI_STATE_PRIMARY_CONNECTED,
    .ip_address = "192.168.4.15",
    .rssi = -64,
    .consecutive_fails = 0
};

void wifi_manager_init(void) {
    /* Initialize Wi-Fi stack in Station mode */
}

void wifi_manager_tick(uint32_t now_ms) {
    (void)now_ms;
    /* Auto-failover logic between Primary AP and Backup AP */
    if (s_wifi_status.consecutive_fails >= 3) {
        if (s_wifi_status.state == WIFI_STATE_PRIMARY_CONNECTED) {
            s_wifi_status.state = WIFI_STATE_BACKUP_CONNECTED;
            strncpy(s_wifi_status.ip_address, "10.0.0.45", sizeof(s_wifi_status.ip_address) - 1);
            s_wifi_status.consecutive_fails = 0;
        } else if (s_wifi_status.state == WIFI_STATE_BACKUP_CONNECTED) {
            s_wifi_status.state = WIFI_STATE_ALL_FAILED;
        }
    }
}

const wifi_status_t* wifi_manager_get_status(void) {
    return &s_wifi_status;
}

bool wifi_manager_is_connected(void) {
    return (s_wifi_status.state == WIFI_STATE_PRIMARY_CONNECTED ||
            s_wifi_status.state == WIFI_STATE_BACKUP_CONNECTED);
}
