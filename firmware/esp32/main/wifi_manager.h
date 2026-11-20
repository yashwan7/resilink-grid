/*
 * RESILINK GRID v4 — ESP32 Dual Wi-Fi Client Manager
 * Primary / Backup failover with link telemetry feedback
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    WIFI_STATE_DISCONNECTED = 0,
    WIFI_STATE_PRIMARY_CONNECTED = 1,
    WIFI_STATE_BACKUP_CONNECTED = 2,
    WIFI_STATE_ALL_FAILED = 3
} wifi_state_t;

typedef struct {
    wifi_state_t state;
    char         ip_address[16];
    int8_t       rssi;
    uint8_t      consecutive_fails;
} wifi_status_t;

void wifi_manager_init(void);
void wifi_manager_tick(uint32_t now_ms);
const wifi_status_t* wifi_manager_get_status(void);
bool wifi_manager_is_connected(void);

#ifdef __cplusplus
}
#endif

#endif /* WIFI_MANAGER_H */
