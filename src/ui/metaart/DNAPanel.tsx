// ─── DNA Panel ────────────────────────────────────────────────────────────
// Swiss-brutalist identity · IBM Plex Mono · #ff0084 accent
import React, { useState } from 'react';
import type { DNA, DNAGenes, Intention } from '../../sim/metaart/metaArtTypes';
import { applyIntention, generateRandomPalette } from '../../sim/metaart/metaArtDNA';
import { mutateDNA, crossbreedDNA } from '../../sim/metaart/metaArtMutations';

const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ff0084';
const DIM = 'rgba(255,255,255,0.28)';
const MID = 'rgba(255,255,255,0.5)';
const BRIGHT = 'rgba(255,255,255,0.85)';
const BORDER = 'rgba(255,255,255,0.06)';

interface Props {
  dna: DNA;
  onDNAChange: (dna: DNA) => void;
  onMutate: (variants: DNA[]) => void;
  pinnedDNA: DNA | null;
}

const GENE_LABELS: { key: keyof DNAGenes; label: string; desc: string }[] = [
  { key: 'structure',     label: 'Structure',     desc: 'organic ↔ geometric' },
  { key: 'flow',          label: 'Flow',          desc: 'static ↔ dynamic' },
  { key: 'entropy',       label: 'Entropy',       desc: 'order ↔ chaos' },
  { key: 'memory',        label: 'Memory',        desc: 'ephemeral ↔ persistent' },
  { key: 'contrast',      label: 'Contrast',      desc: 'soft ↔ hard' },
  { key: 'symmetry',      label: 'Symmetry',      desc: 'none ↔ radial' },
  { key: 'glyphness',     label: 'Glyphness',     desc: 'none ↔ saturated' },
  { key: 'erosion',       label: 'Erosion',       desc: 'accumulate ↔ erode' },
  { key: 'layering',      label: 'Layering',      desc: 'flat ↔ deep' },
  { key: 'rhythm',        label: 'Rhythm',        desc: 'continuous ↔ staccato' },
  { key: 'fragmentation', label: 'Fragmentation', desc: 'unified ↔ fragmented' },
  { key: 'coherence',     label: 'Coherence',     desc: 'noise ↔ coherent' },
  { key: 'linear',        label: 'Linear',        desc: 'curves ↔ retas (rizoma)' },
  { key: 'isolation',     label: 'Isolation',     desc: 'interacao total ↔ especies isoladas' },
];

const INTENTIONS: Intention[] = [
  'none',
  'ascension', 'gravity', 'conflict', 'harmony', 'ecstasy', 'silence',
  'mondrian', 'suprematist', 'action', 'minimal', 'glitch', 'botanical', 'constellation',
];

const INTENTION_ICONS: Record<Intention, string> = {
  none: '∅', ascension: '↑', gravity: '↓', conflict: '×', harmony: '◎',
  ecstasy: '⊛', silence: '○', mondrian: '▦', suprematist: '◆',
  action: '✦', minimal: '—', glitch: '⚡', botanical: '❧', constellation: '✦',
};

export const DNAPanel: React.FC<Props> = ({ dna, onDNAChange, onMutate, pinnedDNA }) => {
  const [lockedGenes, setLockedGenes] = useState<Set<keyof DNAGenes>>(new Set());

  const setGene = (key: keyof DNAGenes, value: number) => {
    onDNAChange({ ...dna, genes: { ...dna.genes, [key]: Math.max(0, Math.min(1, value)) } });
  };

  const toggleLock = (key: keyof DNAGenes) => {
    setLockedGenes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleRandomize = () => {
    const genes = { ...dna.genes };
    for (const { key } of GENE_LABELS) {
      if (!lockedGenes.has(key)) {
        if (key !== 'linear') genes[key] = Math.random();
      }
    }
    onDNAChange({ ...dna, genes });
  };

  const handleMutate = () => {
    onMutate(mutateDNA(dna, 0.28, 8));
  };

  const handleCrossbreed = () => {
    if (!pinnedDNA) return;
    const child = crossbreedDNA(dna, pinnedDNA);
    onDNAChange(child);
  };

  const handleIntention = (intention: Intention) => {
    onDNAChange(applyIntention(dna, intention));
  };

  return (
    <div className="flex flex-col gap-0 overflow-y-auto" style={{ background: '#000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px', fontSize: 8, letterSpacing: '0.16em',
        color: ACCENT, textTransform: 'uppercase',
        borderBottom: `1px dashed ${BORDER}`,
      }}>
        RECIPE / DNA
      </div>

      {/* Intention macro */}
      <div style={{ padding: '8px 10px', borderBottom: `1px dashed ${BORDER}` }}>
        <div style={{ fontSize: 7, color: DIM, letterSpacing: '0.14em',
          textTransform: 'uppercase', marginBottom: 5, fontFamily: MONO }}>Intention</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {INTENTIONS.map(int => (
            <button key={int}
              onClick={() => handleIntention(int)}
              title={int}
              style={{
                padding: '2px 6px', borderRadius: 1, fontSize: 8, cursor: 'pointer',
                border: '1px solid',
                fontFamily: MONO,
                borderColor: dna.intention === int ? 'rgba(255,0,132,0.4)' : BORDER,
                background: dna.intention === int ? 'rgba(255,0,132,0.08)' : 'transparent',
                color: dna.intention === int ? BRIGHT : DIM,
                textTransform: 'capitalize',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
              <span style={{ opacity: 0.6 }}>{INTENTION_ICONS[int] ?? '·'}</span>
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Gene knobs */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {GENE_LABELS.map(({ key, label, desc }) => {
          const locked = lockedGenes.has(key);
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <button onClick={() => toggleLock(key)}
                  title={locked ? 'Unlock gene' : 'Lock gene'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: locked ? ACCENT : DIM,
                    fontSize: 8, lineHeight: 1, fontFamily: MONO,
                  }}>
                  {locked ? '■' : '□'}
                </button>
                <span style={{ flex: 1, fontSize: 8, color: MID, letterSpacing: '0.06em', fontFamily: MONO }}>
                  {label}
                </span>
                <span style={{ fontSize: 8, color: DIM, fontFamily: MONO }}>
                  {(dna.genes[key] ?? 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="range" min={0} max={1} step={0.01}
                  value={dna.genes[key] ?? 0}
                  disabled={locked}
                  onChange={e => setGene(key, parseFloat(e.target.value))}
                  style={{
                    flex: 1, cursor: locked ? 'not-allowed' : 'pointer',
                    accentColor: locked ? ACCENT : 'rgba(255,255,255,0.4)',
                    opacity: locked ? 0.4 : 1,
                  }} />
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)', marginTop: 1, fontFamily: MONO }}>{desc}</div>
            </div>
          );
        })}
      </div>

      {/* Quanta count */}
      <div style={{ padding: '6px 10px', borderTop: `1px dashed ${BORDER}` }}>
        <div style={{ fontSize: 7, color: DIM, marginBottom: 5,
          letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO }}>
          Quanta&ensp;
          <span style={{ color: MID }}>
            {dna.quantaCount}
          </span>
        </div>
        <input type="range" min={0} max={3000} step={1}
          value={dna.quantaCount}
          onChange={e => onDNAChange({ ...dna, quantaCount: parseInt(e.target.value) })}
          style={{ width: '100%', cursor: 'pointer', accentColor: ACCENT, marginBottom: 5 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[0, 1, 5, 10, 50, 200, 600, 1500, 3000].map(n => (
            <button key={n}
              onClick={() => onDNAChange({ ...dna, quantaCount: n })}
              style={{
                padding: '2px 5px', borderRadius: 1, fontSize: 7, cursor: 'pointer',
                fontFamily: MONO, letterSpacing: '0.04em',
                border: '1px solid',
                borderColor: dna.quantaCount === n ? 'rgba(255,0,132,0.4)' : BORDER,
                background: dna.quantaCount === n ? 'rgba(255,0,132,0.08)' : 'transparent',
                color: dna.quantaCount === n ? BRIGHT : DIM,
              }}>
              {n === 0 ? 'blank' : n >= 1000 ? `${n/1000}k` : n}
            </button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div style={{ padding: '6px 10px', borderTop: `1px dashed ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
          <div style={{ flex: 1, fontSize: 7, color: DIM,
            letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO }}>Palette</div>
          <button
            onClick={() => onDNAChange({ ...dna, palette: generateRandomPalette(dna.palette.length) })}
            title="Paleta aleatória"
            style={{ fontSize: 7, padding: '2px 7px', borderRadius: 1, cursor: 'pointer',
              border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)',
              color: DIM, letterSpacing: '0.08em', fontFamily: MONO, textTransform: 'uppercase' }}>
            rand
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {dna.palette.map((color, i) => (
            <label key={i} title={color} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <input type="color" value={color}
                onChange={e => {
                  const newPalette = [...dna.palette];
                  newPalette[i] = e.target.value;
                  onDNAChange({ ...dna, palette: newPalette });
                }}
                style={{ width: 22, height: 22, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            </label>
          ))}
          <label title="Background" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 6, color: DIM, marginBottom: 1, fontFamily: MONO }}>BG</span>
            <input type="color" value={dna.background}
              onChange={e => onDNAChange({ ...dna, background: e.target.value })}
              style={{ width: 22, height: 22, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 10px', borderTop: `1px dashed ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={handleRandomize}
          style={actionBtnStyle(false)}>
          RANDOMIZE GENES
        </button>
        <button onClick={handleMutate}
          style={actionBtnStyle(false)}>
          MUTATE (8 VARIANTS)
        </button>
        <button onClick={handleCrossbreed}
          disabled={!pinnedDNA}
          title={pinnedDNA ? `Cross with ${pinnedDNA.name ?? 'pinned'}` : 'No DNA pinned'}
          style={actionBtnStyle(!pinnedDNA)}>
          CROSS {pinnedDNA ? `+ ${pinnedDNA.name?.slice(0, 12) ?? 'pinned'}` : '(PIN ONE FIRST)'}
        </button>
      </div>
    </div>
  );
};

function actionBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 8px', borderRadius: 1, fontSize: 7, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase',
    border: `1px solid ${disabled ? BORDER : 'rgba(255,0,132,0.2)'}`,
    background: disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,0,132,0.05)',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,0,132,0.7)',
    transition: 'all 0.12s',
  };
}
