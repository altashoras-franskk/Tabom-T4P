// ─── Physics Panel — direct physics override sliders ─────────────────────────
import React from 'react';
import type { PhysicsConfig } from '../../sim/metaart/metaArtTypes';
import type { DNA } from '../../sim/metaart/metaArtTypes';

interface Props {
  physics: PhysicsConfig;
  dna: DNA;
  onPhysics: (patch: Partial<PhysicsConfig>) => void;
  onDNAGene: (key: string, val: number) => void;
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

export const PhysicsPanel: React.FC<Props> = ({ physics, dna, onPhysics, onDNAGene }) => {
  const p = physics;
  const g = dna.genes;

  return (
    <div style={sty}>
      {/* Header */}
      <div style={{ fontSize: 8, color: ACCENT, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, fontFamily: MONO }}>
        PHYSICS & BEHAVIOR
      </div>

      {/* ── Interação ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
      </div>

      {/* ── DNA Genes (physics-affecting) ─────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ ...label, color: 'rgba(180,140,255,0.6)', marginBottom: 3 }}>Genes de Movimento</div>
        <SliderRow name="Fluxo" val={g.flow} min={0} max={1} step={0.01}
          color="#80d0ff" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('flow', v)} />
        <SliderRow name="Entropia" val={g.entropy} min={0} max={1} step={0.01}
          color="#ffa080" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('entropy', v)} />
        <SliderRow name="Coerência" val={g.coherence} min={0} max={1} step={0.01}
          color="#80ffb0" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('coherence', v)} />
        <SliderRow name="Fragmentação" val={g.fragmentation} min={0} max={1} step={0.01}
          color="#ffcc60" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('fragmentation', v)} />
        <SliderRow name="Ritmo" val={g.rhythm} min={0} max={1} step={0.01}
          color="#ff80c0" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('rhythm', v)} />
        <SliderRow name="Estrutura" val={g.structure} min={0} max={1} step={0.01}
          color="#c0a0ff" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('structure', v)} />
        <SliderRow name="Erosão" val={g.erosion} min={0} max={1} step={0.01}
          color="#ff9060" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('erosion', v)} />
        <SliderRow name="Isolamento" val={g.isolation ?? 0} min={0} max={1} step={0.01}
          color="#ff6080" fmt={v => v.toFixed(2)} onChange={v => onDNAGene('isolation', v)} />
      </div>

      {/* ── Spatial ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ ...label, color: 'rgba(120,220,160,0.6)', marginBottom: 3 }}>Espacial</div>
        <SliderRow name="Atração Centro" val={p.centerPull} min={0} max={1} step={0.02}
          color="#60ffa0" fmt={v => v.toFixed(2)} onChange={v => onPhysics({ centerPull: v })} />
        <SliderRow name="Rep. Borda" val={p.borderRepulsion} min={0} max={1} step={0.02}
          color="#ff8060" fmt={v => v.toFixed(2)} onChange={v => onPhysics({ borderRepulsion: v })} />
      </div>

      {/* ── Quadrant Mode ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
      </div>

      {/* ── Quick Presets ─────────────────────────────────────────────── */}
      <div>
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
      </div>
    </div>
  );
};