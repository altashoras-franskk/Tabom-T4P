// ── Music Lab Guide — onboarding overlay ──────────────────────────────────────
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

interface Step {
  title:   string;
  icon:    string;
  color:   string;
  content: React.ReactNode;
}

const sLabel: React.CSSProperties = { fontFamily: MONO, fontSize: 7, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.50)' };
const sHint: React.CSSProperties  = { fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.30)', lineHeight: 1.7 };
const sKey: React.CSSProperties   = { fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', border: '1px dashed rgba(255,255,255,0.08)' };
const sSection: React.CSSProperties = { padding: '8px 10px', border: '1px dashed rgba(255,255,255,0.05)' };

const STEPS: Step[] = [
  {
    title: 'Iniciando',
    icon:  '◈',
    color: ACCENT,
    content: (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <p style={{...sHint,fontSize:8,color:'rgba(255,255,255,0.45)'}}>
          O Music Lab é um <em style={{color:`${ACCENT}cc`,fontStyle:'normal'}}>instrumento generativo</em> — partículas físicas produzem som ao cruzar
          linhas de gate ou serem acionadas pelo sequencer.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {[
            ['1', 'Clique em', '▶ Start', 'no topo para ativar o áudio.'],
            ['2', 'Use', 'W + clique', 'para spawnar partículas.'],
            ['3', 'Use', 'E + arraste', 'para desenhar Gate Lines.'],
            ['4', 'Ative o', 'Studio Seq ↓', 'para padrões rítmicos.'],
          ].map(([n, a, b, c]) => (
            <div key={n} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
              <span style={{fontFamily:MONO,fontSize:8,color:`${ACCENT}66`,width:14,textAlign:'right',flexShrink:0}}>{n}.</span>
              <p style={sHint}>
                {a} <span style={sKey}>{b}</span> {c}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Ritmo 4/4',
    icon:  '♩',
    color: '#39ff70',
    content: (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <p style={{...sHint,fontSize:8,color:'rgba(255,255,255,0.45)'}}>
          O <em style={{color:'rgba(57,255,112,0.75)',fontStyle:'normal'}}>Studio Sequencer</em> (painel inferior) é um step sequencer determinístico —
          toca exatamente nos beats que você armar.
        </p>
        <div style={sSection}>
          <div style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',color:'rgba(57,255,112,0.35)',marginBottom:6}}>Workflow rápido</div>
          {[
            ['Padrões ▾', '→ escolha "4 on 4" para começar'],
            ['Clique nos steps', '→ ative/desative cada célula'],
            ['M = mute, S = solo', '→ controle quais roles tocam'],
            ['BPM no topo', '→ ajuste o tempo global'],
          ].map(([a, b]) => (
            <div key={a} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:4}}>
              <span style={sKey}>{a}</span>
              <span style={sHint}>{b}</span>
            </div>
          ))}
        </div>
        <p style={sHint}>
          Dica: use <span style={{color:'rgba(255,255,255,0.50)'}}>KICK + BASS no beat 1</span>, <span style={{color:'rgba(255,255,255,0.50)'}}>PERC no 3</span>,
          e <span style={{color:'rgba(255,255,255,0.50)'}}>ARP nos off-beats</span>.
        </p>
      </div>
    ),
  },
  {
    title: 'Timbres',
    icon:  '⊿',
    color: '#ff8c00',
    content: (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <p style={{...sHint,fontSize:8,color:'rgba(255,255,255,0.45)'}}>
          Cada partícula tem um <em style={{color:'rgba(255,140,0,0.75)',fontStyle:'normal'}}>timbre individual</em>. O painel direito (aba Timbre)
          controla o som por role.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
          {[
            ['Sub Bass ◉',  'Sine → graves profundos'],
            ['Acid 303 ⌇',  'Sawtooth → acid clássico'],
            ['Hard Kick ●', 'Kick sintético → percussão'],
            ['FM Bell ∆',   'Triangle → brilhante'],
            ['Saw Lead ⊿',  'Sawtooth → melodias'],
            ['Warm Pad ~',  'Attack longo → atmosfera'],
            ['Glitch ⌗',    'Square → eletrônico'],
            ['Hi-Hat ×',    'Highpass → chapas'],
          ].map(([name, desc]) => (
            <div key={name} style={{...sSection,padding:'6px 8px'}}>
              <div style={{fontFamily:MONO,fontSize:7,color:'rgba(255,255,255,0.55)'}}>{name}</div>
              <div style={{fontFamily:MONO,fontSize:6,color:'rgba(255,255,255,0.22)',marginTop:2}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Escalas e Melodia',
    icon:  '♪',
    color: '#9b59ff',
    content: (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <p style={{...sHint,fontSize:8,color:'rgba(255,255,255,0.45)'}}>
          Todas as notas são <em style={{color:'rgba(155,89,255,0.75)',fontStyle:'normal'}}>quantizadas automaticamente</em> para a escala do preset.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:5}}>
          <div style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',color:'rgba(155,89,255,0.35)',marginBottom:2}}>Pitches por role</div>
          {[
            ['KICK / PERC', 'Pitch fixo — apenas ritmo'],
            ['BASS',        'Nota raiz da escala'],
            ['LEAD',        'Cicla pelos graus da escala'],
            ['ARP',         'Arpejo rápido na escala ativa'],
            ['PAD / STRINGS','Nota raiz + cores harmônicas'],
          ].map(([role, desc]) => (
            <div key={role} style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{...sKey,width:80,textAlign:'center',flexShrink:0,fontSize:6}}>{role}</span>
              <span style={sHint}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Quantum Sequencer',
    icon:  'ψ',
    color: '#cc44ff',
    content: (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <p style={{...sHint,fontSize:8,color:'rgba(255,255,255,0.45)'}}>
          O <em style={{color:'rgba(204,68,255,0.75)',fontStyle:'normal'}}>Quantum Sequencer</em> é um anel giratório no canvas.
          Probabilístico — dispara notas das partículas mais próximas.
        </p>
        <div style={sSection}>
          <div style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',color:'rgba(204,68,255,0.35)',marginBottom:6}}>Uso ideal</div>
          {[
            'Studio Seq para ritmo (kick, bass, perc)',
            'Q.Seq para melodias emergentes (lead, arp)',
            'Varie posição e raio do anel',
            'Steps armados + partículas perto = notas',
            'Sem partícula perto = silêncio',
          ].map((t, i) => (
            <div key={i} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:3}}>
              <span style={{fontFamily:MONO,fontSize:6,color:'rgba(204,68,255,0.35)',flexShrink:0}}>{i + 1}.</span>
              <span style={sHint}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Atalhos',
    icon:  '⌨',
    color: ACCENT,
    content: (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px'}}>
        {[
          ['Q', 'Select'],
          ['W', 'Spawn partículas'],
          ['E', 'Gate Line'],
          ['A', 'Attractor'],
          ['T', 'Repulsor'],
          ['Y', 'Vortex'],
          ['U', 'Excite'],
          ['I', 'Freeze'],
          ['O', 'Mutate'],
          ['P', 'Erase'],
          ['1', 'Q.Channel'],
          ['2', 'Gravity Rail'],
          ['3', 'Q.Tunnel'],
          ['4', 'Mirror'],
          ['5', 'Absorber'],
          ['6', 'Membrane'],
          ['Space', 'Play / Pause'],
          ['Del', 'Deletar selecionado'],
        ].map(([key, desc]) => (
          <div key={key} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{...sKey,minWidth:20,textAlign:'center',flexShrink:0}}>{key}</span>
            <span style={sHint}>{desc}</span>
          </div>
        ))}
      </div>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
interface MusicGuideProps { onClose: () => void; }
export const MusicGuide: React.FC<MusicGuideProps> = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const step = STEPS[page];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{background:'rgba(0,0,0,0.85)'}}
      onClick={onClose}>
      <div style={{width:560,maxWidth:'96vw',background:'rgba(0,0,0,0.96)',border:'1px dashed rgba(255,255,255,0.06)',overflow:'hidden'}}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px dashed rgba(255,255,255,0.05)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{ fontSize: 14, color: step.color + '88' }}>{step.icon}</span>
            <div>
              <div style={{fontFamily:MONO,fontSize:7,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.20)'}}>Guia · {page + 1}/{STEPS.length}</div>
              <div style={{fontFamily:DOTO,fontSize:11,color: step.color + 'cc',letterSpacing:'0.04em'}}>{step.title}</div>
            </div>
          </div>
          <button onClick={onClose} style={{color:'rgba(255,255,255,0.20)'}} className="hover:opacity-70 transition-opacity"><X size={13}/></button>
        </div>

        {/* Dots */}
        <div style={{display:'flex',alignItems:'center',gap:4,padding:'12px 20px 0'}}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className="transition-all"
              style={{
                width:   i === page ? 18 : 6,
                height:  3,
                background: i === page ? step.color + '88' : i < page ? step.color + '30' : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{padding:'16px 20px',minHeight:200}}>
          {step.content}
        </div>

        {/* Footer nav */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderTop:'1px dashed rgba(255,255,255,0.04)'}}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 transition-all disabled:opacity-0"
            style={{fontFamily:MONO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',color: step.color + '66'}}>
            <ChevronLeft size={10}/> Anterior
          </button>
          {page < STEPS.length - 1 ? (
            <button onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 transition-all"
              style={{fontFamily:MONO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',padding:'4px 12px',color:step.color,background:step.color+'0a',border:`1px dashed ${step.color}30`}}>
              Próximo <ChevronRight size={10}/>
            </button>
          ) : (
            <button onClick={onClose}
              className="flex items-center gap-1 transition-all"
              style={{fontFamily:MONO,fontSize:8,letterSpacing:'0.10em',textTransform:'uppercase',padding:'4px 12px',color:step.color,background:step.color+'0a',border:`1px dashed ${step.color}30`}}>
              Começar ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
