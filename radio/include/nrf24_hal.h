/*
 * RESILINK GRID v4 — nRF24L01+ Hardware Abstraction Layer Interface
 */

#ifndef NRF24_HAL_H
#define NRF24_HAL_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

void nrf24_hal_init(void);
void nrf24_hal_set_ce(bool high);
void nrf24_hal_set_csn(bool high);
uint8_t nrf24_hal_spi_transfer(uint8_t data);
void nrf24_hal_spi_transfer_buf(const uint8_t *tx, uint8_t *rx, size_t len);
void nrf24_hal_delay_us(uint32_t us);
uint32_t nrf24_hal_millis(void);

#ifdef __cplusplus
}
#endif

#endif /* NRF24_HAL_H */
