// Patient-side WebCrypto P-256 Non-Extractable Key Management
// Stored in IndexedDB; decrypts patient's own records locally on device

export interface PatientKeyBundle {
  keyPair: CryptoKeyPair;
  pubKeyCompressedHex: string;
  patientId: string;
}

let cachedBundle: PatientKeyBundle | null = null;

export async function getOrCreatePatientKeys(patientId = 'PATIENT-NODE-MCXN01'): Promise<PatientKeyBundle> {
  if (cachedBundle) return cachedBundle;

  // Generate non-extractable P-256 keypair
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false, // non-extractable!
    ["deriveKey", "deriveBits"]
  );

  const rawPub = new Uint8Array(await window.crypto.subtle.exportKey("raw", keyPair.publicKey));
  const compressedHex = compressPointHex(rawPub);

  cachedBundle = {
    keyPair,
    pubKeyCompressedHex: compressedHex,
    patientId
  };

  return cachedBundle;
}

function compressPointHex(uncompressed: Uint8Array): string {
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    return Array.from(uncompressed).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const prefix = (uncompressed[64] & 1) === 1 ? '03' : '02';
  const xHex = Array.from(uncompressed.subarray(1, 33)).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix + xHex;
}
