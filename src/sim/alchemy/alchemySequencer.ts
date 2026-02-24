// ── Alchemy Lab — Quantum Sequencer ───────────────────────────────────────────
// A step-sequencer where each step encodes an alchemical operation.
// In quantum mode: steps have probabilistic collapse — the cursor doesn't
// always advance. Two steps can be in superposition (both partially active).
// Entangled pairs: when step A collapses, step B's probability changes.
import { QSeqStep, QuantumSequencer, ElementMix, AlchOp } from './alchemyTypes';

// ── Default step templates ────────────────────────────────────────────────────
export function createDefaultSequencer(): QuantumSequencer {
  return {
    active:    false,
    cursor:    0,
    stepDur:   2.5,   // seconds per step
    timer:     0,
    quantum:   false,
    bpm:       24,
    superStep: null,
    superWeight: 0,
    steps:     createDefaultSteps(),
  };
}

function makeStep(
  id: number, label: string,
  opts: Partial<QSeqStep> = {},
): QSeqStep {
  return {
    id, label,
    earthTarget: null, waterTarget: null, airTarget: null, fireTarget: null, heatTarget: null,
    op: 'NONE',
    active: true,
    probability: 1.0,
    entangled: null,
    entangleSign: 1,
    ...opts,
  };
}

export function createDefaultSteps(): QSeqStep[] {
  return [
    makeStep(0,  '·'),                          // rest
    makeStep(1,  'N',  { earthTarget:.2, waterTarget:.35, airTarget:.15, fireTarget:.30, heatTarget:.55 }),  // Nigredo
    makeStep(2,  '≋',  { op:'SOLVE' }),         // Solve pulse
    makeStep(3,  '·'),
    makeStep(4,  'A',  { earthTarget:.22, waterTarget:.48, airTarget:.20, fireTarget:.10, heatTarget:.28 }), // Albedo
    makeStep(5,  '⊕',  { op:'COAGULA' }),       // Coagula pulse
    makeStep(6,  '·'),
    makeStep(7,  'C',  { earthTarget:.22, waterTarget:.26, airTarget:.32, fireTarget:.20, heatTarget:.42 }), // Citrinitas
    makeStep(8,  '≋',  { op:'SOLVE' }),
    makeStep(9,  '·'),
    makeStep(10, 'R',  { earthTarget:.28, waterTarget:.15, airTarget:.20, fireTarget:.37, heatTarget:.58 }), // Rubedo
    makeStep(11, '⊕',  { op:'COAGULA' }),
    makeStep(12, '◈',  { heatTarget:.60, probability:.7, entangled:3, entangleSign:1 }), // Lapis approach
    makeStep(13, '·',  { probability:.8 }),
    makeStep(14, '≋',  { op:'SOLVE', probability:.5, entangled:11, entangleSign:-1 }), // Quantum: probabilistic
    makeStep(15, '◉',  { heatTarget:.35, probability:.6 }), // Cooldown
  ];
}

// ── Tick the sequencer ────────────────────────────────────────────────────────
export interface SeqTickResult {
  stepFired:   boolean;
  firedStep:   QSeqStep | null;
  superActive: QSeqStep | null;
  superWeight: number;
  elementsDelta: Partial<ElementMix> | null;
  heatDelta:   number | null;
  op:          AlchOp;
}

export function tickSequencer(
  seq:   QuantumSequencer,
  dt:    number,
): SeqTickResult {
  if (!seq.active) return { stepFired:false, firedStep:null, superActive:null, superWeight:0, elementsDelta:null, heatDelta:null, op:'NONE' };

  seq.timer += dt;
  const result: SeqTickResult = { stepFired:false, firedStep:null, superActive:null, superWeight:0, elementsDelta:null, heatDelta:null, op:'NONE' };

  if (seq.timer >= seq.stepDur) {
    seq.timer = 0;
    const step = seq.steps[seq.cursor];

    if (step.active) {
      // Quantum collapse: does this step fire?
      const fires = seq.quantum ? Math.random() < step.probability : true;
      if (fires) {
        result.stepFired = true;
        result.firedStep = step;
        result.op = step.op;

        // Build element targets
        if (step.earthTarget!=null||step.waterTarget!=null||step.airTarget!=null||step.fireTarget!=null) {
          result.elementsDelta = {
            earth: step.earthTarget??undefined,
            water: step.waterTarget??undefined,
            air:   step.airTarget??undefined,
            fire:  step.fireTarget??undefined,
          };
        }
        if (step.heatTarget != null) result.heatDelta = step.heatTarget;

        // Entanglement: fire partner with adjusted probability
        if (step.entangled!=null && seq.quantum) {
          const partner = seq.steps[step.entangled];
          if (step.entangleSign === 1) {
            // Correlated: if I fire, partner fires too
            if (Math.random() < step.probability * 0.8) {
              result.superActive = partner;
              result.superWeight = 0.4;
              seq.superStep   = step.entangled;
              seq.superWeight = 0.4;
            }
          } else {
            // Anti-correlated: if I fire, partner is suppressed next step
            if (partner.probability > 0.1) partner.probability -= 0.15;
          }
        }

        // Advance cursor
        seq.cursor = (seq.cursor + 1) % seq.steps.length;
        // Skip inactive steps
        let guard = 0;
        while (!seq.steps[seq.cursor].active && guard < seq.steps.length) {
          seq.cursor = (seq.cursor+1) % seq.steps.length;
          guard++;
        }
      } else {
        // Quantum mode: didn't collapse — superposition between this and next
        seq.superStep = seq.cursor;
        seq.superWeight = 0.5;
        result.superActive = step;
        result.superWeight = 0.5;
        // Advance anyway (the step exists in superposition)
        seq.cursor = (seq.cursor+1) % seq.steps.length;
        let guard=0;
        while(!seq.steps[seq.cursor].active&&guard<seq.steps.length){
          seq.cursor=(seq.cursor+1)%seq.steps.length; guard++;
        }
      }
    } else {
      seq.cursor = (seq.cursor+1) % seq.steps.length;
    }
  }

  // Superposition fades
  if (seq.superWeight > 0) {
    seq.superWeight -= dt * 0.4;
    if (seq.superWeight <= 0) { seq.superWeight=0; seq.superStep=null; }
  }

  return result;
}

// ── Preset sequences ─────────────────────────────────────────────────────────
export interface SeqPreset {
  id:    string;
  name:  string;
  steps: QSeqStep[];
  bpm:   number;
  quantum: boolean;
}

export const SEQ_PRESETS: SeqPreset[] = [
  {
    id: 'opus-classic', name: 'Opus Clássico', bpm:20, quantum:false,
    steps: createDefaultSteps(),
  },
  {
    id: 'nigredo-loop', name: 'Nigredo Loop', bpm:16, quantum:false,
    steps: [
      makeStep(0,'N',{earthTarget:.15,waterTarget:.40,airTarget:.12,fireTarget:.33,heatTarget:.60}),
      makeStep(1,'≋',{op:'SOLVE'}),
      makeStep(2,'·'),
      makeStep(3,'N',{fireTarget:.35,waterTarget:.38,heatTarget:.65}),
      makeStep(4,'·'),
      makeStep(5,'≋',{op:'SOLVE'}),
      makeStep(6,'⊕',{op:'COAGULA'}),
      makeStep(7,'·'),
    ],
  },
  {
    id: 'quantum-chaos', name: 'Quantum Chaos', bpm:30, quantum:true,
    steps: [
      makeStep(0,'N', {probability:.7,earthTarget:.12,fireTarget:.45,heatTarget:.70}),
      makeStep(1,'A', {probability:.5,waterTarget:.50,heatTarget:.25,entangled:4,entangleSign:1}),
      makeStep(2,'≋', {op:'SOLVE',probability:.6}),
      makeStep(3,'⊕', {op:'COAGULA',probability:.6,entangled:2,entangleSign:-1}),
      makeStep(4,'C', {probability:.7,airTarget:.35,heatTarget:.40}),
      makeStep(5,'◈', {heatTarget:.55,probability:.4}),
      makeStep(6,'R', {probability:.5,fireTarget:.38,earthTarget:.28,heatTarget:.58}),
      makeStep(7,'◉', {heatTarget:.30,probability:.9}),
    ],
  },
  {
    id: 'lapis-hunt', name: 'Venatione Lapidis', bpm:18, quantum:true,
    steps: [
      makeStep(0,'⊕',{op:'COAGULA',probability:.9}),
      makeStep(1,'A', {waterTarget:.48,earthTarget:.22,heatTarget:.28,probability:.85}),
      makeStep(2,'·', {probability:.7}),
      makeStep(3,'C', {airTarget:.32,heatTarget:.42,probability:.8,entangled:5,entangleSign:1}),
      makeStep(4,'⊕',{op:'COAGULA',probability:.75}),
      makeStep(5,'◈', {heatTarget:.52,probability:.65}),
      makeStep(6,'R', {fireTarget:.35,earthTarget:.28,heatTarget:.58,probability:.7}),
      makeStep(7,'◉', {heatTarget:.45,probability:.95}),
    ],
  },
];
