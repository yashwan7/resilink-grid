/*
 * RESILINK GRID v4 — Core Configuration Header (NXP FRDM-MCXN236)
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 */

#ifndef RESILINK_CONFIG_H
#define RESILINK_CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#define RESILINK_PROTOCOL_MAGIC        0x5247   /* "RG" */
#define RESILINK_PROTOCOL_VERSION      0x04

#define RESILINK_NODE_ID               0x4D435801  /* "MCX1" */
#define RESILINK_DEVICE_NAME           "MCXN236-01"
#define RESILINK_PATIENT_PSEUDONYM     "PATIENT-MCX-9942"

/* Timing Parameters */
#define RESILINK_VITALS_INTERVAL_MS    1000     /* 1 Hz sampling */
#define RESILINK_SNAPSHOT_KEYFRAME_N   30       /* 1 keyframe every 30 records */
#define RESILINK_DISAGREEMENT_THRESH   25       /* Point divergence between TinyML and NEWS2 */
#define RESILINK_ALERT_REALERT_MS      15000    /* Re-alert after 15s if un-ACKed */

/* Stability & Routing Parameters */
#define RESILINK_ROUTE_MIN_DWELL_MS    60000    /* 60s minimum dwell on route */
#define RESILINK_ROUTE_MIN_PERIOD_MS   30000    /* Max 1 transition per 30s */
#define RESILINK_CRITICAL_ESCALATE_WIN 3        /* 3 consecutive windows for Critical */
#define RESILINK_DEGRADING_ESCALATE_WIN 5       /* 5 consecutive windows for Degrading */

/* Buffer Sizes */
#define RESILINK_SPARKLINE_HISTORY_LEN 60       /* 60 seconds sparkline */
#define RESILINK_RING_BUFFER_CAPACITY  128      /* 128 snapshots in RAM ring buffer */
#define RESILINK_MAX_RECIPIENTS        4        /* Up to 3 doctors + 1 patient */
#define RESILINK_UART_BAUDRATE         460800   /* High-Speed Radio Bridge */
#define RESILINK_LOCAL_UART_BAUDRATE   115200   /* Localhost Web Stream */

/* Cryptographic Constants */
#define RESILINK_HKDF_INFO_PREFIX      "RESILINK-v3"
#define RESILINK_AAD_HEADER_SIZE       26
#define RESILINK_AES_KEY_SIZE          32       /* AES-256 */
#define RESILINK_GCM_IV_SIZE           12
#define RESILINK_GCM_TAG_SIZE          16
#define RESILINK_ECDSA_SIG_SIZE        64       /* Raw r || s */
#define RESILINK_PUBKEY_COMPRESSED_SIZE 33

#endif /* RESILINK_CONFIG_H */
