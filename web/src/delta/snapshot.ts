// F3 Delta Snapshot Engine
// Keyframe every N records; deltas ref keyframe_id; signed SNAPSHOT_REQUEST

import { KeyframeRecord, DeltaRecord, VitalsSample, RiskScore } from '../types';

export interface SnapshotEngineState {
  keyframes: Map<string, KeyframeRecord>;
  deltas: Map<string, DeltaRecord[]>; // keyframe_id -> deltas
}

/**
 * Delta encode a new vitals sample relative to baseline keyframe.
 */
export function createDelta(
  keyframe: KeyframeRecord,
  seq: number,
  current: VitalsSample,
  risk: RiskScore
): DeltaRecord {
  return {
    seq,
    keyframe_id: keyframe.keyframe_id,
    ts_delta: current.ts - keyframe.ts,
    d_hr: current.hr - keyframe.baseline.hr,
    d_spo2: current.spo2 - keyframe.baseline.spo2,
    d_temp: Math.round((current.temp - keyframe.baseline.temp) * 10) / 10,
    d_resp: current.resp && keyframe.baseline.resp ? current.resp - keyframe.baseline.resp : undefined,
    risk_score: risk.score,
    risk_class: risk.class
  };
}

/**
 * Reconstruct full timeline of vitals from a keyframe and its deltas.
 */
export function reconstructHistory(
  keyframe: KeyframeRecord,
  deltas: DeltaRecord[]
): VitalsSample[] {
  const history: VitalsSample[] = [keyframe.baseline];
  const sortedDeltas = [...deltas].sort((a, b) => a.seq - b.seq);

  for (const d of sortedDeltas) {
    if (d.keyframe_id !== keyframe.keyframe_id) continue;
    const reconstructed: VitalsSample = {
      ts: keyframe.ts + d.ts_delta,
      hr: keyframe.baseline.hr + d.d_hr,
      spo2: keyframe.baseline.spo2 + d.d_spo2,
      temp: Math.round((keyframe.baseline.temp + d.d_temp) * 10) / 10,
      resp: keyframe.baseline.resp !== undefined && d.d_resp !== undefined
        ? keyframe.baseline.resp + d.d_resp
        : keyframe.baseline.resp,
      sim: keyframe.baseline.sim
    };
    history.push(reconstructed);
  }

  return history;
}

/**
 * Create a signed SNAPSHOT_REQUEST payload by a doctor.
 */
export async function createSignedSnapshotRequest(
  doctorPrivKey: CryptoKey,
  doctorId: string,
  targetNodeId: string,
  keyframeId?: string
): Promise<{
  doctor_id: string;
  target_node_id: string;
  keyframe_id?: string;
  ts: number;
  nonce: string;
  signature_hex: string;
}> {
  const ts = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10);
  const payloadString = `SNAPSHOT_REQ|${doctorId}|${targetNodeId}|${keyframeId || '*'}|${ts}|${nonce}`;
  const dataBytes = new TextEncoder().encode(payloadString);

  // Sign using WebCrypto ECDSA
  const sigBuffer = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    doctorPrivKey,
    dataBytes
  );

  const sigBytes = new Uint8Array(sigBuffer);
  const signature_hex = Array.from(sigBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    doctor_id: doctorId,
    target_node_id: targetNodeId,
    keyframe_id: keyframeId,
    ts,
    nonce,
    signature_hex
  };
}
