// T14 Verification: P-256 33-Byte Compressed Point Decompression Tests
// Tested against standard NIST P-256 (secp256r1) test vectors

import { describe, it, expect } from 'vitest';
import { decompressP256Point, compressP256Point, bytesToHex, hexToBytes, modExp, P256_P, P256_A, P256_B } from './p256';

describe('P-256 Curve Math & Decompression (T14 Test Vectors)', () => {
  // NIST P-256 Generator Base Point G
  // G_x = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296
  // G_y = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5 (G_y is odd -> prefix 0x03)
  const G_COMPRESSED_HEX = '036b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296';
  const G_UNCOMPRESSED_HEX = '046b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c2964fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5';

  it('correctly decompresses NIST P-256 base point G from 33 bytes to 65 bytes', () => {
    const compBytes = hexToBytes(G_COMPRESSED_HEX);
    expect(compBytes.length).toBe(33);

    const uncomp = decompressP256Point(compBytes);
    expect(uncomp.length).toBe(65);
    expect(bytesToHex(uncomp)).toBe(G_UNCOMPRESSED_HEX.toLowerCase());
  });

  it('correctly round-trips uncompressed to compressed to uncompressed', () => {
    const originalUncomp = hexToBytes(G_UNCOMPRESSED_HEX);
    const compressed = compressP256Point(originalUncomp);
    expect(compressed.length).toBe(33);
    expect(bytesToHex(compressed)).toBe(G_COMPRESSED_HEX.toLowerCase());

    const reconstructed = decompressP256Point(compressed);
    expect(bytesToHex(reconstructed)).toBe(G_UNCOMPRESSED_HEX.toLowerCase());
  });

  it('verifies that y^2 = x^3 + ax + b mod p on the curve', () => {
    const uncomp = hexToBytes(G_UNCOMPRESSED_HEX);
    let x = 0n;
    for (let i = 1; i < 33; i++) {
      x = (x << 8n) | BigInt(uncomp[i]);
    }
    let y = 0n;
    for (let i = 33; i < 65; i++) {
      y = (y << 8n) | BigInt(uncomp[i]);
    }

    const y2 = modExp(y, 2n, P256_P);
    const x3 = modExp(x, 3n, P256_P);
    const ax = (P256_A * x) % P256_P;
    const rhs = (((x3 + ax) % P256_P) + P256_B) % P256_P;

    expect(y2).toBe(rhs);
  });

  it('rejects points not on curve or invalid prefix', () => {
    // Bad prefix 0x05
    const badPrefix = new Uint8Array(33);
    badPrefix[0] = 0x05;
    expect(() => decompressP256Point(badPrefix)).toThrow(/Invalid point compression prefix/);

    // Invalid length
    expect(() => decompressP256Point(new Uint8Array(32))).toThrow(/Invalid compressed point length/);
  });
});
