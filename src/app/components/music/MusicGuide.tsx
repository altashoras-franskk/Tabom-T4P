// ── Music Lab — Interactive Journey Guide ──────────────────────────────────────
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

interface Step {
  title:    string;
  chapter:  string;
  icon:     string;
  color:    string;
  content:  React.ReactNode;
}

const sHint: React.CSSProperties  = { fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.32)', lineHeight: 1.8 };
const sKey: React.CSSProperties   = { fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.58)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', border: '1px dashed rgba(255,255,255,0.08)', whiteSpace: 'nowrap' as const };
const sSection: React.CSSProperties = { padding: '8px 10px', border: '1px dashed rgba(255,255,255,0.05)', marginTop: 4 };
const sDim: React.CSSProperties  = { fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', lineHeight: 1.8 };
const sChapter: React.CSSProperties = { fontFamily: DOTO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase' as const, marginBottom: 6 };

const Em = ({ c, children }: { c: string; children: React.ReactNode }) => (
  <em style={{ color: `${c}cc`, fontStyle: 'normal', fontWeight: 500 }}>{children}</em>
);

const Key = ({ children }: { children: React.ReactNode }) => (
  <span style={sKey}>{children}</span>
);

const Grid2 = ({ items }: { items: [string, string][] }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
    {items.map(([name, desc]) => (
      <div key={name} style={{ ...sSection, padding: '5px 8px' }}>
        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.55)' }}>{name}</div>
        <div style={sDim}>{desc}</div>
      </div>
    ))}
  </div>
);

const Numbered = ({ items, color }: { items: string[]; color: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {items.map((t, i) => (
      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: `${color}55`, width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
        <p style={sHint}>{t}</p>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const STEPS: Step[] = [
  // ── 01. WELCOME ────────────────────────────────────────────────────────────
  {
    title: 'O que é o Music Lab?',
    chapter: 'Conceito',
    icon: '◈',
    color: ACCENT,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
          O Music Lab é um <Em c={ACCENT}>instrumento generativo sinestésico</Em>.
          Partículas com propriedades musicais (pitch, role, charge) circulam num espaço físico e <em style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.50)' }}>produzem som ao interagir com o ambiente</em>.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: `${ACCENT}44` }}>Princípios</div>
          <Numbered color={ACCENT} items={[
            'Cada partícula tem um ROLE (KICK, BASS, LEAD, PAD, ARP, etc.) que define seu timbre.',
            'Gate Lines são "linhas de disparo" — quando uma partícula cruza uma, ela emite uma nota.',
            'A posição, velocidade e energia da partícula influenciam o pitch, o volume e o timbre.',
            'Nada é pré-programado. A música emerge da física e da topologia do espaço.',
          ]} />
        </div>
        <p style={sDim}>
          Resultado: composições que nunca se repetem, mas mantêm coerência harmônica.
        </p>
      </div>
    ),
  },

  // ── 02. FIRST SOUND ────────────────────────────────────────────────────────
  {
    title: 'Primeiro Som',
    chapter: 'Passo a passo',
    icon: '▶',
    color: '#4ade80',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
          Em <Em c='#4ade80'>3 ações</Em> você terá som. Siga a ordem:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['1', Key({ children: '▶ Start' }), 'no topo da toolbar ativa o áudio e inicia a simulação.'],
            ['2', Key({ children: 'E + arraste' }), 'desenha Gate Lines no canvas — as linhas que disparam notas quando cruzadas.'],
            ['3', Key({ children: 'W + clique' }), 'spawna partículas. Elas vão se mover e colidir com os gates, produzindo som.'],
          ].map(([n, el, txt]) => (
            <div key={String(n)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: DOTO, fontSize: 14, color: '#4ade8044', width: 22, textAlign: 'right', flexShrink: 0, lineHeight: '1.1' }}>{n}</span>
              <div>
                <div style={{ ...sHint, fontSize: 7.5, color: 'rgba(255,255,255,0.40)' }}>
                  {el} {txt}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...sSection, borderColor: 'rgba(74,222,128,0.12)' }}>
          <div style={{ ...sChapter, color: 'rgba(74,222,128,0.35)' }}>Dica</div>
          <p style={sHint}>
            Desenhe <span style={{ color: 'rgba(255,255,255,0.50)' }}>2-3 gate lines cruzadas</span> pelo centro — quanto mais caminhos, mais variação sonora.
            Partículas com <span style={{ color: 'rgba(255,255,255,0.50)' }}>roles diferentes</span> produzem sons diferentes ao cruzar os mesmos gates.
          </p>
        </div>
      </div>
    ),
  },

  // ── 03. TOOLS ──────────────────────────────────────────────────────────────
  {
    title: 'Ferramentas',
    chapter: 'Canvas Tools',
    icon: '⚒',
    color: '#00d4ff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          A barra lateral esquerda tem <Em c='#00d4ff'>20 ferramentas</Em>.
          Cada uma modifica o espaço de forma diferente.
        </p>
        <div style={{ ...sChapter, color: 'rgba(0,212,255,0.35)', marginTop: 4 }}>Essenciais</div>
        <Grid2 items={[
          ['Q — Select', 'Clique/arraste para selecionar partículas.'],
          ['W — Spawn', 'Cria novas partículas no clique.'],
          ['E — Gate Line', 'Desenha linhas que disparam notas.'],
          ['P — Erase', 'Remove partículas e objetos.'],
        ]} />
        <div style={{ ...sChapter, color: 'rgba(0,212,255,0.35)', marginTop: 6 }}>Forças</div>
        <Grid2 items={[
          ['A — Attractor', 'Campo gravitacional que puxa partículas.'],
          ['T — Repulsor', 'Empurra partículas para longe.'],
          ['Y — Vortex', 'Redemoinho que gira partículas.'],
          ['U — Excite', 'Aumenta energia/carga das partículas.'],
          ['I — Freeze', 'Diminui velocidade e carga.'],
          ['O — Mutate', 'Muda o role (timbre) de uma partícula.'],
        ]} />
      </div>
    ),
  },

  // ── 04. QUANTUM TOOLS ──────────────────────────────────────────────────────
  {
    title: 'Quantum Powers',
    chapter: 'Advanced Tools',
    icon: 'ψ',
    color: '#cc44ff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          Ferramentas avançadas que criam <Em c='#cc44ff'>topologias complexas</Em> no espaço.
        </p>
        <div style={{ ...sChapter, color: 'rgba(204,68,255,0.35)', marginTop: 4 }}>Quântico</div>
        <Grid2 items={[
          ['1 — Q.Channel', 'Pinte "vento" direcional — guia partículas.'],
          ['2 — G.Rail', 'Trilho magnético que atrai partículas.'],
          ['3 — Q.Tunnel', 'Portal: entrada A → saída B.'],
        ]} />
        <div style={{ ...sChapter, color: 'rgba(204,68,255,0.35)', marginTop: 6 }}>Barreiras</div>
        <Grid2 items={[
          ['4 — Mirror', 'Reflete partículas como um espelho.'],
          ['5 — Absorber', 'Absorve e destrói partículas.'],
          ['6 — Membrane', 'Semi-permeável: passa às vezes.'],
        ]} />
        <div style={{ ...sChapter, color: 'rgba(204,68,255,0.35)', marginTop: 6 }}>Instrumentos</div>
        <Grid2 items={[
          ['7 — Cage', 'Cerca que prende partículas dentro.'],
          ['8 — H.String', 'Corda harmônica que vibra.'],
          ['9 — FX Zone', 'Zona pintada com efeito especial.'],
          ['0 — Metro', 'Metrônomo espacial pulsante.'],
        ]} />
      </div>
    ),
  },

  // ── 05. ROLES & TIMBRES ────────────────────────────────────────────────────
  {
    title: 'Roles & Timbres',
    chapter: 'Som',
    icon: '♪',
    color: '#ff8c00',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          Cada partícula tem um <Em c='#ff8c00'>Voice Role</Em> que define seu timbre base.
          O painel direito (aba Timbre) permite trocar o template de cada role.
        </p>
        <Grid2 items={[
          ['KICK ●', 'Graves percussivos — ritmo base.'],
          ['BASS ◉', 'Linhas de baixo — fundação harmônica.'],
          ['PERC ×', 'Hi-hats, snares — texturas rítmicas.'],
          ['PAD ~', 'Pads longos — atmosfera e fundo.'],
          ['LEAD ⊿', 'Melodias — linhas principais.'],
          ['ARP ∆', 'Arpejos rápidos — movimento.'],
          ['STRINGS ☰', 'Cordas — camadas sustain.'],
          ['CHOIR ♪', 'Vozes — profundidade coral.'],
        ]} />
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(255,140,0,0.35)' }}>Timbre Templates</div>
          <p style={sHint}>
            No painel direito, clique no template de timbre para mudar: <span style={{ color: 'rgba(255,255,255,0.45)' }}>Sub Bass, Acid 303, Hard Kick, FM Bell, Saw Lead, Warm Pad, Shimmer, Glitch</span>, etc.
            Cada template modifica waveform, filtro, envelope e gain.
          </p>
        </div>
      </div>
    ),
  },

  // ── 06. SCALES & HARMONY ───────────────────────────────────────────────────
  {
    title: 'Escalas & Harmonia',
    chapter: 'Teoria Musical',
    icon: '♯',
    color: '#9b59ff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          Todas as notas são <Em c='#9b59ff'>quantizadas automaticamente</Em> para a escala ativa.
          Isso garante que tudo soe "certo" mesmo com o caos das partículas.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(155,89,255,0.35)' }}>Escalas disponíveis</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {['Major', 'Minor', 'Pentatonic', 'Blues', 'Dorian', 'Phrygian',
              'Lydian', 'Mixolydian', 'Whole Tone', 'Harmonic Minor', 'Chromatic'].map(s => (
              <span key={s} style={{ ...sKey, fontSize: 6 }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(155,89,255,0.35)' }}>Pitch por Role</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              ['KICK / PERC', 'Pitch fixo — apenas ritmo e textura.'],
              ['BASS', 'Nota raiz da escala — fundamento.'],
              ['LEAD', 'Cicla pelos graus da escala ativa.'],
              ['ARP', 'Arpejo rápido na escala.'],
              ['PAD / STRINGS / CHOIR', 'Harmonias e cores tonais.'],
            ].map(([role, desc]) => (
              <div key={role} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ ...sKey, width: 100, textAlign: 'center', flexShrink: 0, fontSize: 6 }}>{role}</span>
                <span style={sHint}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={sDim}>
          Use o painel superior para alterar Root e Scale em tempo real.
          Modo <span style={{ color: 'rgba(255,255,255,0.35)' }}>Canvas</span> mapeia pitch pela posição X/Y.
        </p>
      </div>
    ),
  },

  // ── 07. PHYSICS ────────────────────────────────────────────────────────────
  {
    title: 'Física & Comportamento',
    chapter: 'Dinâmica',
    icon: '⊕',
    color: '#39ff70',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          O painel direito (aba Physics) controla a <Em c='#39ff70'>dinâmica do movimento</Em>.
          Cada parâmetro muda como as partículas se comportam.
        </p>
        <Grid2 items={[
          ['Damping', 'Atrito — valores altos = partículas lentas.'],
          ['Cohesion', 'Força que une partículas próximas.'],
          ['Separation', 'Força que repele partículas muito perto.'],
          ['Max Speed', 'Velocidade máxima das partículas.'],
          ['Turbulence', 'Caos aleatório no movimento.'],
          ['Alignment', 'Partículas se alinham na mesma direção.'],
        ]} />
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(57,255,112,0.35)' }}>Motion Styles</div>
          <p style={sHint}>
            Mude o <span style={{ color: 'rgba(255,255,255,0.45)' }}>Motion Style</span> (aba Behavior) para padrões pré-definidos:
            <span style={{ color: 'rgba(255,255,255,0.35)' }}> Swarm, Orbit, Flow, Drift, Spiral, Lattice, Murmuration, Jazz, Meditation, Chaos</span>, etc.
          </p>
        </div>
      </div>
    ),
  },

  // ── 08. STUDIO SEQUENCER ───────────────────────────────────────────────────
  {
    title: 'Studio Sequencer',
    chapter: 'Composição',
    icon: '♩',
    color: '#00e5ff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          O <Em c='#00e5ff'>Studio Sequencer</Em> (painel inferior ↓) é um step sequencer
          determinístico — diferente das partículas, ele toca <span style={{ color: 'rgba(255,255,255,0.45)' }}>exatamente nos beats que você armar</span>.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(0,229,255,0.35)' }}>Workflow</div>
          <Numbered color='#00e5ff' items={[
            'Clique em STUDIO SEQ na barra inferior para expandir.',
            'Use Padrões ▾ para carregar um pattern pronto (ex: "4 on 4").',
            'Clique nas células do grid para ativar/desativar beats.',
            'Use M (mute) e S (solo) para controlar quais roles tocam.',
            'Ajuste o BPM no painel superior para o tempo global.',
          ]} />
        </div>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(0,229,255,0.35)' }}>Receita: Beat Techno básico</div>
          <p style={sHint}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>KICK no beat 1, 5, 9, 13</span> · <span style={{ color: 'rgba(255,255,255,0.45)' }}>PERC (hi-hat) em todos os beats</span> · <span style={{ color: 'rgba(255,255,255,0.45)' }}>BASS no 1 e 9</span> · <span style={{ color: 'rgba(255,255,255,0.45)' }}>ARP nos off-beats (2, 4, 6...)</span>.
          </p>
        </div>
      </div>
    ),
  },

  // ── 09. QUANTUM SEQUENCER ──────────────────────────────────────────────────
  {
    title: 'Quantum Sequencer',
    chapter: 'Indeterminação',
    icon: 'ψ',
    color: '#cc44ff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          O <Em c='#cc44ff'>Quantum Sequencer</Em> é um anel giratório no canvas.
          Diferente do Studio Seq, é <span style={{ color: 'rgba(255,255,255,0.45)' }}>probabilístico</span> — dispara notas das partículas mais próximas.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(204,68,255,0.35)' }}>Como funciona</div>
          <Numbered color='#cc44ff' items={[
            'Ative o Quantum Sequencer no painel (aba Q.Seq).',
            'Um anel aparece no canvas com steps armáveis.',
            'O cursor gira na velocidade do BPM.',
            'Quando passa num step armado, dispara a nota da partícula mais próxima.',
            'Se não há partícula perto, aquele step fica em silêncio.',
          ]} />
        </div>
        <p style={sDim}>
          Dica: Use o Studio Seq para KICK/BASS/PERC (ritmo fixo) e o Q.Seq para LEAD/ARP (melodias emergentes).
        </p>
      </div>
    ),
  },

  // ── 10. PRESETS ────────────────────────────────────────────────────────────
  {
    title: 'Presets & Vibes',
    chapter: 'Exploração',
    icon: '◎',
    color: '#ffd700',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          Presets são <Em c='#ffd700'>pontos de partida</Em> — combinações prontas de escala, timbres, 
          quantidade de partículas, physics e visual. Cada um tem uma vibe diferente.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(255,215,0,0.35)' }}>Como usar presets</div>
          <Numbered color='#ffd700' items={[
            'Abra o painel lateral direito e escolha um preset da lista.',
            'O preset troca escala, BPM, timbres, physics, visual — tudo de uma vez.',
            'Modifique os parâmetros livremente: o preset é apenas um starting point.',
            'Use o botão 🎲 na toolbar para carregar um preset aleatório.',
          ]} />
        </div>
        <p style={sDim}>
          Presets vão de Ambient/Drone até Techno/Rave. Cada um tem tags que indicam o gênero e a energia.
        </p>
      </div>
    ),
  },

  // ── 11. FX ZONES ───────────────────────────────────────────────────────────
  {
    title: 'FX Zones',
    chapter: 'Espaço Interativo',
    icon: '✦',
    color: '#ff44cc',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          <Em c='#ff44cc'>FX Zones</Em> são polígonos pintados no canvas com efeitos especiais.
          Partículas que entram na zona são afetadas.
        </p>
        <div style={{ ...sChapter, color: 'rgba(255,68,204,0.35)', marginTop: 4 }}>Efeitos disponíveis</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
          {[
            ['Slow', 'Reduz velocidade'],
            ['Fast', 'Acelera'],
            ['Mute', 'Silencia notas'],
            ['Excite', 'Aumenta carga'],
            ['Pitch ↑', 'Sobe o pitch'],
            ['Pitch ↓', 'Desce o pitch'],
            ['Reverse', 'Inverte direção'],
            ['Freeze', 'Congela'],
            ['Vortex', 'Redemoinho'],
            ['Glitch', 'Glitch aleatório'],
            ['Tremolo', 'Pulso de volume'],
            ['Phase Lock', 'Sincroniza fase'],
          ].map(([name, desc]) => (
            <div key={name} style={{ ...sSection, padding: '4px 6px' }}>
              <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.50)' }}>{name}</div>
              <div style={{ ...sDim, fontSize: 5 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p style={sDim}>
          Tecla <Key>9</Key> + clique para desenhar o polígono. Feche com duplo-clique.
        </p>
      </div>
    ),
  },

  // ── 12. CAPA → META-GEN-ART ───────────────────────────────────────────────
  {
    title: 'Capa da Composição',
    chapter: 'Meta-Gen-Art',
    icon: '🎨',
    color: '#ff6b6b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          Toda composição merece uma <Em c='#ff6b6b'>capa visual</Em>.
          O Music Lab pode exportar seus parâmetros para o <Em c='#ff6b6b'>Meta-Gen-Art</Em>,
          que gera uma arte generativa baseada na essência da sua música.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(255,107,107,0.35)' }}>Como funciona</div>
          <Numbered color='#ff6b6b' items={[
            'Monte sua composição no Music Lab (preset, partículas, physics, etc.).',
            'Clique no botão "Capa" (🖼️) na toolbar superior.',
            'Abra o Meta-Gen-Art e clique no botão de importar do MusicLab.',
            'A arte será gerada com paleta, estrutura e energia da sua música.',
          ]} />
        </div>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(255,107,107,0.35)' }}>O que é transferido</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {[
              ['Paleta de cores', 'Primary, accent, role colors'],
              ['Estrutura', 'Gates, rails, cages → geometria'],
              ['Energia', 'BPM, turbulence → ritmo visual'],
              ['Atmosfera', 'Reverb, delay → profundidade'],
              ['Densidade', 'Nº de partículas → qtd. shapes'],
              ['Intenção', 'Tags do preset → mood da arte'],
            ].map(([name, desc]) => (
              <div key={name} style={{ ...sSection, padding: '4px 6px' }}>
                <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.50)' }}>{name}</div>
                <div style={{ ...sDim, fontSize: 5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 13. 3D MODE ────────────────────────────────────────────────────────────
  {
    title: 'Modo 3D',
    chapter: 'Visualização',
    icon: '◎',
    color: '#00aaff',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          O botão <Key>3D</Key> na toolbar ativa a <Em c='#00aaff'>visualização tridimensional</Em>.
          O som <span style={{ color: 'rgba(255,255,255,0.50)' }}>não muda</span> — é puramente visual.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(0,170,255,0.35)' }}>Modos de câmera</div>
          <Grid2 items={[
            ['Orbital', 'Gira em volta do centro automaticamente.'],
            ['Top', 'Vista de cima — como o 2D, mas com profundidade.'],
            ['Side', 'Vista lateral — pitch como altura.'],
            ['FPP', 'Primeira pessoa — dentro do enxame.'],
          ]} />
        </div>
        <p style={sDim}>
          Arraste para orbitar. Scroll para zoom. Charge da partícula controla a altura Y.
        </p>
      </div>
    ),
  },

  // ── 14. COMPOSIÇÃO ─────────────────────────────────────────────────────────
  {
    title: 'Compose Mode',
    chapter: 'Performance',
    icon: '✎',
    color: '#fbbf24',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...sHint, fontSize: 8, color: 'rgba(255,255,255,0.40)' }}>
          O <Em c='#fbbf24'>Compose Mode</Em> pausa as partículas para você posicionar tudo com precisão,
          e depois <span style={{ color: 'rgba(255,255,255,0.50)' }}>solta (Release)</span> para ouvir o resultado.
        </p>
        <div style={sSection}>
          <div style={{ ...sChapter, color: 'rgba(251,191,36,0.35)' }}>Workflow</div>
          <Numbered color='#fbbf24' items={[
            'Ative Compose na toolbar — simulação pausa.',
            'Posicione partículas, gates, attractors, zones com calma.',
            'Ajuste velocity arrastando partículas (direção do arraste = velocidade inicial).',
            'Clique Release ▶ — tudo começa a se mover e produzir som.',
            'Use Restore para voltar ao estado anterior ao Release.',
          ]} />
        </div>
      </div>
    ),
  },

  // ── 15. SHORTCUTS ──────────────────────────────────────────────────────────
  {
    title: 'Atalhos de Teclado',
    chapter: 'Referência',
    icon: '⌨',
    color: ACCENT,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          {[
            ['Q', 'Select'],
            ['W', 'Spawn'],
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
            ['7', 'Cage'],
            ['8', 'H.String'],
            ['9', 'FX Zone'],
            ['0', 'Metro'],
            ['Space', 'Play / Pause'],
            ['Del', 'Deletar selecionado'],
            ['V', 'Overlays on/off'],
            ['C', 'Cinematic mode'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...sKey, minWidth: 24, textAlign: 'center', flexShrink: 0 }}>{key}</span>
              <span style={sHint}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ ...sSection, marginTop: 6 }}>
          <div style={{ ...sChapter, color: `${ACCENT}44` }}>Gamepad</div>
          <p style={sHint}>
            Conecte um controle para joystick spawn, trigger gates e haptics sincronizados ao BPM.
          </p>
        </div>
      </div>
    ),
  },
];

// ── Chapter groups for the nav dots ───────────────────────────────────────────
const CHAPTERS = [...new Set(STEPS.map(s => s.chapter))];

// ─────────────────────────────────────────────────────────────────────────────
interface MusicGuideProps { onClose: () => void; }
export const MusicGuide: React.FC<MusicGuideProps> = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const step = STEPS[page];
  const chapterIdx = CHAPTERS.indexOf(step.chapter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}>
      <div
        style={{
          width: 600, maxWidth: '96vw', maxHeight: '92vh',
          background: 'rgba(0,0,0,0.97)',
          border: '1px dashed rgba(255,255,255,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px dashed rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 16, color: step.color + '66', filter: `drop-shadow(0 0 8px ${step.color}22)` }}>{step.icon}</span>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', marginBottom: 2 }}>
                Jornada · {step.chapter} · {page + 1}/{STEPS.length}
              </div>
              <div style={{ fontFamily: DOTO, fontSize: 12, color: step.color + 'cc', letterSpacing: '0.04em' }}>{step.title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose}
              className="transition-opacity hover:opacity-70"
              style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', padding: '4px 8px', border: '1px dashed rgba(255,255,255,0.06)' }}>
              Pular
            </button>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.15)' }} className="hover:opacity-70 transition-opacity">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Chapter nav + progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px 0', flexShrink: 0 }}>
          {STEPS.map((s, i) => {
            const isChapterStart = i === 0 || STEPS[i - 1].chapter !== s.chapter;
            return (
              <React.Fragment key={i}>
                {isChapterStart && i > 0 && (
                  <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.04)', margin: '0 2px' }} />
                )}
                <button
                  onClick={() => setPage(i)}
                  className="transition-all"
                  title={s.title}
                  style={{
                    width: i === page ? 20 : 5,
                    height: 3,
                    background: i === page ? step.color + '88' : i < page ? step.color + '25' : 'rgba(255,255,255,0.05)',
                    flexShrink: 0,
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Content (scrollable) */}
        <div style={{ padding: '16px 20px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {step.content}
        </div>

        {/* Footer nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px dashed rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 transition-all disabled:opacity-0"
            style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase', color: step.color + '66' }}>
            <ChevronLeft size={10} /> Anterior
          </button>

          <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.06em' }}>
            {step.chapter}
          </div>

          {page < STEPS.length - 1 ? (
            <button onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 transition-all"
              style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase',
                padding: '4px 14px', color: step.color,
                background: step.color + '08', border: `1px dashed ${step.color}25`,
              }}>
              Próximo <ChevronRight size={10} />
            </button>
          ) : (
            <button onClick={onClose}
              className="flex items-center gap-1 transition-all"
              style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase',
                padding: '4px 14px', color: step.color,
                background: step.color + '08', border: `1px dashed ${step.color}25`,
              }}>
              Começar ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
