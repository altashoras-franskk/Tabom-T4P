// ── Alchemy Lab — Field Grid (C/A/S) ─────────────────────────────────────────
// C = Prima Materia, A = Coagulatio/Affinity, S = Separatio/Stress
import { FieldGrid, FIELD_SIZE, AlchemyPhysics } from './alchemyTypes';

const G = FIELD_SIZE;

// ── Create empty field ────────────────────────────────────────────────────────
export function createField(): FieldGrid {
  return {
    C: new Float32Array(G * G),
    A: new Float32Array(G * G),
    S: new Float32Array(G * G),
  };
}

// ── Persistent diff buffers (avoid GC) ───────────────────────────────────────
let _tmpC: Float32Array | null = null;
let _tmpA: Float32Array | null = null;
let _tmpS: Float32Array | null = null;
function getTmp(): [Float32Array, Float32Array, Float32Array] {
  if (!_tmpC) { _tmpC = new Float32Array(G*G); _tmpA = new Float32Array(G*G); _tmpS = new Float32Array(G*G); }
  return [_tmpC!, _tmpA!, _tmpS!];
}

// ── World → grid index ────────────────────────────────────────────────────────
export function worldToGrid(x: number, y: number): number {
  const gx = Math.max(0, Math.min(G-1, Math.floor(x * G)));
  const gy = Math.max(0, Math.min(G-1, Math.floor(y * G)));
  return gy * G + gx;
}

// ── Sample field at world pos (bilinear) ──────────────────────────────────────
export function sampleField(arr: Float32Array, x: number, y: number): number {
  const fx = x * (G-1), fy = y * (G-1);
  const gx = Math.floor(fx), gy = Math.floor(fy);
  const tx = fx - gx, ty = fy - gy;
  const i00 = Math.min(gy,G-1)*G + Math.min(gx,G-1);
  const i10 = Math.min(gy,G-1)*G + Math.min(gx+1,G-1);
  const i01 = Math.min(gy+1,G-1)*G + Math.min(gx,G-1);
  const i11 = Math.min(gy+1,G-1)*G + Math.min(gx+1,G-1);
  return arr[i00]*(1-tx)*(1-ty) + arr[i10]*tx*(1-ty)
       + arr[i01]*(1-tx)*ty     + arr[i11]*tx*ty;
}

// ── Deposit agent to field ────────────────────────────────────────────────────
export function depositAgent(
  field: FieldGrid,
  x: number, y: number,
  charge: number, affinity: number, stress: number,
  gain: number,
): void {
  const idx = worldToGrid(x, y);
  field.C[idx] = Math.min(1, field.C[idx] + charge  * gain * 0.012);
  field.A[idx] = Math.min(1, field.A[idx] + affinity * gain * 0.008);
  field.S[idx] = Math.min(1, field.S[idx] + stress   * gain * 0.008);
}

// ── Update field: diffuse + decay + globalMix ────────────────────────────────
export function updateField(
  field:      FieldGrid,
  dt:         number,
  phys:       AlchemyPhysics,
  lapisActive: boolean,    // lapis transmutes S→A near center
): void {
  const [tC, tA, tS] = getTmp();
  const diff  = Math.min(0.8, phys.diffusion * dt * 12);
  const dec   = phys.decay * dt * 0.8;
  const mix   = phys.globalMix * dt * 0.04;

  // Compute field averages for globalMix
  let avgC=0, avgA=0, avgS=0;
  for (let i=0;i<G*G;i++) { avgC+=field.C[i]; avgA+=field.A[i]; avgS+=field.S[i]; }
  avgC/=G*G; avgA/=G*G; avgS/=G*G;

  for (let gy=0;gy<G;gy++) {
    for (let gx=0;gx<G;gx++) {
      const i  = gy*G+gx;
      const in_ = (gy>0?gy-1:gy)*G+gx;
      const is_ = (gy<G-1?gy+1:gy)*G+gx;
      const iw  = gy*G+(gx>0?gx-1:gx);
      const ie  = gy*G+(gx<G-1?gx+1:gx);

      const nC=(field.C[in_]+field.C[is_]+field.C[iw]+field.C[ie])/4;
      const nA=(field.A[in_]+field.A[is_]+field.A[iw]+field.A[ie])/4;
      const nS=(field.S[in_]+field.S[is_]+field.S[iw]+field.S[ie])/4;

      tC[i] = Math.max(0, (field.C[i]*(1-diff)+nC*diff)*(1-dec)+avgC*mix);
      tA[i] = Math.max(0, (field.A[i]*(1-diff)+nA*diff)*(1-dec)+avgA*mix);
      tS[i] = Math.max(0, (field.S[i]*(1-diff)+nS*diff)*(1-dec)+avgS*mix);

      // Lapis transmutation: S → A near center (budgeted, only if FORGED)
      if (lapisActive) {
        const cgx=(gx/G-0.5)*2, cgy=(gy/G-0.5)*2;
        const d2=cgx*cgx+cgy*cgy;
        if (d2<0.35) { // within r~0.59 of world space
          const transRate=dt*0.06*(1-d2/0.35);
          const amount=Math.min(tS[i], transRate);
          tS[i]-=amount;
          tA[i]=Math.min(1,tA[i]+amount*0.7);
        }
      }
    }
  }
  field.C.set(tC); field.A.set(tA); field.S.set(tS);
}

// ── Compute metrics from field ────────────────────────────────────────────────
export function computeFieldMetrics(field: FieldGrid): {
  meanC: number; meanA: number; meanS: number; integration: number; tension: number;
} {
  let sumC=0, sumA=0, sumS=0;
  for (let i=0;i<G*G;i++) { sumC+=field.C[i]; sumA+=field.A[i]; sumS+=field.S[i]; }
  const n=G*G;
  const mC=sumC/n, mA=sumA/n, mS=sumS/n;
  return {
    meanC: mC,
    meanA: mA,
    meanS: mS,
    integration: Math.max(0, Math.min(1, mA - mS + 0.5)),
    tension:     Math.min(1, mS * 4),
  };
}

// ── Reset field ───────────────────────────────────────────────────────────────
export function resetField(field: FieldGrid): void {
  field.C.fill(0); field.A.fill(0); field.S.fill(0);
}
