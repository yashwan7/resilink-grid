/*
 * RESILINK GRID v4 — Cryptographic Subsystem Interface
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef RESILINK_CRYPTO_H
#define RESILINK_CRYPTO_H

#include "resilink_types.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint32_t node_id;
    uint32_t epoch_id;
    uint32_t counter;
    uint8_t  epoch_dek[RESILINK_AES_KEY_SIZE];  /* 32-byte AES-256 key */
    uint8_t  device_privkey[32];                /* NIST P-256 scalar */
    uint8_t  device_pubkey[65];                 /* 0x04 || X || Y */
} crypto_state_t;

/* Initialize crypto subsystem, increment epoch in flash, generate fresh epoch DEK */
int resilink_crypto_init(crypto_state_t *state, uint32_t node_id);

/* Nonce generation: node_id (4B) || epoch_id (4B) || counter (4B) */
void resilink_crypto_build_nonce(
    uint32_t node_id,
    uint32_t epoch_id,
    uint32_t counter,
    uint8_t nonce_out[RESILINK_GCM_IV_SIZE]
);

/* HKDF-SHA256 info string constructor */
void resilink_crypto_build_hkdf_info(
    uint32_t device_id,
    uint32_t epoch_id,
    uint32_t msg_id,
    uint8_t *out_info,
    size_t *out_info_len
);

/* Wrap DEK for a specific recipient using ECDH P-256 + HKDF-SHA256 + AES-GCM */
int resilink_crypto_wrap_dek_for_recipient(
    const crypto_state_t *state,
    uint32_t recipient_id,
    const uint8_t recipient_pubkey[65],
    uint32_t msg_id,
    recipient_wrap_t *out_wrap
);

/* AES-256-GCM Encrypt with 26B AAD */
int resilink_crypto_encrypt_payload(
    const crypto_state_t *state,
    const uint8_t *plaintext,
    size_t plaintext_len,
    const aad_header_t *aad,
    uint8_t *ciphertext_out,
    uint8_t tag_out[RESILINK_GCM_TAG_SIZE]
);

/* AES-256-GCM Decrypt with 26B AAD */
int resilink_crypto_decrypt_payload(
    const uint8_t dek[RESILINK_AES_KEY_SIZE],
    uint32_t node_id,
    uint32_t epoch_id,
    uint32_t counter,
    const uint8_t *ciphertext,
    size_t ciphertext_len,
    const aad_header_t *aad,
    const uint8_t tag[RESILINK_GCM_TAG_SIZE],
    uint8_t *plaintext_out
);

/* ECDSA P-256 Sign over buffer: returns 64-byte raw (r || s) */
int resilink_crypto_sign_raw(
    const crypto_state_t *state,
    const uint8_t *data,
    size_t data_len,
    uint8_t sig_out[RESILINK_ECDSA_SIG_SIZE]
);

/* ECDSA P-256 Verify 64-byte raw signature */
bool resilink_crypto_verify_raw(
    const uint8_t pubkey[65],
    const uint8_t *data,
    size_t data_len,
    const uint8_t sig[RESILINK_ECDSA_SIG_SIZE]
);

/* SEC1 Point Compression & Decompression */
int resilink_point_compress(const uint8_t uncompressed[65], uint8_t compressed[33]);
int resilink_point_decompress(const uint8_t compressed[33], uint8_t uncompressed[65]);

#ifdef __cplusplus
}
#endif

#endif /* RESILINK_CRYPTO_H */
