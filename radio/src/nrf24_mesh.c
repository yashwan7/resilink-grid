/*
 * RESILINK GRID v4 — nRF24L01+ Custom Fragmentation & Mesh Implementation
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#include "nrf24_mesh.h"
#include <string.h>

/* CRC-8 polynomial 0x07 (ATM/CCITT) */
uint8_t nrf24_crc8(const uint8_t *data, size_t len) {
    uint8_t crc = 0x00;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (uint8_t j = 0; j < 8; j++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ 0x07;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}

void nrf24_mesh_init(nrf24_mesh_state_t *state, uint8_t initial_channel) {
    if (!state) return;
    memset(state, 0, sizeof(nrf24_mesh_state_t));
    state->next_msg_id = 0x1001;
    state->current_channel = initial_channel;
}

/* Calculate padding bucket size to defeat traffic analysis */
size_t nrf24_compute_padded_size(size_t raw_length) {
    if (raw_length <= NRF24_BUCKET_SMALL) {
        return NRF24_BUCKET_SMALL;
    } else if (raw_length <= NRF24_BUCKET_MEDIUM) {
        return NRF24_BUCKET_MEDIUM;
    } else if (raw_length <= NRF24_BUCKET_LARGE) {
        return NRF24_BUCKET_LARGE;
    }
    /* Round up to multiple of 24 */
    size_t rem = raw_length % NRF24_PAYLOAD_SIZE;
    return rem == 0 ? raw_length : raw_length + (NRF24_PAYLOAD_SIZE - rem);
}

int nrf24_fragment_envelope(
    nrf24_mesh_state_t *state,
    const uint8_t *envelope,
    size_t envelope_len,
    uint8_t ttl_s,
    nrf24_frame_t *out_frames,
    size_t max_out_frames
) {
    if (!state || !envelope || envelope_len == 0 || !out_frames) {
        return -1;
    }

    size_t padded_size = nrf24_compute_padded_size(envelope_len);
    size_t total_frags = (padded_size + NRF24_PAYLOAD_SIZE - 1) / NRF24_PAYLOAD_SIZE;

    if (total_frags > NRF24_MAX_FRAGMENTS || total_frags > max_out_frames) {
        return -2; /* Exceeds maximum fragment capacity */
    }

    uint16_t msg_id = state->next_msg_id++;
    if (state->next_msg_id == 0) state->next_msg_id = 1;

    for (size_t i = 0; i < total_frags; i++) {
        nrf24_frame_t *f = &out_frames[i];
        memset(f, 0, sizeof(nrf24_frame_t));

        f->msg_id = msg_id;
        f->frag_idx = (uint8_t)i;
        f->total_frags = (uint8_t)total_frags;
        f->hop_count = 0;
        f->ttl_s = ttl_s;
        f->flags = (i == total_frags - 1) ? NRF24_FLAG_ACK_REQ : 0;

        size_t offset = i * NRF24_PAYLOAD_SIZE;
        if (offset < envelope_len) {
            size_t chunk = envelope_len - offset;
            if (chunk > NRF24_PAYLOAD_SIZE) chunk = NRF24_PAYLOAD_SIZE;
            memcpy(f->payload, envelope + offset, chunk);
            /* Zero-pad remainder if on padding boundary */
            if (chunk < NRF24_PAYLOAD_SIZE) {
                memset(f->payload + chunk, 0, NRF24_PAYLOAD_SIZE - chunk);
            }
        } else {
            /* Entirely pad fragment */
            memset(f->payload, 0, NRF24_PAYLOAD_SIZE);
        }

        /* Calculate CRC-8 over header[0..5] + payload[0..23] */
        uint8_t crc_buf[6 + NRF24_PAYLOAD_SIZE];
        memcpy(crc_buf, f, 6);
        memcpy(crc_buf + 6, f->payload, NRF24_PAYLOAD_SIZE);
        f->crc8 = nrf24_crc8(crc_buf, sizeof(crc_buf));
    }

    return (int)total_frags;
}

bool nrf24_process_rx_frame(
    nrf24_mesh_state_t *state,
    const nrf24_frame_t *frame,
    uint32_t now_ms,
    uint8_t *out_envelope,
    size_t *out_envelope_len
) {
    if (!state || !frame || !out_envelope || !out_envelope_len) return false;

    /* 1. Verify CRC-8 */
    uint8_t crc_buf[6 + NRF24_PAYLOAD_SIZE];
    memcpy(crc_buf, frame, 6);
    memcpy(crc_buf + 6, frame->payload, NRF24_PAYLOAD_SIZE);
    if (nrf24_crc8(crc_buf, sizeof(crc_buf)) != frame->crc8) {
        return false; /* Corrupted frame dropped */
    }

    /* 2. Check TTL */
    if (frame->ttl_s == 0) {
        return false; /* Expired */
    }

    nrf24_reassembly_ctx_t *ctx = &state->rx_ctx;

    /* 3. Handle New or Stale Reassembly Context */
    if (!ctx->active || ctx->msg_id != frame->msg_id) {
        /* Check if active context timed out */
        if (ctx->active && (now_ms - ctx->first_rx_timestamp_ms > NRF24_REASSEMBLY_TIMEOUT_MS)) {
            memset(ctx, 0, sizeof(nrf24_reassembly_ctx_t));
        }

        /* Start new reassembly context */
        ctx->msg_id = frame->msg_id;
        ctx->total_frags = frame->total_frags;
        ctx->received_bitmap = 0;
        ctx->first_rx_timestamp_ms = now_ms;
        ctx->total_bytes_expected = (uint16_t)(frame->total_frags * NRF24_PAYLOAD_SIZE);
        ctx->active = true;
    }

    /* 4. Store Fragment if valid */
    if (frame->frag_idx < ctx->total_frags && frame->frag_idx < NRF24_MAX_FRAGMENTS) {
        uint32_t mask = (1UL << frame->frag_idx);
        if (!(ctx->received_bitmap & mask)) {
            memcpy(
                ctx->buffer + (frame->frag_idx * NRF24_PAYLOAD_SIZE),
                frame->payload,
                NRF24_PAYLOAD_SIZE
            );
            ctx->received_bitmap |= mask;
        }
    }

    /* 5. Check if all fragments have arrived */
    uint32_t complete_mask = (ctx->total_frags == 32) ? 0xFFFFFFFFUL : ((1UL << ctx->total_frags) - 1);
    if ((ctx->received_bitmap & complete_mask) == complete_mask) {
        /* Full envelope successfully reassembled! */
        memcpy(out_envelope, ctx->buffer, ctx->total_bytes_expected);
        *out_envelope_len = ctx->total_bytes_expected;
        ctx->active = false; /* Reset reassembly buffer */
        return true;
    }

    return false;
}

bool nrf24_should_relay(
    nrf24_mesh_state_t *state,
    nrf24_frame_t *frame,
    uint32_t now_ms
) {
    if (!state || !frame) return false;

    /* 1. Hop limit enforcement (max 4 hops) */
    if (frame->hop_count >= NRF24_MAX_HOPS) {
        return false;
    }

    /* 2. TTL check */
    if (frame->ttl_s <= 1) {
        return false;
    }

    /* 3. Duplicate Cache Check */
    for (size_t i = 0; i < NRF24_DUP_CACHE_SIZE; i++) {
        if (state->dup_cache[i].msg_id == frame->msg_id &&
            state->dup_cache[i].frag_idx == frame->frag_idx) {
            /* Already relayed or seen recently; drop broadcast loop */
            return false;
        }
    }

    /* Record in duplicate cache */
    state->dup_cache[state->dup_cache_idx].msg_id = frame->msg_id;
    state->dup_cache[state->dup_cache_idx].frag_idx = frame->frag_idx;
    state->dup_cache[state->dup_cache_idx].timestamp_ms = now_ms;
    state->dup_cache_idx = (state->dup_cache_idx + 1) % NRF24_DUP_CACHE_SIZE;

    /* Increment hop count and decrement TTL */
    frame->hop_count++;
    frame->ttl_s--;

    /* Recompute CRC-8 */
    uint8_t crc_buf[6 + NRF24_PAYLOAD_SIZE];
    memcpy(crc_buf, frame, 6);
    memcpy(crc_buf + 6, frame->payload, NRF24_PAYLOAD_SIZE);
    frame->crc8 = nrf24_crc8(crc_buf, sizeof(crc_buf));

    return true;
}

/* Wi-Fi Channel Avoidance:
 * Wi-Fi Ch 1: 2401 - 2423 MHz (nRF24 ch 1 - 23)
 * Wi-Fi Ch 6: 2426 - 2448 MHz (nRF24 ch 26 - 48)
 * Wi-Fi Ch 11: 2451 - 2473 MHz (nRF24 ch 51 - 73)
 */
bool nrf24_is_wifi_interfered_channel(uint8_t channel) {
    if (channel >= 1 && channel <= 23) return true;
    if (channel >= 26 && channel <= 48) return true;
    if (channel >= 51 && channel <= 73) return true;
    return false;
}

uint8_t nrf24_select_best_channel(void) {
    /* Channel 84 (2484 MHz) or Channel 76 (2476 MHz guard band) */
    /* Note India WPC regulations flag: 2.400 - 2.4835 GHz is license-exempt [OPEN] */
    return 76;
}
