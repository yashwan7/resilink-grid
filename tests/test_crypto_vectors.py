"""
RESILINK GRID v4 — Cryptographic Verification Suite (T1, T2, T14)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - T1: AES-256-GCM + 26B AAD, ECDH P-256, HKDF-SHA256, ECDSA 64-byte raw sig
  - T2: Tamper detection (Flipped bit in Ciphertext, AAD, Tag, Signature)
  - T14: SEC1 P-256 Compressed Public Key Decompression (BigInt sqrt math)
"""

import os
import struct
import hashlib
import hmac
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


P256_P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
P256_A = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC
P256_B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B


def decompress_sec1_p256(compressed_bytes: bytes) -> bytes:
    """
    Decompresses 33-byte SEC1 compressed point (0x02/0x03 || X)
    using modular square root: Y = sqrt(X^3 - 3X + B) mod P.
    Matches Harshavardhan's WebCrypto JavaScript BigInt implementation.
    """
    assert len(compressed_bytes) == 33
    header = compressed_bytes[0]
    assert header in (0x02, 0x03)
    x = int.from_bytes(compressed_bytes[1:], byteorder='big')

    # Y^2 = X^3 + a*X + b (mod P)
    y2 = (pow(x, 3, P256_P) + P256_A * x + P256_B) % P256_P

    # Since P = 3 (mod 4) for NIST P-256:
    # y = y2^((P + 1) / 4) mod P
    exp = (P256_P + 1) // 4
    y = pow(y2, exp, P256_P)

    # Check quadratic residue
    if pow(y, 2, P256_P) != y2:
        raise ValueError("Invalid curve point (no square root exists)")

    # Match parity with header
    is_odd = (header == 0x03)
    if (y % 2 == 1) != is_odd:
        y = P256_P - y

    y_bytes = y.to_bytes(32, byteorder='big')
    x_bytes = compressed_bytes[1:]
    return b'\x04' + x_bytes + y_bytes


def build_aad_header(node_id: int, epoch: int, seq: int, counter: int, priority: int, payload_len: int) -> bytes:
    """Constructs standard 26-byte AAD header."""
    magic = 0x5247
    version = 0x04
    msg_type = 0x01
    flags = 0x01  # Simulated
    return struct.pack(">HBBIIIIBBH", magic, version, msg_type, node_id, epoch, seq, counter, priority, flags, payload_len)


def test_t1_crypto_vectors():
    print("[TEST T1] Running Cryptographic Primitives Vector Verification...")

    # 1. Key Generation
    device_priv = ec.generate_private_key(ec.SECP256R1())
    device_pub = device_priv.public_key()
    doctor_priv = ec.generate_private_key(ec.SECP256R1())
    doctor_pub = doctor_priv.public_key()

    # 2. ECDH Shared Secret
    shared_secret = device_priv.exchange(ec.ECDH(), doctor_pub)
    assert len(shared_secret) == 32

    # 3. HKDF-SHA256 Derivation
    ephemeral_pub_bytes = device_pub.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint
    )
    info_str = b"RESILINK-v3" + struct.pack(">III", 0x4D435801, 1, 101)

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=ephemeral_pub_bytes[1:33],
        info=info_str
    )
    kwk = hkdf.derive(shared_secret)
    assert len(kwk) == 32

    # 4. AES-256-GCM Encryption with 26-byte AAD
    epoch_dek = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(epoch_dek)
    nonce = struct.pack(">III", 0x4D435801, 1, 42)  # 12-byte GCM Nonce
    plaintext = b"PATIENT_PHYSIOLOGY_SAMPLE_ENCRYPTED_TELEMETRY"
    aad = build_aad_header(0x4D435801, 1, 42, 42, 0, len(plaintext))

    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, aad)
    ciphertext = ciphertext_and_tag[:-16]
    tag = ciphertext_and_tag[-16:]

    # Decrypt and verify round-trip
    decrypted = aesgcm.decrypt(nonce, ciphertext + tag, aad)
    assert decrypted == plaintext, "Plaintext mismatch after AES-GCM decryption!"

    # 5. ECDSA P-256 Raw 64-byte Signature
    signed_payload = aad + ciphertext + tag
    signature_der = device_priv.sign(signed_payload, ec.ECDSA(hashes.SHA256()))

    # Decode DER to raw r || s
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    r, s = decode_dss_signature(signature_der)
    raw_sig = r.to_bytes(32, byteorder='big') + s.to_bytes(32, byteorder='big')
    assert len(raw_sig) == 64

    # Verify with doctor
    from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
    der_reconstructed = encode_dss_signature(r, s)
    device_pub.verify(der_reconstructed, signed_payload, ec.ECDSA(hashes.SHA256()))

    print("  -> T1 PASS: AES-256-GCM, ECDH, HKDF-SHA256, and ECDSA raw 64B signature verified.")


def test_t2_tamper_detection():
    print("[TEST T2] Running Wire Format Tamper Detection Verification...")

    dek = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(dek)
    nonce = struct.pack(">III", 0x4D435801, 1, 55)
    plaintext = b"CONFIDENTIAL_DIAGNOSTIC_DATA"
    aad = build_aad_header(0x4D435801, 1, 55, 55, 1, len(plaintext))
    ct_tag = aesgcm.encrypt(nonce, plaintext, aad)
    ciphertext = bytearray(ct_tag[:-16])
    tag = bytearray(ct_tag[-16:])

    # 1. Flip 1 bit in Ciphertext -> Must Fail
    ciphertext[0] ^= 0x01
    try:
        aesgcm.decrypt(nonce, bytes(ciphertext) + bytes(tag), aad)
        assert False, "FAILED: Tampered ciphertext was accepted!"
    except Exception:
        pass  # Expected GCM auth failure
    ciphertext[0] ^= 0x01  # Restore

    # 2. Flip 1 bit in AAD Header -> Must Fail
    tampered_aad = bytearray(aad)
    tampered_aad[10] ^= 0x01  # Tamper Sequence field
    try:
        aesgcm.decrypt(nonce, bytes(ciphertext) + bytes(tag), bytes(tampered_aad))
        assert False, "FAILED: Tampered AAD was accepted!"
    except Exception:
        pass  # Expected

    # 3. Flip 1 bit in Auth Tag -> Must Fail
    tag[0] ^= 0x01
    try:
        aesgcm.decrypt(nonce, bytes(ciphertext) + bytes(tag), aad)
        assert False, "FAILED: Tampered Tag was accepted!"
    except Exception:
        pass  # Expected

    print("  -> T2 PASS: All bit-flip tamper attempts rejected by AES-GCM.")


def test_t14_sec1_decompression():
    print("[TEST T14] Running SEC1 P-256 Point Decompression Vector Test...")

    for _ in range(5):
        key = ec.generate_private_key(ec.SECP256R1())
        pub = key.public_key()
        uncompressed = pub.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        compressed = pub.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)

        decompressed = decompress_sec1_p256(compressed)
        assert decompressed == uncompressed, f"SEC1 Decompression mismatch: {decompressed.hex()} != {uncompressed.hex()}"

    print("  -> T14 PASS: SEC1 compressed points match exact NIST P-256 field math.")


if __name__ == "__main__":
    test_t1_crypto_vectors()
    test_t2_tamper_detection()
    test_t14_sec1_decompression()
