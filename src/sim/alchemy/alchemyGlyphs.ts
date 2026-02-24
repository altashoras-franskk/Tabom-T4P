// ── Alchemy Lab — Glyph Generator ────────────────────────────────────────────
// Glyphs are determined by: elements, metrics, opus phase, events.
// No arbitrary randomness — all parameters are computed from system state.
import {
  GlyphSpec, AlchemyMetrics, ElementMix, OpusPhase, AlchemyEvent,
} from './alchemyTypes';

// Derive glyph spec from system state
export function deriveGlyph(
  metrics:   AlchemyMetrics,
  elements:  ElementMix,
  phase:     OpusPhase | null,
  event:     AlchemyEvent | null,
  cracked:   boolean,
): GlyphSpec {
  const { integrationIndex:I, tensionIndex:T, noveltyIndex:N } = metrics;

  // Hue: phase-based
  const phaseHues: Record<string, number> = {
    NIGREDO:10, ALBEDO:220, CITRINITAS:48, RUBEDO:0,
  };
  const baseHue = phase ? phaseHues[phase] : 30 + elements.fire * 30;

  // Rings: driven by integration (more integrated = more rings)
  const rings = Math.max(1, Math.min(4, Math.round(1 + I * 3)));

  // Segments: air drives divisibility (3/4/6/8/12)
  const segOptions = [3,4,6,8,12];
  const segIdx = Math.min(4, Math.round(elements.air * 4 + elements.fire * 1));
  const segments = segOptions[segIdx];

  // Notches: tension → more notches (0..8)
  const notches = Math.round(T * 7 + (event ? 2 : 0));

  // Outer radius: earth = more compact, fire = more expansive
  const outerR = 0.6 + elements.fire * 0.25 - elements.earth * 0.15;

  // Brightness: lapisCharge + integration
  const brightness = 0.3 + I * 0.4 + metrics.lapisCharge * 0.3;

  return {
    outerR:    Math.max(0.3, Math.min(1, outerR)),
    rings,
    segments,
    notches:   Math.min(8, notches),
    hue:       baseHue,
    brightness:Math.min(1, brightness),
    cracked,
    phase,
  };
}

// ── Render glyph on a small canvas ───────────────────────────────────────────
export function renderGlyph(
  canvas: HTMLCanvasElement,
  spec:   GlyphSpec,
  size    = 60,
): void {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(5,5,10,0.9)';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const R  = size * 0.44 * spec.outerR;
  const l  = `hsla(${spec.hue},60%,${40 + spec.brightness * 35}%,`;

  ctx.lineCap = 'round';

  // Outer ring
  ctx.strokeStyle = l + '0.7)';
  ctx.lineWidth   = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();

  // Additional rings
  for (let r=1; r<spec.rings; r++) {
    const rr = R * (1 - r * 0.2);
    if (rr < 3) break;
    ctx.globalAlpha = 0.5 - r * 0.1;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Segment lines from center to ring
  ctx.strokeStyle = l + '0.45)';
  ctx.lineWidth   = 0.5;
  for (let s=0; s<spec.segments; s++) {
    const a = s / spec.segments * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a)*R, cy + Math.sin(a)*R);
    ctx.stroke();
  }

  // Notches on outer ring
  if (spec.notches > 0) {
    ctx.strokeStyle = l + '0.8)';
    ctx.lineWidth = 1;
    for (let n=0; n<spec.notches; n++) {
      const a = n / spec.notches * Math.PI*2 + Math.PI*0.1;
      const nx = cx + Math.cos(a)*R;
      const ny = cy + Math.sin(a)*R;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*(R-4), cy + Math.sin(a)*(R-4));
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
  }

  // Central point / cross
  ctx.strokeStyle = l + '0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx-4, cy); ctx.lineTo(cx+4, cy);
  ctx.moveTo(cx, cy-4); ctx.lineTo(cx, cy+4);
  ctx.stroke();

  // Lapis charge glow at center
  if (spec.brightness > 0.6) {
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,8);
    g.addColorStop(0, `hsla(${spec.hue},80%,80%,${(spec.brightness-0.6)*2})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill();
  }

  // Cracked: add fracture lines
  if (spec.cracked) {
    ctx.strokeStyle = `rgba(200,50,0,0.6)`;
    ctx.lineWidth = 0.7;
    // 3 fracture lines from center outward at irregular angles
    const crackAngles = [0.3, 1.8, 4.1];
    for (const a of crackAngles) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a)*R*0.9, cy + Math.sin(a)*R*0.9);
      ctx.stroke();
    }
  }
}
