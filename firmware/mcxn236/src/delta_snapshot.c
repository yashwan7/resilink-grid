/*
 * RESILINK GRID v4 — Delta Snapshot Engine Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "delta_snapshot.h"
#include <string.h>
#include <math.h>

static void write_be16(uint8_t *dst, uint16_t val) {
    dst[0] = (uint8_t)((val >> 8) & 0xFF);
    dst[1] = (uint8_t)(val & 0xFF);
}

static void write_be32(uint8_t *dst, uint32_t val) {
    dst[0] = (uint8_t)((val >> 24) & 0xFF);
    dst[1] = (uint8_t)((val >> 16) & 0xFF);
    dst[2] = (uint8_t)((val >> 8) & 0xFF);
    dst[3] = (uint8_t)(val & 0xFF);
}

static void write_be64(uint8_t *dst, uint64_t val) {
    for (int i = 0; i < 8; i++) {
        dst[i] = (uint8_t)((val >> ((7 - i) * 8)) & 0xFF);
    }
}

static uint16_t read_be16(const uint8_t *src) {
    return (uint16_t)(((uint16_t)src[0] << 8) | (uint16_t)src[1]);
}

static uint32_t read_be32(const uint8_t *src) {
    return ((uint32_t)src[0] << 24) |
           ((uint32_t)src[1] << 16) |
           ((uint32_t)src[2] << 8)  |
           ((uint32_t)src[3]);
}

static uint64_t read_be64(const uint8_t *src) {
    uint64_t val = 0;
    for (int i = 0; i < 8; i++) {
        val = (val << 8) | src[i];
    }
    return val;
}

void delta_snapshot_init(snapshot_session_t *sess, snapshot_ring_buffer_t *ring) {
    if (sess) {
        memset(sess, 0, sizeof(snapshot_session_t));
    }
    if (ring) {
        memset(ring, 0, sizeof(snapshot_ring_buffer_t));
        ring->current_keyframe_id = 100;
    }
}

size_t encode_keyframe(const keyframe_payload_t *kf, uint8_t *dst) {
    if (!kf || !dst) return 0;

    write_be32(dst + 0, kf->keyframe_id);
    write_be64(dst + 4, kf->timestamp_ms);
    write_be16(dst + 12, kf->hr_x10);
    write_be16(dst + 14, kf->spo2_x100);
    write_be16(dst + 16, (uint16_t)kf->temp_x100);
    write_be16(dst + 18, kf->resp_x10);
    dst[20] = kf->risk_score;
    dst[21] = kf->risk_class;
    dst[22] = kf->top_factor_1;
    dst[23] = kf->top_factor_2;
    dst[24] = kf->top_factor_3;
    dst[25] = kf->model_version;

    return 26;
}

bool decode_keyframe(const uint8_t *src, size_t len, keyframe_payload_t *kf) {
    if (!src || len < 26 || !kf) return false;

    kf->keyframe_id = read_be32(src + 0);
    kf->timestamp_ms = read_be64(src + 4);
    kf->hr_x10 = read_be16(src + 12);
    kf->spo2_x100 = read_be16(src + 14);
    kf->temp_x100 = (int16_t)read_be16(src + 16);
    kf->resp_x10 = read_be16(src + 18);
    kf->risk_score = src[20];
    kf->risk_class = src[21];
    kf->top_factor_1 = src[22];
    kf->top_factor_2 = src[23];
    kf->top_factor_3 = src[24];
    kf->model_version = src[25];

    return true;
}

size_t encode_delta(
    uint32_t keyframe_id,
    uint16_t offset_s,
    const delta_sample_t *deltas,
    uint8_t delta_count,
    uint8_t *dst
) {
    if (!deltas || !dst) return 0;

    write_be32(dst + 0, keyframe_id);
    write_be16(dst + 4, offset_s);
    dst[6] = delta_count;

    size_t pos = 7;
    for (uint8_t i = 0; i < delta_count; i++) {
        dst[pos++] = (uint8_t)deltas[i].d_hr;
        dst[pos++] = (uint8_t)deltas[i].d_spo2;
        dst[pos++] = (uint8_t)deltas[i].d_temp_x10;
        dst[pos++] = (uint8_t)deltas[i].d_resp;
    }

    return pos;
}

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
) {
    if (!sess || !ring || !sample || !out_payload || !out_payload_len || !out_msg_type) {
        return false;
    }

    /* Check if a new keyframe is needed (every N records or first sample) */
    if (sess->delta_count == 0 || sess->delta_count >= RESILINK_SNAPSHOT_KEYFRAME_N) {
        ring->current_keyframe_id++;
        keyframe_payload_t *kf = &sess->keyframe;

        kf->keyframe_id = ring->current_keyframe_id;
        kf->timestamp_ms = (uint64_t)sample->timestamp * 1000ULL;
        kf->hr_x10 = (uint16_t)(sample->hr * 10.0f);
        kf->spo2_x100 = (uint16_t)(sample->spo2 * 100.0f);
        kf->temp_x100 = (int16_t)(sample->temp * 100.0f);
        kf->resp_x10 = (uint16_t)(sample->resp * 10.0f);
        kf->risk_score = risk_score;
        kf->risk_class = (uint8_t)risk_class;
        kf->top_factor_1 = top_factors[0];
        kf->top_factor_2 = top_factors[1];
        kf->top_factor_3 = top_factors[2];
        kf->model_version = 4;

        sess->delta_count = 0;

        size_t kf_len = encode_keyframe(kf, out_payload);
        *out_payload_len = kf_len;
        *out_msg_type = MSG_TYPE_SNAPSHOT_KEYFRAME;

        /* Store keyframe into flash ring buffer */
        ring_entry_t *entry = &ring->entries[ring->head];
        entry->keyframe_id = kf->keyframe_id;
        entry->timestamp = sample->timestamp;
        memcpy(entry->data, out_payload, kf_len);
        entry->data_len = kf_len;

        ring->head = (ring->head + 1) % RESILINK_RING_BUFFER_CAPACITY;
        if (ring->count < RESILINK_RING_BUFFER_CAPACITY) ring->count++;

        return true;
    }

    /* Compute differential delta relative to keyframe baseline */
    float base_hr = (float)sess->keyframe.hr_x10 / 10.0f;
    float base_spo2 = (float)sess->keyframe.spo2_x100 / 100.0f;
    float base_temp = (float)sess->keyframe.temp_x100 / 100.0f;
    float base_resp = (float)sess->keyframe.resp_x10 / 10.0f;

    delta_sample_t d;
    d.d_hr = (int8_t)roundf(sample->hr - base_hr);
    d.d_spo2 = (int8_t)roundf(sample->spo2 - base_spo2);
    d.d_temp_x10 = (int8_t)roundf((sample->temp - base_temp) * 10.0f);
    d.d_resp = (int8_t)roundf(sample->resp - base_resp);

    sess->deltas[sess->delta_count++] = d;

    /* Encode delta payload */
    size_t d_len = encode_delta(
        sess->keyframe.keyframe_id,
        sess->delta_count,
        &d,
        1,
        out_payload
    );
    *out_payload_len = d_len;
    *out_msg_type = MSG_TYPE_SNAPSHOT_DELTA;

    /* Store delta into flash ring buffer */
    ring_entry_t *entry = &ring->entries[ring->head];
    entry->keyframe_id = sess->keyframe.keyframe_id;
    entry->timestamp = sample->timestamp;
    memcpy(entry->data, out_payload, d_len);
    entry->data_len = d_len;

    ring->head = (ring->head + 1) % RESILINK_RING_BUFFER_CAPACITY;
    if (ring->count < RESILINK_RING_BUFFER_CAPACITY) ring->count++;

    return false;
}

bool delta_snapshot_handle_request(
    snapshot_session_t *sess,
    uint32_t now_ms,
    uint8_t *out_bundle,
    size_t *out_bundle_len
) {
    if (!sess || !out_bundle || !out_bundle_len) return false;

    /* Rate limiting: minimum 2000 ms between doctor snapshot pulls */
    if (now_ms - sess->last_request_time_ms < 2000) {
        return false;
    }
    sess->last_request_time_ms = now_ms;

    /* Bundle: Keyframe (26B) + Delta Block */
    size_t kf_len = encode_keyframe(&sess->keyframe, out_bundle);
    size_t d_len = encode_delta(
        sess->keyframe.keyframe_id,
        sess->delta_count,
        sess->deltas,
        sess->delta_count,
        out_bundle + kf_len
    );

    *out_bundle_len = kf_len + d_len;
    return true;
}
