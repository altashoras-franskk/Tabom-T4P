// ─── Physics Panel — physics + DNA controls (single source) ─────────────────
import React, { useState } from 'react';
import type { PhysicsConfig, DNA, DNAGenes, Intention } from '../../sim/metaart/metaArtTypes';
import { applyIntention, generateRandomPalette } from '../../sim/metaart/metaArtDNA';
import { mutateDNA, crossbreedDNA } from '../../sim/metaart/metaArtMutations';

interface Props {
  physics: PhysicsConfig;
  dna: DNA;
  onPhysics: (patch: Partial<PhysicsConfig>) => void;
  onDNAGene: (key: string, val: number) => void;
  onDNAChange: (dna: DNA) => void;
  onMutate: (variants: DNA[]) => void;
  pinnedDNA: DNA | null;
}

const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ff0084';
const DIM_C = 'rgba(255,255,255,0.28)';
const BORDER_C = 'rgba(255,255,255,0.06)';

const label: React.CSSProperties = {
  fontSize: 7, color: DIM_C, letterSpacing: '0.12em',
  textTransform: 'uppercase', marginBottom: 1, fontFamily: MONO,
};

const sty: React.CSSProperties = {
  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
  fontFamily: MONO, color: 'rgba(255,255,255,0.75)',
  overflowY: 'auto', background: '#000',
};

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
  { key: 'isolation',     label: 'Isolation',     desc: 'interação total ↔ espécies isoladas' },
];

const INTENTIONS: Intention[] = [
  'none', 'ascension', 'gravity', 'conflict', 'harmony', 'ecstasy', 'silence',
  'mondrian', 'suprematist', 'action', 'minimal', 'glitch', 'botanical', 'constellation',
];

function SliderRow({
  name, val, min, max, step, color = '#60b0ff',
  fmt, onChange,
}: {
  name: string; val: number; min: number; max: number; step: number;
  color?: string; fmt?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...label, width: 72, marginBottom: 0, textAlign: 'right' }}>{name}</span>
      <input
        type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, cursor: 'pointer', accentColor: color }}
      />
      <span style={{ fontSize: 7, color: DIM_C, fontFamily: MONO, minWidth: 32, textAlign: 'right' }}>
        {fmt ? fmt(val) : val.toFixed(2)}
      </span>
    </div>
  );
}

function ToggleRow({
  name, val, color = '#ff8060', onChange,
}: { name: string; val: boolean; color?: string; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
      <span style={{ ...label, marginBottom: 0, width: 72, textAlign: 'right' }}>{name}</span>
      <button
        onClick={() => onChange(!val)}
        style={{
          flex: 1, fontSize: 8, padding: '3px 0', borderRadius: 3, cursor: 'pointer',
          background: val ? `${color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${val ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
          color: val ? color : 'rgba(255,255,255,0.28)',
          fontFamily: 'monospace',
        }}>
        {val ? '● ON' : '○ OFF'}
      </button>
    </div>
  );
}

export const PhysicsPanel: React.FC<Props> = ({
  physics, dna, onPhysics, onDNAGene, onDNAChange, onMutate, pinnedDNA,
}) => {
  const p = physics;
  const [open, setOpen] = useState<Record<string, boolean>>({
    interaction: true,
    genes: true,
    spatial: false,
    quadrants: false,
    dna: true,
    presets: false,
  });
  const [lockedGenes, setLockedGenes] = useState<Set<keyof DNAGenes>>(new Set());

  const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleLock = (key: keyof DNAGenes) => {
    setLockedGenes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleRandomizeGenes = () => {
    const genes = { ...dna.genes };
    for (const { key } of GENE_LABELS) {
      if (!lockedGenes.has(key) && key !== 'linear') genes[key] = Math.random();
    }
    onDNAChange({ ...dna, genes });
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div style={{ border: `1px solid ${BORDER_C}`, borderRadius: 3, overflow: 'hidden' }}>
      <button onClick={() => toggle(id)} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'rgba(255,255,255,0.02)', border: 'none',
        color: 'rgba(255,255,255,0.65)', fontSize: 8,
        letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO,
        padding: '7px 8px',
      }}>
        {open[id] ? '▾ ' : '▸ '}{title}
      </button>
      {open[id] && <div style={{ padding: '8px' }}>{children}</div>}
    </div>
  );

  return (
    <div style={sty}>
      {/* Header */}
      <div style={{ fontSize: 8, color: ACCENT, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, fontFamily: MONO }}>
        PHYSICS & BEHAVIOR
      </div>

      <Section id="interaction" title="Interação">
        <div style={{ ...label, color: 'rgba(100,180,255,0.6)', marginBottom: 3 }}>Interação PL</div>
        <SliderRow name="Raio Max" val={p.rMaxMul} min={0.3} max={3.0} step={0.05}
          color="#60b0ff" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ rMaxMul: v })} />
        <SliderRow name="Raio Min" val={p.rMinMul} min={0.3} max={3.0} step={0.05}
          color="#80c0ff" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ rMinMul: v })} />
        <SliderRow name="Força" val={p.forceMul} min={0.05} max={5.0} step={0.05}
          color="#ff9060" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ forceMul: v })} />
        <SliderRow name="Amortec." val={p.dampingMul} min={0.3} max={1.5} step={0.02}
          color="#a0d0ff" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ dampingMul: v })} />
        <SliderRow name="Velocidade" val={p.maxSpeedMul} min={0.1} max={5.0} step={0.05}
          color="#60ffa0" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ maxSpeedMul: v })} />
        <SliderRow name="Ruído" val={p.noiseMul} min={0.0} max={5.0} step={0.05}
          color="#ffaa60" fmt={v => v.toFixed(2) + 'x'} onChange={v => onPhysics({ noiseMul: v })} />
      </Section>

      <Section id="genes" title="Genes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GENE_LABELS.map(({ key, label: nm, desc }) => {
            const locked = lockedGenes.has(key);
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <button onClick={() => toggleLock(key)} style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: locked ? ACCENT : DIM_C, fontSize: 8, fontFamily: MONO, padding: 0,
                  }}>{locked ? '■' : '□'}</button>
                  <span style={{ ...label, marginBottom: 0, flex: 1 }}>{nm}</span>
                  <span style={{ fontSize: 7, color: DIM_C }}>{(dna.genes[key] ?? 0).toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.01}
                  disabled={locked}
                  value={dna.genes[key] ?? 0}
                  onChange={e => onDNAGene(key, parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: locked ? 'not-allowed' : 'pointer', accentColor: '#c0a0ff', opacity: locked ? 0.4 : 1 }} />
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.18)', marginTop: 1 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="spatial" title="Espacial">
        <div style={{ ...label, color: 'rgba(120,220,160,0.6)', marginBottom: 3 }}>Espacial</div>
        <SliderRow name="Atração Centro" val={p.centerPull} min={0} max={1} step={0.02}
          color="#60ffa0" fmt={v => v.toFixed(2)} onChange={v => onPhysics({ centerPull: v })} />
        <SliderRow name="Rep. Borda" val={p.borderRepulsion} min={0} max={1} step={0.02}
          color="#ff8060" fmt={v => v.toFixed(2)} onChange={v => onPhysics({ borderRepulsion: v })} />
      </Section>

      <Section id="quadrants" title="Quadrantes">
        <div style={{ ...label, color: 'rgba(255,180,80,0.6)', marginBottom: 3 }}>Quadrantes</div>
        <ToggleRow name="Modo Quad." val={p.quadrantMode} color="#ffaa40"
          onChange={v => onPhysics({ quadrantMode: v })} />
        {p.quadrantMode && (
          <SliderRow name="Força Quad." val={p.quadrantStrength} min={0} max={1} step={0.02}
            color="#ffaa40" fmt={v => v.toFixed(2)} onChange={v => onPhysics({ quadrantStrength: v })} />
        )}
        {p.quadrantMode && (
          <div style={{
            fontSize: 7, color: 'rgba(255,180,80,0.4)', lineHeight: 1.5,
            background: 'rgba(255,140,0,0.06)', borderRadius: 4, padding: '5px 8px',
          }}>
            <b>Esp. 0</b> → ↖ TL · <b>1</b> → ↗ TR · <b>2</b> → ↙ BL<br />
            <b>3</b> → ↘ BR · <b>4</b> → ↑ Top · <b>5</b> → ↓ Bot<br />
            Combine com Isolamento &gt; 0.5 para segregação total.
          </div>
        )}
      </Section>

      <Section id="dna" title="DNA / Recipe">
        <div style={{ ...label, marginBottom: 5 }}>Intention</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
          {INTENTIONS.map(int => (
            <button key={int} onClick={() => onDNAChange(applyIntention(dna, int))}
              style={{
                padding: '2px 6px', borderRadius: 2, cursor: 'pointer', fontSize: 7, textTransform: 'capitalize',
                border: `1px solid ${dna.intention === int ? 'rgba(255,0,132,0.45)' : BORDER_C}`,
                background: dna.intention === int ? 'rgba(255,0,132,0.08)' : 'transparent',
                color: dna.intention === int ? 'rgba(255,255,255,0.85)' : DIM_C,
              }}>
              {int}
            </button>
          ))}
        </div>

        <div style={{ ...label, marginBottom: 3 }}>Quanta</div>
        <input type="range" min={0} max={3000} step={1}
          value={dna.quantaCount}
          onChange={e => onDNAChange({ ...dna, quantaCount: parseInt(e.target.value, 10) })}
          style={{ width: '100%', cursor: 'pointer', accentColor: ACCENT, marginBottom: 6 }} />

        <div style={{ ...label, marginBottom: 3 }}>Palette</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {dna.palette.map((color, i) => (
            <input key={i} type="color" value={color}
              onChange={e => {
                const next = [...dna.palette];
                next[i] = e.target.value;
                onDNAChange({ ...dna, palette: next });
              }}
              style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} />
          ))}
          <input type="color" value={dna.background}
            onChange={e => onDNAChange({ ...dna, background: e.target.value })}
            style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} />
          <button onClick={() => onDNAChange({ ...dna, palette: generateRandomPalette(dna.palette.length) })}
            style={{ padding: '2px 6px', borderRadius: 2, cursor: 'pointer', fontSize: 7, border: `1px solid ${BORDER_C}`, background: 'rgba(255,255,255,0.03)', color: DIM_C }}>
            RAND
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={handleRandomizeGenes} style={{ padding: '5px 7px', textAlign: 'left', borderRadius: 2, cursor: 'pointer', border: `1px solid ${BORDER_C}`, background: 'rgba(255,255,255,0.03)', color: DIM_C, fontSize: 8 }}>Randomize Genes</button>
          <button onClick={() => onMutate(mutateDNA(dna, 0.28, 8))} style={{ padding: '5px 7px', textAlign: 'left', borderRadius: 2, cursor: 'pointer', border: `1px solid ${BORDER_C}`, background: 'rgba(255,255,255,0.03)', color: DIM_C, fontSize: 8 }}>Mutate (8 variants)</button>
          <button
            disabled={!pinnedDNA}
            onClick={() => pinnedDNA && onDNAChange(crossbreedDNA(dna, pinnedDNA))}
            style={{ padding: '5px 7px', textAlign: 'left', borderRadius: 2, cursor: pinnedDNA ? 'pointer' : 'not-allowed', border: `1px solid ${BORDER_C}`, background: 'rgba(255,255,255,0.03)', color: pinnedDNA ? DIM_C : 'rgba(255,255,255,0.15)', fontSize: 8 }}>
            Crossbreed {pinnedDNA ? `+ ${(pinnedDNA.name ?? 'pinned').slice(0, 12)}` : '(pin first)'}
          </button>
        </div>
      </Section>

      <Section id="presets" title="Presets Rápidos">
        <div style={{ ...label, marginBottom: 6, color: 'rgba(255,255,255,0.35)' }}>Presets Rápidos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            {
              name: 'Equilibrado', desc: 'Física neutra, boa para explorar',
              apply: () => onPhysics({ rMaxMul:1.0, forceMul:1.0, dampingMul:1.0, noiseMul:1.0, maxSpeedMul:1.0, rMinMul:1.0, borderRepulsion:0.25, centerPull:0 }),
            },
            {
              name: 'Atração Lenta', desc: 'Clusters lentos e estáveis',
              apply: () => onPhysics({ rMaxMul:1.5, forceMul:0.5, dampingMul:1.3, noiseMul:0.3, maxSpeedMul:0.4, rMinMul:0.8, borderRepulsion:0.4 }),
            },
            {
              name: 'Explosivo', desc: 'Agentes rápidos e caóticos',
              apply: () => onPhysics({ rMaxMul:0.8, forceMul:3.0, dampingMul:0.7, noiseMul:2.5, maxSpeedMul:3.5, rMinMul:1.2, borderRepulsion:0.3 }),
            },
            {
              name: 'Bolhas', desc: 'Espécies em clusters segregados',
              apply: () => onPhysics({ rMaxMul:1.2, forceMul:1.8, dampingMul:1.1, noiseMul:0.5, maxSpeedMul:0.8, rMinMul:0.6, borderRepulsion:0.5, centerPull:0.2 }),
            },
            {
              name: 'Quadrantes ON', desc: 'Cada espécie no seu território',
              apply: () => onPhysics({ quadrantMode:true, quadrantStrength:0.7, borderRepulsion:0.4 }),
            },
          ].map(preset => (
            <button key={preset.name}
              onClick={preset.apply}
              style={{
                textAlign: 'left', padding: '5px 7px', borderRadius: 4, cursor: 'pointer',
                background: 'rgba(60,120,200,0.07)', border: '1px solid rgba(80,150,255,0.15)',
                color: 'rgba(180,210,255,0.8)', fontSize: 8,
              }}>
              <div style={{ fontWeight: 600, marginBottom: 1 }}>{preset.name}</div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>{preset.desc}</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};