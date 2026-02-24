// ── Music Lab Guide — onboarding overlay ──────────────────────────────────────
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
  title:   string;
  icon:    string;
  color:   string;
  content: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Iniciando',
    icon:  '▶',
    color: '#00d4ff',
    content: (
      <div className="flex flex-col gap-2.5">
        <p className="text-[8px] font-mono text-white/55 leading-relaxed">
          O Music Lab é um <em className="text-cyan-300/80">instrumento generativo</em> — partículas físicas produzem som ao cruzar
          linhas de gate ou serem acionadas pelo sequencer.
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            ['1', 'Clique em', '"▶ Start"', 'no canto superior esquerdo para ativar o áudio.'],
            ['2', 'Use', 'W + clique no canvas', 'para spawnar partículas (bolinhas).'],
            ['3', 'Use', 'E + arraste', 'para desenhar Gate Lines — as bolinhas disparam notas ao cruzar.'],
            ['4', 'Ative o', 'Studio Seq ↓', 'para fazer padrões rítmicos precisos.'],
          ].map(([n, a, b, c]) => (
            <div key={n} className="flex gap-2 items-start">
              <span className="text-[8px] font-mono text-cyan-400/60 flex-shrink-0 w-4 text-right">{n}.</span>
              <p className="text-[7.5px] font-mono text-white/40 leading-relaxed">
                {a} <span className="text-white/75 bg-white/[0.07] px-1 rounded font-mono">{b}</span> {c}
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
      <div className="flex flex-col gap-2.5">
        <p className="text-[8px] font-mono text-white/55 leading-relaxed">
          O <em className="text-green-300/80">Studio Sequencer</em> (painel inferior) é um step sequencer determinístico — toca
          exatamente nos beats que você armar, independente das partículas.
        </p>
        <div className="flex flex-col gap-1.5 bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <div className="text-[6.5px] font-mono uppercase tracking-widest text-green-400/50 mb-0.5">Workflow rápido para 4/4</div>
          {[
            ['Padrões ▾', '→ escolha "4 on 4" para começar'],
            ['Clique nos steps', '→ ative/desative cada célula'],
            ['M = mute, S = solo', '→ controle quais roles tocam'],
            ['BPM no topo', '→ ajuste o tempo global'],
          ].map(([a, b]) => (
            <div key={a} className="flex gap-1.5 items-start">
              <span className="text-[6.5px] font-mono text-white/60 bg-white/[0.06] rounded px-1 py-px flex-shrink-0">{a}</span>
              <span className="text-[6.5px] font-mono text-white/30">{b}</span>
            </div>
          ))}
        </div>
        <p className="text-[7px] font-mono text-white/30 leading-relaxed">
          Dica: use <span className="text-white/55">KICK + BASS no beat 1</span>, <span className="text-white/55">PERC no beat 3</span>,
          e <span className="text-white/55">ARP nos off-beats</span> para groove natural.
        </p>
      </div>
    ),
  },
  {
    title: 'Timbres',
    icon:  '⊿',
    color: '#ff8c00',
    content: (
      <div className="flex flex-col gap-2.5">
        <p className="text-[8px] font-mono text-white/55 leading-relaxed">
          Cada partícula tem um <em className="text-orange-300/80">timbre individual</em>. O painel direito (aba Timbre)
          controla o som por role.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ['Sub Bass ◉',  'Sine filtrado → graves profundos'],
            ['Acid 303 ⌇',  'Sawtooth+Q alto → clássico acid'],
            ['Hard Kick ●', 'Kick sintético → percussão'],
            ['FM Bell ∆',   'Triangle+bandpass → brilhante'],
            ['Saw Lead ⊿',  'Sawtooth → melodias agressivas'],
            ['Warm Pad ~',  'Attack longo → atmosfera'],
            ['Glitch ⌗',    'Square+gate → eletrônico'],
            ['Hi-Hat ×',    'Highpass noise → chapas'],
          ].map(([name, desc]) => (
            <div key={name} className="bg-white/[0.03] rounded px-2 py-1.5 border border-white/[0.05]">
              <div className="text-[7px] font-mono text-white/65">{name}</div>
              <div className="text-[5.5px] font-mono text-white/28 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        <p className="text-[7px] font-mono text-white/30 leading-relaxed">
          Selecione uma partícula com <span className="text-white/55">Q</span> para trocar o timbre individualmente.
          Use o painel Timbre (→) para editar o timbre de toda uma role.
        </p>
      </div>
    ),
  },
  {
    title: 'Escalas e Melodia',
    icon:  '♪',
    color: '#9b59ff',
    content: (
      <div className="flex flex-col gap-2.5">
        <p className="text-[8px] font-mono text-white/55 leading-relaxed">
          Todas as notas são <em className="text-purple-300/80">quantizadas automaticamente</em> para a escala do preset.
          O Studio Seq usa a escala para gerar arpejos e melodias coerentes.
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="text-[6.5px] font-mono uppercase tracking-widest text-purple-400/50 mb-0.5">Como os pitches funcionam</div>
          {[
            ['KICK / PERC', 'Pitch fixo — apenas ritmo'],
            ['BASS',        'Nota raiz da escala (root)'],
            ['LEAD',        'Cicla pelos graus da escala'],
            ['ARP',         'Arpejo rápido na escala ativa'],
            ['PAD / STRINGS','Nota raiz + cores harmônicas'],
          ].map(([role, desc]) => (
            <div key={role} className="flex gap-2 items-center">
              <span className="text-[6px] font-mono text-white/50 bg-white/[0.06] rounded px-1.5 py-px w-24 flex-shrink-0 text-center">{role}</span>
              <span className="text-[6.5px] font-mono text-white/30">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[7px] font-mono text-white/30 leading-relaxed">
          Mude a escala escolhendo outro preset — cada um tem root + escala diferente
          (minor, dorian, pentatonic, lydian…).
        </p>
      </div>
    ),
  },
  {
    title: 'Q. Sequencer',
    icon:  'ψ',
    color: '#cc44ff',
    content: (
      <div className="flex flex-col gap-2.5">
        <p className="text-[8px] font-mono text-white/55 leading-relaxed">
          O <em className="text-purple-300/80">Quantum Sequencer</em> (painel esquerdo) é um anel giratório no canvas.
          É probabilístico — dispara notas das partículas mais próximas de cada step.
        </p>
        <div className="flex flex-col gap-1.5 bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <div className="text-[6.5px] font-mono uppercase tracking-widest text-purple-400/50 mb-0.5">Uso ideal</div>
          {[
            'Use o Studio Seq para o ritmo (kick, bass, perc)',
            'Use o Q.Seq para melodias emergentes (lead, arp)',
            'Varie posição e raio do anel para texturas diferentes',
            'Steps armados + partículas perto = notas',
            'Sem partícula perto = silêncio (incerteza quântica)',
          ].map((t, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="text-[6px] font-mono text-purple-400/40 flex-shrink-0">{i + 1}.</span>
              <span className="text-[6.5px] font-mono text-white/35 leading-snug">{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Atalhos',
    icon:  '⌨',
    color: '#00e5ff',
    content: (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {[
          ['Q', 'Select (timbre individual)'],
          ['W', 'Spawn partículas'],
          ['E', 'Gate Line (triggers)'],
          ['R', 'Attractor'],
          ['T', 'Repulsor'],
          ['Y', 'Vortex'],
          ['U', 'Excite (acelera)'],
          ['I', 'Freeze (desacelera)'],
          ['O', 'Mutate (troca role)'],
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
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[6.5px] font-mono text-white/60 bg-white/[0.08] rounded px-1.5 py-px min-w-[20px] text-center flex-shrink-0">{key}</span>
            <span className="text-[6.5px] font-mono text-white/30">{desc}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-[560px] max-w-[96vw] rounded-xl border border-white/[0.09] overflow-hidden shadow-2xl"
        style={{ background: '#060912' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="text-base" style={{ color: step.color }}>{step.icon}</span>
            <div>
              <div className="text-[6px] font-mono uppercase tracking-widest text-white/25">Guia · {page + 1}/{STEPS.length}</div>
              <div className="text-[10px] font-mono" style={{ color: step.color + 'dd' }}>{step.title}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors"><X size={13}/></button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 px-5 pt-3">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setPage(i)}
              className="transition-all rounded-full"
              style={{
                width:   i === page ? 20 : 7,
                height:  7,
                background: i === page ? step.color : i < page ? step.color + '44' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 min-h-[200px]">
          {step.content}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <button onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 text-[7.5px] font-mono uppercase tracking-widest transition-all disabled:opacity-0"
            style={{ color: step.color + '88' }}>
            <ChevronLeft size={10}/> Anterior
          </button>
          {page < STEPS.length - 1 ? (
            <button onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[7.5px] font-mono uppercase tracking-widest transition-all"
              style={{ borderColor: step.color + '55', color: step.color, background: step.color + '0f' }}>
              Próximo <ChevronRight size={10}/>
            </button>
          ) : (
            <button onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[7.5px] font-mono uppercase tracking-widest transition-all"
              style={{ borderColor: step.color + '55', color: step.color, background: step.color + '0f' }}>
              Começar ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
