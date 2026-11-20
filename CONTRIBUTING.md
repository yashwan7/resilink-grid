# Contributing to RESILINK GRID

Thank you for being part of the RESILINK GRID project. This document outlines the workflow and conventions for all contributors.

## Repository Layout

| Folder | Owner | Stack |
|--------|-------|-------|
| `/hub` | Harshith | Python 3.11, FastAPI, SQLite WAL |
| `/firmware`, `/ml`, `/radio` | Yashwanth | C (Zephyr/MCUXpresso), ESP-IDF, Python |
| `/web`, `/patient` | Harshavardhan | React, TypeScript, Vite, PWA, WebCrypto |

## Ground Rules

- **Never commit keys, secrets, or plaintext patient data.** Run `git log --all -p | grep -i key` before every push.
- **No custom crypto.** Use only mbedTLS, WebCrypto API, or the `cryptography` Python library.
- **All AI-generated risk output must be labelled:** `"Decision support, not a diagnosis."`
- **Simulated data must be labelled** with `sim: true` / `source: simulated`.
- **Work in your own folder.** Cross-folder changes require a team discussion first.

## Branch & Commit Convention

```
feat(<scope>): short description
fix(<scope>): short description
docs(<scope>): short description
test(<scope>): short description
chore(<scope>): short description
```

Scopes: `hub`, `firmware`, `ml`, `radio`, `web`, `patient`, `docs`, `ci`.

## Running Tests

```bash
# Hub (Harshith)
cd hub && python -m pytest tests/ -v

# Firmware tests (Yashwanth)
cd tests && python -m pytest -v

# Web (Harshavardhan)
cd web && npx playwright test
```

## Integration Contracts

All three modules communicate via contracts defined in `PACKET_SPEC.md` and `hub/API_INTEGRATION_GUIDE.md`.  
**Do not change contract field names or types without notifying the whole team.**

## Demo Checklist (run before final submission)

- [ ] Hub ingest rejects flipped-bit envelope (`BAD_SIGNATURE`)
- [ ] Replay counter rejected (`REPLAY`)
- [ ] Hub DB contains zero plaintext — only ciphertext blobs
- [ ] Tamper demo catches edited audit record (`first_bad_seq` reported)
- [ ] Ambulance auto-assigned offline (no internet)
- [ ] Patient phone beeps on CRITICAL risk class
- [ ] Doctor dashboard decrypts and displays vitals correctly
- [ ] All `as_of` timestamps shown with stale badge (>15 min)
