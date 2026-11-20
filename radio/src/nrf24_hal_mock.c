/*
 * RESILINK GRID v4 — nRF24 Host Mock HAL for Unit Testing
 */

#include "nrf24_hal.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

static bool s_ce = false;
static bool s_csn = true;

void nrf24_hal_init(void) {
    s_ce = false;
    s_csn = true;
}

void nrf24_hal_set_ce(bool high) {
    s_ce = high;
}

void nrf24_hal_set_csn(bool high) {
    s_csn = high;
}

uint8_t nrf24_hal_spi_transfer(uint8_t data) {
    return 0x0E; /* Status register default (RX FIFO empty, TX FIFO empty) */
}

void nrf24_hal_spi_transfer_buf(const uint8_t *tx, uint8_t *rx, size_t len) {
    if (rx && tx) {
        memcpy(rx, tx, len);
    }
}

void nrf24_hal_delay_us(uint32_t us) {
    /* No-op on host */
}

uint32_t nrf24_hal_millis(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
}
