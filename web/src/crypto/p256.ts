// WebCrypto Implementation for RESILINK GRID v4
// Algorithms: P-256 (secp256r1), ECDSA 64-byte raw signatures, ECDH + HKDF-SHA256, AES-256-GCM
// Includes pure BigInt 33-byte compressed P-256 public key decompression (T14 test vectors)

// NIST P-256 Curve Parameters
// p = 2^256 - 2^224 + 2^192 + 2^96 - 1
export const P256_P = BigInt("0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF");
export const P256_A = P256_P - 3n; // a = -3 mod p
export const P256_B = BigInt("0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B");

/**
 * Modular exponentiation: (base^exp) mod mod
 */
export function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) {
      res = (res * b) % mod;
    }
    b = (b * b) % mod;
    e >>= 1n;
  }
  return res;
}

/**
 * Decompresses a 33-byte compressed P-256 public key into a 65-byte uncompressed point.
 * Compressed: 0x02 or 0x03 prefix + 32-byte X coordinate.
 * Uncompressed: 0x04 + 32-byte X + 32-byte Y.
 * Verified against T14 test vectors.
 */
export function decompressP256Point(compressed: Uint8Array): Uint8Array {
  if (compressed.length !== 33) {
    throw new Error(`Invalid compressed point length: ${compressed.length}, expected 33 bytes`);
  }
  const prefix = compressed[0];
  if (prefix !== 0x02 && prefix !== 0x03) {
    throw new Error(`Invalid point compression prefix: 0x${prefix.toString(16)}, expected 0x02 or 0x03`);
  }

  // Extract X coordinate (32 bytes)
  let x = 0n;
  for (let i = 1; i < 33; i++) {
    x = (x << 8n) | BigInt(compressed[i]);
  }

  if (x >= P256_P) {
    throw new Error("X coordinate is out of range for curve P-256");
  }

  // Compute z = (x^3 + ax + b) mod p
  const x3 = modExp(x, 3n, P256_P);
  const ax = (P256_A * x) % P256_P;
  const z = (((x3 + ax) % P256_P) + P256_B) % P256_P;

  // Since p = 3 mod 4 for P-256, sqrt(z) = z^((p + 1) / 4) mod p
  const exp = (P256_P + 1n) / 4n;
  let y = modExp(z, exp, P256_P);

  // Validate that y^2 mod p == z
  const y2 = modExp(y, 2n, P256_P);
  if (y2 !== z) {
    throw new Error("Point not on curve: square root does not exist for X coordinate");
  }

  // Check parity
  const isOdd = (y & 1n) === 1n;
  const targetOdd = prefix === 0x03;
  if (isOdd !== targetOdd) {
    y = P256_P - y;
  }

  // Construct 65-byte uncompressed point: 0x04 || X (32B) || Y (32B)
  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;

  let tempX = x;
  for (let i = 32; i >= 1; i--) {
    uncompressed[i] = Number(tempX & 0xffn);
    tempX >>= 8n;
  }

  let tempY = y;
  for (let i = 64; i >= 33; i--) {
    uncompressed[i] = Number(tempY & 0xffn);
    tempY >>= 8n;
  }

  return uncompressed;
}

/**
 * Compresses a 65-byte uncompressed P-256 point into 33 bytes.
 */
export function compressP256Point(uncompressed: Uint8Array): Uint8Array {
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error("Invalid uncompressed point format");
  }
  const compressed = new Uint8Array(33);
  const lastYByte = uncompressed[64];
  compressed[0] = (lastYByte & 1) === 1 ? 0x03 : 0x02;
  compressed.set(uncompressed.subarray(1, 33), 1);
  return compressed;
}

// Convert bytes to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generate a non-extractable P-256 keypair for ECDSA and ECDH.
 */
export async function generateDoctorKeyPair(): Promise<{
  signKeyPair: CryptoKeyPair;
  ecdhKeyPair: CryptoKeyPair;
  signPubRaw: Uint8Array;
  signPubCompressedHex: string;
  ecdhPubRaw: Uint8Array;
  ecdhPubCompressedHex: string;
}> {
  // Signing keypair (ECDSA P-256)
  const signKeyPair = await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false, // non-extractable private key
    ["sign", "verify"]
  );

  // Key-agreement keypair (ECDH P-256)
  const ecdhKeyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false, // non-extractable private key
    ["deriveKey", "deriveBits"]
  );

  const signPubExported = new Uint8Array(await window.crypto.subtle.exportKey("raw", signKeyPair.publicKey));
  const ecdhPubExported = new Uint8Array(await window.crypto.subtle.exportKey("raw", ecdhKeyPair.publicKey));

  return {
    signKeyPair,
    ecdhKeyPair,
    signPubRaw: signPubExported,
    signPubCompressedHex: bytesToHex(compressP256Point(signPubExported)),
    ecdhPubRaw: ecdhPubExported,
    ecdhPubCompressedHex: bytesToHex(compressP256Point(ecdhPubExported)),
  };
}

/**
 * Verify ECDSA P-256 raw 64-byte signature (r || s).
 */
export async function verifyECDSA64Byte(
  compressedPubHex: string,
  signatureHex: string,
  dataBytes: Uint8Array
): Promise<boolean> {
  try {
    const compBytes = hexToBytes(compressedPubHex);
    const uncompressedPoint = compBytes.length === 33 ? decompressP256Point(compBytes) : compBytes;

    const pubKey = await window.crypto.subtle.importKey(
      "raw",
      uncompressedPoint as any,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const sigBytes = hexToBytes(signatureHex);
    if (sigBytes.length !== 64) {
      console.warn("Signature length is not 64 bytes:", sigBytes.length);
      return false;
    }

    // WebCrypto accepts raw IEEE P1363 (64 bytes: 32B r || 32B s)
    return await window.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      pubKey,
      sigBytes as any,
      dataBytes as any
    );
  } catch (err) {
    console.error("ECDSA verification error:", err);
    return false;
  }
}

/**
 * Unwrap Epoch DEK using ECDH + HKDF-SHA256:
 * info = "RESILINK-v3"|deviceID|epochID|msgID
 */
export async function unwrapDEK(
  recipientECDHPrivateKey: CryptoKey,
  senderEphemeralPubHex: string,
  wrappedDEKHex: string,
  deviceID: string,
  epochID: number,
  msgID: number
): Promise<CryptoKey> {
  const ephemCompBytes = hexToBytes(senderEphemeralPubHex);
  const ephemUncompressed = ephemCompBytes.length === 33 ? decompressP256Point(ephemCompBytes) : ephemCompBytes;

  const senderPub = await window.crypto.subtle.importKey(
    "raw",
    ephemUncompressed as any,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive HKDF master secret from ECDH
  const derivedSecret = await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: senderPub },
    recipientECDHPrivateKey,
    { name: "HKDF", hash: "SHA-256" },
    false,
    ["deriveKey"]
  );

  // Exact contract info: "RESILINK-v3"|deviceID|epochID|msgID
  const infoString = `RESILINK-v3|${deviceID}|${epochID}|${msgID}`;
  const infoBytes = new TextEncoder().encode(infoString);
  const saltBytes = new Uint8Array(16); // zero salt as per standard HKDF default

  // Derive AES-GCM or AES-KW unwrapping key
  const unwrapKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: saltBytes as any,
      info: infoBytes as any,
      hash: "SHA-256"
    },
    derivedSecret,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Unwrap DEK: ciphertext + tag
  const wrappedBytes = hexToBytes(wrappedDEKHex);
  // Unwrapped with a deterministic 12-byte IV for the DEK envelope:
  const dekIv = new Uint8Array(12);
  dekIv.set(new TextEncoder().encode("DEK-WRAP-IV!").subarray(0, 12));

  const rawDEK = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: dekIv as any },
    unwrapKey,
    wrappedBytes as any
  );

  // Import unwrapped DEK
  return await window.crypto.subtle.importKey(
    "raw",
    rawDEK as any,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

/**
 * Decrypt AES-256-GCM ciphertext using the 26-byte wire header as AAD.
 * Nonce = node_id|epoch|counter (12 bytes)
 */
export async function decryptEnvelopePayload(
  dek: CryptoKey,
  headerAADBytes: Uint8Array,
  nonce12Bytes: Uint8Array,
  ciphertextWithTag: Uint8Array
): Promise<Uint8Array> {
  return new Uint8Array(await window.crypto.subtle.decrypt(
    {
      name: "AES-256-GCM",
      iv: nonce12Bytes as any,
      additionalData: headerAADBytes as any,
      tagLength: 128
    },
    dek,
    ciphertextWithTag as any
  ));
}

/**
 * Construct 26-byte AAD Wire Header:
 * node_id (4B), seq (4B), epoch (4B), priority (2B), counter (8B), reserved (4B) = 26 bytes
 */
export function build26ByteHeader(
  nodeIdNum: number,
  seq: number,
  epoch: number,
  priorityCode: number, // 0 = P0, 1 = P1, 2 = P2
  counter: bigint
): Uint8Array {
  const buf = new Uint8Array(26);
  const view = new DataView(buf.buffer);
  view.setUint32(0, nodeIdNum, false);
  view.setUint32(4, seq, false);
  view.setUint32(8, epoch, false);
  view.setUint16(12, priorityCode, false);
  view.setBigUint64(14, counter, false);
  view.setUint32(22, 0, false); // Reserved
  return buf;
}

/**
 * Build 12-byte GCM Nonce:
 * nodeId (4B) | epoch (4B) | counter (4B)
 */
export function build12ByteNonce(nodeIdNum: number, epoch: number, counter: number): Uint8Array {
  const nonce = new Uint8Array(12);
  const view = new DataView(nonce.buffer);
  view.setUint32(0, nodeIdNum, false);
  view.setUint32(4, epoch, false);
  view.setUint32(8, counter, false);
  return nonce;
}
