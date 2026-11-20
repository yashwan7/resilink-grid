# Security Policy — RESILINK GRID

## Scope

RESILINK GRID is a **research prototype**, not a certified medical device.  
All patient data in the demo is **simulated**. No real patient records are stored or transmitted.

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport encryption | AES-256-GCM, per-epoch DEK |
| Key exchange | ECDH P-256 + HKDF-SHA256 (`info = "RESILINK-v3"\|deviceID\|epochID\|msgID`) |
| Signing | ECDSA P-256, 64-byte raw signature |
| Nonce discipline | `node_id\|epoch\|counter`, new epoch on every reboot |
| Replay protection | Unique index `(device, epoch, counter)` + 2048-bit sliding bitmap |
| Audit integrity | HMAC-SHA256 hash chain over canonical JSON (RFC 8785), signed checkpoints every 100 events or 10 min |
| Hub invariant | Hub stores **zero plaintext and zero keys**. Ciphertext only. |
| Doctor decryption | WebCrypto API, non-extractable keys stored in IndexedDB |

## What the Hub Never Does

- Never decrypts any envelope
- Never stores a private key or DEK
- Never forwards plaintext to any external service
- Never logs clinical content — only metadata and ciphertext hashes

## Known Trade-offs (Disclosed)

1. **Emergency trigger sends location + priority class in clear.** This is a deliberate, consented trade-off — the hub needs GPS coordinates to dispatch the nearest ambulance without decrypting clinical data. This is documented in every demo slide.
2. **Facility and drug data are simulated.** Never presented as live hospital records.
3. **TinyML risk model trained on synthetic data.** Not clinically validated. Always labelled "Decision support, not a diagnosis."
4. **Offline dispatch = local LAN/nRF24/SMS outbox.** Does not reach a real ambulance service without a live API integration.

## Reporting Issues

This is an academic prototype. If you find a security issue relevant to the architecture (e.g., a flaw in the nonce scheme or audit chain logic), open a GitHub issue labelled `security`.

## Cryptographic Libraries Used

| Platform | Library |
|----------|---------|
| NXP firmware (C) | mbedTLS (bundled with Zephyr) |
| Hub (Python) | `cryptography` (PyCA) |
| Doctor/patient browser | WebCrypto API (native browser) |

No custom cryptographic primitives are used anywhere in the codebase.
