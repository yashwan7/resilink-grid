/*
 * RESILINK GRID v4 — Delta Snapshot Engine Interface
 * Keyframe baseline + delta differential compression + flash ring buffer
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef DELTA_SNAPSHOT_H
#define DELTA_SNAPSHOT_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_DELTAS_PER_KEYFRAME 30

typedef struct {
    keyframe_payload_t keyframe;
    delta_sample_t     deltas[MAX_DELTAS_PER_KEYFRAME];
    uint8_t            delta_count;
    uint32_t           last_request_time_ms;
} snapshot_session_t;

typedef struct {
    uint32_t keyframe_id;
    uint32_t timestamp;
    uint8_t  data[128];
    size_t   data_len;
} ring_entry_t;

typedef struct {
    ring_entry_t entries[RESILINK_RING_BUFFER_CAPACITY];
    uint16_t head;
    uint16_t count;
    uint32_t current_keyframe_id;
} snapshot_ring_buffer_t;

void delta_snapshot_init(snapshot_session_t *sess, snapshot_ring_buffer_t *ring);

/* Called every 1s sample. Returns true if a new keyframe was generated */
bool delta_snapshot_ingest(
    snapshot_session_t *sess,
    snapshot_ring_buffer_t *ring,
    const vitals_sample_t *sample,
    uint8_t risk_score,
    risk_class_t risk_class,
    const uint8_t top_factors[3],
    uint8_t *out_payload,
    size_t *out_payload_len,
    msg_type_t *out_msg_type
);

/* Encode keyframe to binary */
size_t encode_keyframe(const keyframe_payload_t *kf, uint8_t *dst);
/* Decode keyframe from binary */
bool decode_keyframe(const uint8_t *src, size_t len, keyframe_payload_t *kf);

/* Encode delta payload */
size_t encode_delta(
    uint32_t keyframe_id,
    uint16_t offset_s,
    const delta_sample_t *deltas,
    uint8_t delta_count,
    uint8_t *dst
);

/* Handle doctor SNAPSHOT_REQUEST: builds keyframe + all accumulated deltas */
bool delta_snapshot_handle_request(
    snapshot_session_t *sess,
    uint32_t now_ms,
    uint8_t *out_bundle,
    size_t *out_bundle_len
);

#ifdef __cplusplus
}
#endif

#endif /* DELTA_SNAPSHOT_H */
