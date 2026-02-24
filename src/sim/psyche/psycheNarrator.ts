// ── Psyche Lab — Metrics, Phase Detection & Narrator Events ──────────────────
import { PsycheState, PsychePhase, ARCHETYPE_IDS } from './psycheTypes';
import { ARCHETYPE_POSITIONS } from './archetypes';

const METRIC_INTERVAL = 1.2; // seconds between metric updates
let lastMetricTime    = 0;

// For surge detection (compare to previous values)
let prevShadowDensity = 0;
let prevCoherence     = 0.5;

export function updateMetrics(state: PsycheState): void {
  if (state.elapsed - lastMetricTime < METRIC_INTERVAL) return;
  lastMetricTime = state.elapsed;

  const { count } = state;
  if (count === 0) return;

  let sumCoherence  = 0;
  let sumArousal    = 0;
  let sumInhibition = 0;
  let shadowCount   = 0;
  let selfFlux      = 0;

  for (let i = 0; i < count; i++) {
    sumCoherence  += state.coherence[i];
    sumArousal    += state.arousal[i];
    sumInhibition += state.inhibition[i];
    // Shadow region density
    const sdx = state.x[i] + 0.42, sdy = state.y[i] - 0.35;
    if (Math.sqrt(sdx*sdx + sdy*sdy) < 0.25) shadowCount++;
    // Self flux
    const r = Math.sqrt(state.x[i]*state.x[i] + state.y[i]*state.y[i]);
    if (r < 0.15) selfFlux++;
  }

  const meanCoherence  = sumCoherence  / count;
  const meanArousal    = sumArousal    / count;
  const meanInhibition = sumInhibition / count;
  const shadowDensity  = shadowCount   / count;
  const selfFluxRate   = selfFlux / count;

  // Coherence variance (fragmentation proxy)
  let varCoherence = 0;
  for (let i = 0; i < count; i++) {
    varCoherence += (state.coherence[i] - meanCoherence) ** 2;
  }
  varCoherence /= count;

  // ── Calibrated metrics ────────────────────────────────────────────────────
  // tensionIndex: subtract neutral baseline (~0.25) and normalise so CALM → 0-30%
  const rawTension = meanArousal * 0.50 + meanInhibition * 0.25 + shadowDensity * 0.15;
  state.tensionIndex       = Math.max(0, Math.min(1, (rawTension - 0.22) / 0.52));

  // integrationIndex: coherence + self-flux, scaled so 0.20 coherence → ~20%
  state.integrationIndex   = Math.min(1, meanCoherence * 0.70 + selfFluxRate * 0.30);

  // fragmentationIndex: coherence variance normalised to 0-100%
  state.fragmentationIndex = Math.min(1, varCoherence * 7.0);

  // ── Phase detection ──────────────────────────────────────────────────────
  const ti = state.tensionIndex;
  const ii = state.integrationIndex;
  const fi = state.fragmentationIndex;

  let newPhase: PsychePhase;
  if      (ii > 0.55 && ti < 0.18)              newPhase = 'FLOW';
  else if (ii > 0.42 && ti < 0.28)              newPhase = 'INTEGRATING';
  else if (ti > 0.65 && fi > 0.12)              newPhase = 'PANIC';
  else if (ti > 0.40)                            newPhase = 'ALERT';
  else if (fi > 0.18 && ii < 0.30)              newPhase = 'FRAGMENTED';
  else                                            newPhase = 'CALM';
  state.phase = newPhase;

  // ── Narrator events ───────────────────────────────────────────────────────
  const emitAt = (text: string, x: number, y: number, color: string) => {
    state.events.push({ text, x, y, ttl: 3.5, color });
    if (state.events.length > 24) state.events.shift();
  };

  // Shadow surge
  if (shadowDensity > 0.20 && shadowDensity - prevShadowDensity > 0.05) {
    emitAt('SHADOW SURGE', -0.42, 0.35, '#7c3aed');
  }
  // Repression (inhibition spike)
  if (meanInhibition > 0.60 && prevCoherence > meanCoherence + 0.04) {
    emitAt('REPRESSION', 0, -0.66, '#6b7280');
  }
  // Return of the repressed (shadow burst after high inhibition)
  if (prevShadowDensity < 0.08 && shadowDensity > 0.15 && meanInhibition > 0.55) {
    emitAt('RETURN OF THE REPRESSED', -0.42, 0.35, '#ef4444');
  }
  // Insight (coherence spike after chaos)
  if (meanCoherence > prevCoherence + 0.06 && fi > 0.08) {
    emitAt('INSIGHT ✦', 0, 0, '#f5c842');
  }
  // Integration
  if (ii > 0.68 && selfFluxRate > 0.06 && newPhase === 'INTEGRATING') {
    emitAt('INTEGRATION', 0, 0, '#f5c842');
  }

  // Archetype dominance (top archetype by tag count)
  const tagCounts = new Int32Array(13);
  for (let i = 0; i < count; i++) tagCounts[state.tag[i]]++;
  let topTag = 0, topCount = 0;
  for (let t = 1; t <= 12; t++) {
    if (tagCounts[t] > topCount) { topCount = tagCounts[t]; topTag = t; }
  }
  if (topTag > 0 && topCount > count * 0.12 && Math.random() < 0.08) {
    const archName = ARCHETYPE_IDS[topTag - 1];
    const apos = Object.values(ARCHETYPE_POSITIONS)[topTag - 1];
    emitAt(`ARCHETYPE: ${archName}`, apos[0], apos[1], '#f5c842');
  }

  prevShadowDensity = shadowDensity;
  prevCoherence     = meanCoherence;
}

// ── Journey (Red Book) ────────────────────────────────────────────────────────

const ACT_DURATIONS = [38, 42, 40, 45]; // seconds per act
const ACT_NAMES     = ['Descent', 'Encounters', 'Confrontation', 'Integration'];

export interface JourneyAct {
  name: string;
  act:  number;
}

export function stepJourney(
  state: PsycheState,
  dt: number,
  onActChange: (act: JourneyAct) => void,
  onChapter: (text: string) => void,
): void {
  if (!state.journeyActive || state.journeyDone) return;

  state.journeyActT += dt;
  const actDur = ACT_DURATIONS[state.journeyAct];

  // Chapter narration within act
  narrateAct(state, onChapter, dt);

  if (state.journeyActT >= actDur) {
    state.journeyAct++;
    state.journeyActT = 0;
    if (state.journeyAct >= 4) {
      state.journeyDone = true;
      state.journeyActive = false;
      onChapter('✦ The Red Book Journey is complete.');
      return;
    }
    applyJourneyAct(state);
    onActChange({ name: ACT_NAMES[state.journeyAct], act: state.journeyAct });
  }
}

let lastChapterT = -99;

function narrateAct(
  state: PsycheState,
  onChapter: (text: string) => void,
  dt: number,
): void {
  const t = state.journeyActT;
  const act = state.journeyAct;

  // One-shot chapters per act, at certain times
  const chapters: [number, string][] = act === 0 ? [
    [3,  'ꝏ Nigredo — the first descent into darkness begins.'],
    [15, 'The Ego loosens its grip. Shadows stir below.'],
    [28, 'Raw drives emerge from the Id core.'],
  ] : act === 1 ? [
    [4,  'Figures emerge from the Collective Unconscious.'],
    [16, 'The Anima speaks — a bridge is forming.'],
    [30, 'Trickster disrupts. The familiar dissolves.'],
  ] : act === 2 ? [
    [5,  'Hero confronts Shadow at the threshold.'],
    [18, 'The Father\'s law presses down — repression peaks.'],
    [30, 'Tension at its highest. Something must break.'],
  ] : [
    [5,  'The Self draws all inward. Coherence returns.'],
    [20, 'Mandala stabilizes. Integration begins.'],
    [36, 'Albedo — the Wise One speaks from the center.'],
  ];

  for (const [chapT, text] of chapters) {
    if (t >= chapT && t < chapT + dt + 0.5 && lastChapterT < state.journeyActT - 1) {
      onChapter(`[Act ${act + 1}: ${ACT_NAMES[act]}] ${text}`);
      lastChapterT = t;
    }
  }
}

function applyJourneyAct(state: PsycheState): void {
  const act = state.journeyAct;
  // Reset all arch strengths first
  for (let i = 0; i < 12; i++) state.archetypeStrength[i] = 0.2;

  if (act === 0) {
    // Descent: Shadow + Destroyer high, Ego low
    state.archetypeActive[2]  = true;  // SHADOW
    state.archetypeStrength[2] = 0.9;
    state.archetypeActive[11] = true;  // DESTROYER
    state.archetypeStrength[11] = 0.7;
    state.archetypeActive[5]  = true;  // HERO — suppressed
    state.archetypeStrength[5] = 0.15;
  } else if (act === 1) {
    // Encounters: all archetypes emerge one by one
    for (let i = 0; i < 12; i++) {
      state.archetypeActive[i]   = true;
      state.archetypeStrength[i] = 0.45 + Math.random() * 0.35;
    }
    state.archetypeStrength[3]  = 0.80; // ANIMA
    state.archetypeStrength[4]  = 0.75; // TRICKSTER
  } else if (act === 2) {
    // Confrontation: Hero vs Shadow, Father high
    state.archetypeStrength[5]  = 0.85; // HERO
    state.archetypeStrength[2]  = 0.85; // SHADOW
    state.archetypeStrength[7]  = 0.80; // FATHER
    state.archetypeStrength[0]  = 0.25; // SELF — low
  } else if (act === 3) {
    // Integration: SELF + WISE_ONE high
    state.archetypeStrength[0]  = 0.95; // SELF
    state.archetypeStrength[8]  = 0.85; // WISE_ONE
    state.archetypeStrength[6]  = 0.70; // MOTHER
    state.archetypeStrength[2]  = 0.30; // SHADOW — fading
    state.archetypeStrength[5]  = 0.40; // HERO — settled
  }
}

export function startJourney(state: PsycheState): void {
  state.journeyActive = true;
  state.journeyAct    = 0;
  state.journeyActT   = 0;
  state.journeyDone   = false;
  lastChapterT        = -99;
  applyJourneyAct(state);
}

export function stopJourney(state: PsycheState): void {
  state.journeyActive = false;
  state.journeyDone   = true;
}