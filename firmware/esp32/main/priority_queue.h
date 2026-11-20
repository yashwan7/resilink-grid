/*
 * RESILINK GRID v4 — ESP32 Priority Queue & Flash Spillover
 * 2-bit Priority-First Ordering (P0 > P1 > P2) with NVS/Flash Backup
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef PRIORITY_QUEUE_H
#define PRIORITY_QUEUE_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define QUEUE_MAX_PER_TIER 32
#define MAX_PACKET_SIZE    1024

typedef struct {
    uint8_t  data[MAX_PACKET_SIZE];
    uint16_t len;
    uint8_t  priority;
    uint32_t timestamp;
} packet_entry_t;

typedef struct {
    packet_entry_t entries[QUEUE_MAX_PER_TIER];
    uint8_t head;
    uint8_t tail;
    uint8_t count;
} tier_queue_t;

typedef struct {
    tier_queue_t p0_queue; /* Critical */
    tier_queue_t p1_queue; /* High */
    tier_queue_t p2_queue; /* Normal */
    uint32_t     flash_spillover_count;
} priority_manager_t;

void priority_queue_init(priority_manager_t *mgr);
bool priority_queue_push(priority_manager_t *mgr, const uint8_t *data, size_t len, uint8_t priority, uint32_t ts);
bool priority_queue_pop(priority_manager_t *mgr, uint8_t *out_data, size_t *out_len, uint8_t *out_priority);
size_t priority_queue_total_count(const priority_manager_t *mgr);

#ifdef __cplusplus
}
#endif

#endif /* PRIORITY_QUEUE_H */
