/*
 * RESILINK GRID v4 — ESP32 High-Speed UART Bridge Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "uart_bridge.h"
#include <string.h>

static uart_stats_t s_stats = {0};

/* CRC-16-CCITT (Polynomial 0x1021, Init 0xFFFF) */
uint16_t uart_bridge_crc16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)data[i] << 8;
        for (int j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}

void uart_bridge_init(void) {
    memset(&s_stats, 0, sizeof(uart_stats_t));
}

int uart_bridge_send_frame(const uint8_t *payload, size_t len) {
    if (!payload || len == 0 || len > UART_MAX_PAYLOAD) return -1;

    uint8_t frame_buf[UART_MAX_PAYLOAD + 8];
    frame_buf[0] = UART_FRAME_SOF_1;
    frame_buf[1] = UART_FRAME_SOF_2;
    frame_buf[2] = (uint8_t)((len >> 8) & 0xFF);
    frame_buf[3] = (uint8_t)(len & 0xFF);

    memcpy(frame_buf + 4, payload, len);

    uint16_t crc = uart_bridge_crc16(payload, len);
    frame_buf[4 + len] = (uint8_t)((crc >> 8) & 0xFF);
    frame_buf[5 + len] = (uint8_t)(crc & 0xFF);
    frame_buf[6 + len] = UART_FRAME_EOF_1;
    frame_buf[7 + len] = UART_FRAME_EOF_2;

    s_stats.total_frames_tx++;
    /* Hardware UART write occurs here */
    return (int)(len + 8);
}

void uart_bridge_process_rx(const uint8_t *rx_bytes, size_t len, uart_rx_cb_t cb) {
    if (!rx_bytes || len < 8 || !cb) return;

    /* Frame validation */
    if (rx_bytes[0] != UART_FRAME_SOF_1 || rx_bytes[1] != UART_FRAME_SOF_2) {
        s_stats.dropped_frames++;
        return;
    }

    uint16_t payload_len = ((uint16_t)rx_bytes[2] << 8) | rx_bytes[3];
    if (payload_len + 8 > len) {
        s_stats.dropped_frames++;
        return;
    }

    if (rx_bytes[6 + payload_len] != UART_FRAME_EOF_1 || rx_bytes[7 + payload_len] != UART_FRAME_EOF_2) {
        s_stats.dropped_frames++;
        return;
    }

    uint16_t expected_crc = ((uint16_t)rx_bytes[4 + payload_len] << 8) | rx_bytes[5 + payload_len];
    uint16_t actual_crc = uart_bridge_crc16(rx_bytes + 4, payload_len);

    if (actual_crc != expected_crc) {
        s_stats.crc_errors++;
        return;
    }

    s_stats.total_frames_rx++;
    cb(rx_bytes + 4, payload_len);
}

const uart_stats_t* uart_bridge_get_stats(void) {
    return &s_stats;
}
