"""
Cryptographic Utilities for RESILINK GRID Hub Backend
Strict adherence to vetted cryptography: ECDSA P-256 (64-byte raw), HMAC-SHA256, Canonical JSON (RFC 8785)
"""

import hmac
import hashlib
import json
from typing import Tuple, Dict, Any, Union

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature, decode_dss_signature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from cryptography.exceptions import InvalidSignature

from config import AUDIT_HMAC_KEY, HUB_PRIVATE_KEY_HEX


def canonical_json(data: Any) -> bytes:
    """
    Serializes a Python object to canonical JSON (RFC 8785 compliant):
    - Keys sorted lexicographically
    - Compact separators (',' and ':') without whitespace
    - UTF-8 encoding
    """
    return json.dumps(
        data,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False
    ).encode('utf-8')


def compute_audit_hash(prev_hash: str, seq: int, timestamp: str, event_type: str, payload: Dict[str, Any]) -> str:
    """
    Computes HMAC-SHA256 hash over canonical JSON representation of audit event.
    """
    envelope = {
        "seq": seq,
        "prev_hash": prev_hash,
        "timestamp": timestamp,
        "event_type": event_type,
        "payload": payload
    }
    canonical_bytes = canonical_json(envelope)
    h = hmac.new(AUDIT_HMAC_KEY, canonical_bytes, hashlib.sha256)
    return h.hexdigest()


def raw_sig_to_der(raw_sig: bytes) -> bytes:
    """
    Converts a 64-byte raw ECDSA P-256 signature (r || s, 32 bytes each) to ASN.1 DER format.
    """
    if len(raw_sig) != 64:
        raise ValueError(f"Expected 64-byte raw signature, got {len(raw_sig)} bytes")
    r = int.from_bytes(raw_sig[:32], byteorder='big')
    s = int.from_bytes(raw_sig[32:], byteorder='big')
    return encode_dss_signature(r, s)


def der_to_raw_sig(der_sig: bytes) -> bytes:
    """
    Converts an ASN.1 DER ECDSA signature to 64-byte raw signature (r || s).
    """
    r, s = decode_dss_signature(der_sig)
    r_bytes = r.to_bytes(32, byteorder='big')
    s_bytes = s.to_bytes(32, byteorder='big')
    return r_bytes + s_bytes


def load_p256_public_key(pubkey_bytes: bytes) -> ec.EllipticCurvePublicKey:
    """
    Loads an ECDSA P-256 public key from:
    - 65 bytes uncompressed (0x04 || X || Y)
    - 64 bytes raw (X || Y)
    - 33 bytes compressed (0x02 or 0x03 || X)
    """
    if len(pubkey_bytes) == 64:
        pubkey_bytes = b'\x04' + pubkey_bytes
    return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), pubkey_bytes)


def verify_p256_signature(public_key_bytes: bytes, message: bytes, raw_sig: bytes) -> bool:
    """
    Verifies a 64-byte raw ECDSA P-256 signature over message bytes.
    Returns True if valid, False otherwise.
    """
    try:
        pubkey = load_p256_public_key(public_key_bytes)
        der_sig = raw_sig_to_der(raw_sig)
        pubkey.verify(der_sig, message, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def sign_p256(private_key_int_or_hex: Union[int, str], message: bytes) -> bytes:
    """
    Signs message using ECDSA P-256 and returns a 64-byte raw signature (r || s).
    """
    if isinstance(private_key_int_or_hex, str):
        priv_int = int(private_key_int_or_hex, 16)
    else:
        priv_int = private_key_int_or_hex
    privkey = ec.derive_private_key(priv_int, ec.SECP256R1())
    der_sig = privkey.sign(message, ec.ECDSA(hashes.SHA256()))
    return der_to_raw_sig(der_sig)


def get_hub_public_key() -> ec.EllipticCurvePublicKey:
    """Returns the Hub authority public key."""
    priv_int = int(HUB_PRIVATE_KEY_HEX, 16)
    privkey = ec.derive_private_key(priv_int, ec.SECP256R1())
    return privkey.public_key()


def get_hub_public_key_bytes(compressed: bool = False) -> bytes:
    """Returns uncompressed (65B) or compressed (33B) hub public key bytes."""
    pub = get_hub_public_key()
    if compressed:
        return pub.public_bytes(
            Encoding.X962,
            PublicFormat.CompressedPoint
        )
    return pub.public_bytes(
        Encoding.X962,
        PublicFormat.UncompressedPoint
    )


def sign_with_hub_key(message: bytes) -> bytes:
    """Signs message using the Hub authority private key."""
    return sign_p256(HUB_PRIVATE_KEY_HEX, message)
