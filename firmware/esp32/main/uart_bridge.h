/*
 * RESILINK GRID v4 — ESP32 High-Speed UART Bridge Header
 * 460,800 baud with CRC-16 framing and error tracking
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef UART_BRIDGE_H
#define UART_BRIDGE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define UART_BRIDGE_BAUDRATE     460800
#define UART_FRAME_SOF_1         0xAA
#define UART_FRAME_SOF_2         0x55
#define UART_FRAME_EOF_1         0x55
#define UART_FRAME_EOF_2         0xAA
#define UART_MAX_PAYLOAD         1024

typedef struct {
    uint32_t total_frames_rx;
    uint32_t total_frames_tx;
    uint32_t crc_errors;
    uint32_t dropped_frames;
} uart_stats_t;

void uart_bridge_init(void);
uint16_t uart_bridge_crc16(const uint8_t *data, size_t len);

/* Frame and send payload with CRC-16 over UART */
int uart_bridge_send_frame(const uint8_t *payload, size_t len);

/* Process RX bytes; calls callback when full frame passes CRC-16 */
typedef void (*uart_rx_cb_t)(const uint8_t *payload, size_t len);
void uart_bridge_process_rx(const uint8_t *rx_bytes, size_t len, uart_rx_cb_t cb);

const uart_stats_t* uart_bridge_get_stats(void);

#ifdef __cplusplus
}
#endif

#endif /* UART_BRIDGE_H */
