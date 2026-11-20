/*
 * RESILINK GRID v4 — nRF24L01+ Custom Fragmentation & Mesh Stack Header
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 * Standard: 32-byte physical over-the-air frame (8B header + 24B payload)
 */

#ifndef NRF24_MESH_H
#define NRF24_MESH_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define NRF24_MAX_FRAME_SIZE      32
#define NRF24_HEADER_SIZE         8
#define NRF24_PAYLOAD_SIZE        24
#define NRF24_MAX_FRAGMENTS       32   /* 32 * 24 = 768 bytes max envelope */
#define NRF24_MAX_HOPS            4
#define NRF24_REASSEMBLY_TIMEOUT_MS 5000
#define NRF24_DUP_CACHE_SIZE      64

/* Padding Buckets to prevent traffic analysis */
#define NRF24_BUCKET_SMALL        240
#define NRF24_BUCKET_MEDIUM       288
#define NRF24_BUCKET_LARGE        336

/* Frame Header Flags */
#define NRF24_FLAG_ACK_REQ        (1 << 0)
#define NRF24_FLAG_IS_ACK         (1 << 1)
#define NRF24_FLAG_RETRANS        (1 << 2)

#pragma pack(push, 1)
typedef struct {
    uint16_t msg_id;        /* Big-Endian unique message ID */
    uint8_t  frag_idx;      /* Fragment Index: 0 .. total_frags-1 */
    uint8_t  total_frags;   /* Total number of fragments in envelope */
    uint8_t  hop_count;     /* 0 when created, incremented by relays */
    uint8_t  ttl_s;         /* Time-to-live in seconds */
    uint8_t  flags;         /* ACK_REQ, IS_ACK, RETRANS */
    uint8_t  crc8;          /* CRC-8 covering bytes 0-6 + 24B payload */
    uint8_t  payload[NRF24_PAYLOAD_SIZE];
} nrf24_frame_t;
#pragma pack(pop)

/* Reassembly Context for receiving node */
typedef struct {
    uint16_t msg_id;
    uint32_t received_bitmap; /* Bit i = 1 if frag i received */
    uint8_t  total_frags;
    uint32_t first_rx_timestamp_ms;
    uint16_t total_bytes_expected;
    uint8_t  buffer[NRF24_MAX_FRAGMENTS * NRF24_PAYLOAD_SIZE];
    bool     active;
} nrf24_reassembly_ctx_t;

/* Duplicate Relay Cache Entry */
typedef struct {
    uint16_t msg_id;
    uint8_t  frag_idx;
    uint32_t timestamp_ms;
} nrf24_dup_entry_t;

/* Stack State */
typedef struct {
    uint16_t next_msg_id;
    nrf24_reassembly_ctx_t rx_ctx;
    nrf24_dup_entry_t dup_cache[NRF24_DUP_CACHE_SIZE];
    uint8_t dup_cache_idx;
    uint8_t current_channel;
} nrf24_mesh_state_t;

/* Public API */
void nrf24_mesh_init(nrf24_mesh_state_t *state, uint8_t initial_channel);
size_t nrf24_compute_padded_size(size_t raw_length);
uint8_t nrf24_crc8(const uint8_t *data, size_t len);

/* Fragmentation: takes source envelope and fragments it into frames */
int nrf24_fragment_envelope(
    nrf24_mesh_state_t *state,
    const uint8_t *envelope,
    size_t envelope_len,
    uint8_t ttl_s,
    nrf24_frame_t *out_frames,
    size_t max_out_frames
);

/* Ingest: handles incoming 32B frame; returns true when full envelope is assembled */
bool nrf24_process_rx_frame(
    nrf24_mesh_state_t *state,
    const nrf24_frame_t *frame,
    uint32_t now_ms,
    uint8_t *out_envelope,
    size_t *out_envelope_len
);

/* Relay check: returns true if frame should be repeated/forwarded */
bool nrf24_should_relay(
    nrf24_mesh_state_t *state,
    nrf24_frame_t *frame,
    uint32_t now_ms
);

/* Channel Co-existence Agility */
bool nrf24_is_wifi_interfered_channel(uint8_t channel);
uint8_t nrf24_select_best_channel(void);

#ifdef __cplusplus
}
#endif

#endif /* NRF24_MESH_H */
