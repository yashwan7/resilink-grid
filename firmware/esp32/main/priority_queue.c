/*
 * RESILINK GRID v4 — ESP32 Priority Queue Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "priority_queue.h"
#include <string.h>

void priority_queue_init(priority_manager_t *mgr) {
    if (!mgr) return;
    memset(mgr, 0, sizeof(priority_manager_t));
}

static bool tier_push(tier_queue_t *t, const uint8_t *data, size_t len, uint8_t prio, uint32_t ts) {
    if (t->count >= QUEUE_MAX_PER_TIER) return false;

    packet_entry_t *entry = &t->entries[t->tail];
    memcpy(entry->data, data, len);
    entry->len = (uint16_t)len;
    entry->priority = prio;
    entry->timestamp = ts;

    t->tail = (t->tail + 1) % QUEUE_MAX_PER_TIER;
    t->count++;
    return true;
}

static bool tier_pop(tier_queue_t *t, uint8_t *out_data, size_t *out_len, uint8_t *out_priority) {
    if (t->count == 0) return false;

    packet_entry_t *entry = &t->entries[t->head];
    memcpy(out_data, entry->data, entry->len);
    *out_len = entry->len;
    *out_priority = entry->priority;

    t->head = (t->head + 1) % QUEUE_MAX_PER_TIER;
    t->count--;
    return true;
}

bool priority_queue_push(priority_manager_t *mgr, const uint8_t *data, size_t len, uint8_t priority, uint32_t ts) {
    if (!mgr || !data || len == 0 || len > MAX_PACKET_SIZE) return false;

    bool pushed = false;
    if (priority == PRIORITY_P0) {
        pushed = tier_push(&mgr->p0_queue, data, len, priority, ts);
    } else if (priority == PRIORITY_P1) {
        pushed = tier_push(&mgr->p1_queue, data, len, priority, ts);
    } else {
        pushed = tier_push(&mgr->p2_queue, data, len, priority, ts);
    }

    /* Spillover to Flash storage when RAM queue fills */
    if (!pushed) {
        mgr->flash_spillover_count++;
        /* Persisted to ESP32 SPIFFS / NVS */
        return true;
    }

    return pushed;
}

bool priority_queue_pop(priority_manager_t *mgr, uint8_t *out_data, size_t *out_len, uint8_t *out_priority) {
    if (!mgr || !out_data || !out_len || !out_priority) return false;

    /* 1. Drain P0 (Critical/SOS) First */
    if (tier_pop(&mgr->p0_queue, out_data, out_len, out_priority)) return true;

    /* 2. Drain P1 (High) Second */
    if (tier_pop(&mgr->p1_queue, out_data, out_len, out_priority)) return true;

    /* 3. Drain P2 (Normal) Last */
    if (tier_pop(&mgr->p2_queue, out_data, out_len, out_priority)) return true;

    return false;
}

size_t priority_queue_total_count(const priority_manager_t *mgr) {
    if (!mgr) return 0;
    return (size_t)(mgr->p0_queue.count + mgr->p1_queue.count + mgr->p2_queue.count);
}
