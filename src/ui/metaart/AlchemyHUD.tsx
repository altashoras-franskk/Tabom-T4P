// ─── Alchemy HUD — Tabbed Alchemical Interface ────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ToolState, AgentShape, DNA, DNAGenes } from '../../sim/metaart/metaArtTypes';
import { TOOL_DEFS } from '../../sim/metaart/metaArtTools';
import { PRESETS, EXTRA_PRESETS } from '../../sim/metaart/metaArtDNA';

// ── Types ─────────────────────────────────────────────────────────────────────
type AlchemyOp = 'SOLVE' | 'COAGULA' | 'CALCINATIO' | 'SUBLIMATIO' | 'FERMENTATIO' | 'SILENCIO';
type AlchemyTab = 'materia' | 'athanor' | 'opus' | 'poderes';
type OpusPhase = 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo' | 'lapis';

export type AlchemyFlashType = 'solve' | 'coagula' | 'calcinatio' | 'sublimatio' | 'fermentatio';

interface AlchemyElement {
  id: string;
  symbol: string;
  name: string;
  lat: string;
  desc: string;
  role: string;
  color: string;
  glow: string;
  dna: Partial<DNAGenes>;
  palette: string[];
  bg: string;
  count: number;
  cat: 'prima' | 'element' | 'metal' | 'process' | 'opus';
  hint: string;
}

export interface AlchemyHUDProps {
  toolState: ToolState;
  palette: string[];
  onToolChange: (patch: Partial<ToolState>) => void;
  agentShape: AgentShape;
  onAgentShape: (s: AgentShape) => void;
  sizeMul: number;
  onSizeMul: (v: number) => void;
  brushTextureId: string;
  onBrushTexture: (id: string) => void;
  onSpawnSingleton: () => void;
  singletonSize: number;
  onSingletonSize: (v: number) => void;
  simSpeed: number;
  onSimSpeed: (v: number) => void;
  staticAgents: boolean;
  onStaticAgents: () => void;
  isolatedSpecies: boolean;
  onIsolated: () => void;
  linear: boolean;
  onLinear: () => void;
  geoMode: 'fluid' | 'geometric' | 'hybrid' | '3d';
  onGeoMode: (m: 'fluid' | 'geometric' | 'hybrid' | '3d') => void;
  geoPanelOpen: boolean;
  onToggleGeoPanel: () => void;
  dna: DNA;
  onDNAChange: (dna: DNA) => void;
  onMutate: (variants: DNA[]) => void;
  pinnedDNA: DNA | null;
  onLoadPreset: (dna: DNA) => void;
  onResetSim: () => void;
  onRecolorSpecies: (species: number, hex: string) => void;
  onRandomPalette: () => void;
  onSetAllShape: (shape: AgentShape) => void;
  onDNAGene: (key: string, val: number) => void;
  onChaosInject: () => void;
  onFreezeAll: () => void;
  onPulseAll: () => void;
  onScatterAll: () => void;
  onHueRotate: (deg: number) => void;
  onSatShift: (delta: number) => void;
  onLitShift: (delta: number) => void;
  onSizeAll: (mul: number) => void;
  onRespawn: () => void;
  quantaCount: number;
  onFlash: (type: AlchemyFlashType) => void;
  guideCount: number;
  onClearGuides: () => void;
}

// ── Alchemy Element Definitions ───────────────────────────────────────────────
const ALCHEMY_ELEMENTS: AlchemyElement[] = [
  // Row 1 – Prima + Quatro Elementos
  { id:'prima',   symbol:'Φ',  name:'Prima Materia',lat:'Prima Materia',  desc:'A matéria informe que precede toda criação. Neutro, receptivo, potencial puro.',            role:'Substrato universal — início contemplativo', color:'#aabbc8', glow:'#ddeeff', dna:{structure:0.18,flow:0.55,entropy:0.32,memory:0.75,coherence:0.70}, palette:['#2a4a7f','#7f2a4a','#2a7f4a','#7f6a2a','#4a2a7f','#2a6a7f'], bg:'#f8f6f0', count:600, cat:'prima', hint:'Sempre disponível' },
  { id:'ignis',   symbol:'🜂', name:'Ignis',          lat:'Ignis',          desc:'Fogo: catalisador de mudança. Dissolve formas rígidas, acelera tudo que existe.',            role:'Catalisador — eleva entropia e movimento',    color:'#ff6030', glow:'#ff9060', dna:{structure:0.1,flow:0.9,entropy:0.92,memory:0.35,contrast:0.85,fragmentation:0.75,coherence:0.25}, palette:['#cc3300','#ff6600','#f09000','#ffcc00'], bg:'#120a04', count:900, cat:'element', hint:'Sempre disponível' },
  { id:'aqua',    symbol:'🜄', name:'Aqua',           lat:'Aqua',           desc:'Água: memória viva, padrões orgânicos, fluxo suave que permeia e conecta.',                  role:'Portador — amplifica memória e coesão',       color:'#3080ff', glow:'#60b0ff', dna:{structure:0.15,flow:0.88,entropy:0.18,memory:0.92,contrast:0.40,coherence:0.82}, palette:['#0a4080','#1060c0','#40a0e0','#80d0ff','#c0eeff'], bg:'#020812', count:800, cat:'element', hint:'Sempre disponível' },
  { id:'terra',   symbol:'🜃', name:'Terra',          lat:'Terra',          desc:'Terra: cristalização, estrutura geométrica, a força que dá forma ao caos.',                  role:'Fundamento — cristaliza e estrutura padrões', color:'#806040', glow:'#c0a060', dna:{structure:0.92,flow:0.22,entropy:0.08,memory:0.80,contrast:0.75,coherence:0.92,linear:0.7}, palette:['#402010','#804020','#c08040','#d0a060','#e0c080'], bg:'#0a0804', count:700, cat:'element', hint:'Sempre disponível' },
  // Row 2 – Aer + Aether + Metais Inferiores
  { id:'aer',     symbol:'🜁', name:'Aer',            lat:'Aer',            desc:'Ar: dispersão e leveza. Libera o que estava preso, espalha sementes no espaço.',             role:'Difusor — dispersa e areja padrões',          color:'#40d0c0', glow:'#80f0e0', dna:{structure:0.05,flow:0.72,entropy:0.62,memory:0.25,coherence:0.40,fragmentation:0.65}, palette:['#20a0c0','#40c0e0','#80e0f0','#c0f0ff'], bg:'#040c10', count:1000, cat:'element', hint:'Sempre disponível' },
  { id:'aether',  symbol:'✦',  name:'Aether',         lat:'Quintessentia',  desc:'A Quintessência, o quinto elemento. Transcende os quatro, harmoniza todas as forças.',      role:'Transcendente — equilíbrio perfeito',         color:'#c8a030', glow:'#ffd060', dna:{structure:0.50,flow:0.50,entropy:0.28,memory:0.80,contrast:0.70,coherence:0.85,symmetry:0.45}, palette:['#6030c0','#c030a0','#f06030','#f0c030','#60f0c0'], bg:'#060410', count:800, cat:'element', hint:'Use qualquer Preset para descobrir' },
  { id:'plumbum', symbol:'♄',  name:'Plumbum',        lat:'Plumbum Saturni',desc:'Chumbo de Saturno. Pesado, lento, acumula camadas. O tempo se torna visível.',              role:'Âncora — reduz velocidade, aumenta persistência', color:'#7080a0', glow:'#a0b0c0', dna:{structure:0.62,flow:0.18,entropy:0.12,memory:0.95,coherence:0.78,rhythm:0.22}, palette:['#304050','#506070','#809090','#a0b0b8'], bg:'#04060a', count:600, cat:'metal', hint:'Reduza a velocidade para <0.3x' },
  { id:'ferrum',  symbol:'♂',  name:'Ferrum',         lat:'Ferrum Martis',  desc:'Ferro de Marte. Conflito criativo, energia bruta, fragmentação que revela o interior.',     role:'Guerreiro — cria conflito e fragmentação',    color:'#c02020', glow:'#ff4040', dna:{structure:0.55,flow:0.35,entropy:0.75,memory:0.40,contrast:0.95,fragmentation:0.90,coherence:0.28}, palette:['#600000','#c02020','#ff4040','#ff8060','#d04020'], bg:'#080202', count:800, cat:'metal', hint:'Use Calcinatio 3 vezes seguidas' },
  // Row 3 – Metais Nobres
  { id:'cuprum',  symbol:'♀',  name:'Cuprum',         lat:'Cuprum Veneris', desc:'Cobre de Vênus. Beleza, harmonia das formas, simbiose entre ordem e flow.',                  role:'Harmonizador — cria padrões simétricos',      color:'#c06030', glow:'#ff9060', dna:{structure:0.42,flow:0.62,entropy:0.22,memory:0.72,coherence:0.88,symmetry:0.65,contrast:0.50}, palette:['#803010','#c06030','#e09060','#f0c090','#d08040'], bg:'#08040a', count:700, cat:'metal', hint:'Ative modo Harmonia' },
  { id:'argentum',symbol:'☽',  name:'Argentum',       lat:'Argentum Lunae', desc:'Prata da Lua. Reflexo, espelho do cosmos, memória perfeita de cada gesto passado.',        role:'Memória — amplifica rastros e espelhos',      color:'#c0c8d8', glow:'#e0e8f0', dna:{structure:0.28,flow:0.42,entropy:0.08,memory:0.98,coherence:0.90,contrast:0.65,symmetry:0.35}, palette:['#606878','#909aaa','#c0c8d8','#e0e8f0','#f8f8ff'], bg:'#06080e', count:600, cat:'metal', hint:'Use Aqua + Solve + Coagula' },
  { id:'aurum',   symbol:'☀',  name:'Aurum',          lat:'Aurum Solis',    desc:'Ouro do Sol. A perfeição dos metais, harmonia dourada, o objetivo maior da Obra.',           role:'Nobre — coerência máxima, harmonia solar',    color:'#d4a020', glow:'#ffd040', dna:{structure:0.70,flow:0.55,entropy:0.15,memory:0.85,coherence:0.96,contrast:0.80,symmetry:0.70,rhythm:0.65}, palette:['#604010','#c08020','#d4a020','#ffd040','#ffe080'], bg:'#060402', count:800, cat:'metal', hint:'Complete as quatro fases do Opus Magnus' },
  { id:'mercurius',symbol:'☿', name:'Mercurius',      lat:'Mercurius',      desc:'Mercúrio: o mensageiro. Transita entre mundos, une opostos, é a força de transformação.', role:'Transmutador — mediador entre todos os estados', color:'#a0c0c8', glow:'#c0e8f0', dna:{structure:0.35,flow:0.85,entropy:0.55,memory:0.60,coherence:0.65,rhythm:0.80,fragmentation:0.35}, palette:['#204048','#407080','#60a0b0','#a0c8d8','#c0e0e8'], bg:'#040a0c', count:750, cat:'metal', hint:'Alterne entre Solve e Coagula rapidamente' },
  // Row 4 – Fases do Opus Magnus + Lapis
  { id:'nigredo',  symbol:'⬛', name:'Nigredo',        lat:'Nigredo',        desc:'A Grande Obra começa na Negrura. Tudo se dissolve, apodrece, retorna ao caos primordial.', role:'Dissolução — início da purificação',          color:'#404060', glow:'#606090', dna:{structure:0.08,flow:0.65,entropy:0.95,memory:0.20,contrast:0.85,fragmentation:0.95,coherence:0.10}, palette:['#080810','#202030','#404060','#606080'], bg:'#020204', count:1000, cat:'process', hint:'Use Solve até a entropia máxima' },
  { id:'albedo',   symbol:'⬜', name:'Albedo',         lat:'Albedo',         desc:'A Grande Purificação. Da escuridão emerge a luz branca, a alma é lavada e clarificada.', role:'Purificação — clareza cristalina',            color:'#d0dde8', glow:'#ffffff', dna:{structure:0.65,flow:0.30,entropy:0.05,memory:0.95,coherence:0.95,contrast:0.85,fragmentation:0.05}, palette:['#d0d8e0','#e8eef4','#f4f8fc','#ffffff','#c8d4e0'], bg:'#f0f2f4', count:600, cat:'process', hint:'Use Coagula após Nigredo' },
  { id:'rubedo',   symbol:'🜔', name:'Rubedo',         lat:'Rubedo',         desc:'O Avermelhamento: a consumação da Obra. Vida plena, força e beleza em perfeito equilíbrio.', role:'Completude — síntese de todas as forças',    color:'#c03028', glow:'#ff6040', dna:{structure:0.62,flow:0.72,entropy:0.45,memory:0.75,coherence:0.82,contrast:0.88,rhythm:0.75,symmetry:0.38}, palette:['#600010','#a02020','#d04030','#e08050','#c03028'], bg:'#08020a', count:900, cat:'process', hint:'Passe por Nigredo e Albedo' },
  { id:'lapis',    symbol:'⊕',  name:'Lapis Philosophorum', lat:'Lapis Philosophorum', desc:'A Pedra Filosofal. O grande objetivo alquímico: transmuta chumbo em ouro, morte em vida.', role:'Transmutação total — a Grande Obra completa', color:'#c8800a', glow:'#ffc030', dna:{structure:0.75,flow:0.75,entropy:0.35,memory:0.90,coherence:0.95,contrast:0.85,symmetry:0.60,rhythm:0.70,fragmentation:0.15}, palette:['#402000','#804010','#c08020','#d4a030','#ffd050','#ffe080'], bg:'#060402', count:1200, cat:'opus', hint:'Descubra todos os outros elementos' },
];

// ── DNA Gene Alchemical Mapping ───────────────────────────────────────────────
interface GeneInfo {
  key: keyof DNAGenes;
  label: string;
  alchName: string;
  desc: string;
  practical: string;
  color: string;
}

const GENE_MAP: GeneInfo[] = [
  { key:'structure',     label:'Estrutura',      alchName:'Coagulatio',   desc:'Quanto os agentes se organizam em padrões rígidos ou ficam livres.', practical:'Baixo = fluido orgânico · Alto = cristais e grades geométricas', color:'#c0a0ff' },
  { key:'flow',          label:'Fluxo',          alchName:'Fluxus',       desc:'A intensidade do movimento e da direção dos agentes.', practical:'Baixo = quietude, rastros longos · Alto = correntes velozes', color:'#60c0ff' },
  { key:'entropy',       label:'Entropia',       alchName:'Dissolutio',   desc:'O grau de caos e imprevisibilidade na simulação.', practical:'Baixo = ordem cristalina · Alto = turbulência máxima', color:'#ff8060' },
  { key:'memory',        label:'Memória',        alchName:'Memoria',      desc:'Por quanto tempo os rastros dos agentes permanecem visíveis.', practical:'Baixo = rastros curtos, efemeridade · Alto = traços densos e persistentes', color:'#80ff80' },
  { key:'contrast',      label:'Contraste',      alchName:'Contrarium',   desc:'A intensidade visual entre luz e sombra nos agentes.', practical:'Baixo = tons pastéis suaves · Alto = cores vivas e vibrantes', color:'#ffd060' },
  { key:'symmetry',      label:'Simetria',       alchName:'Symmetria',    desc:'Tendência de formar padrões com eixos de simetria radial.', practical:'Baixo = caos assimétrico · Alto = mandalas radiais', color:'#ff80ff' },
  { key:'rhythm',        label:'Ritmo',          alchName:'Rhythmus',     desc:'O padrão temporal das pulsações e movimentos dos agentes.', practical:'Baixo = fluxo contínuo suave · Alto = pulsos e staccatos', color:'#ff9040' },
  { key:'fragmentation', label:'Fragmentação',   alchName:'Fragmentatio', desc:'Tendência de quebrar padrões em fragmentos menores.', practical:'Baixo = massas unidas · Alto = partículas dispersas e quebradas', color:'#ff6060' },
  { key:'coherence',     label:'Coerência',      alchName:'Coherentia',   desc:'Quanto os agentes se movem em sincronia como um organismo.', practical:'Baixo = comportamento individual e caótico · Alto = movimento coletivo', color:'#60ff90' },
  { key:'erosion',       label:'Erosão',         alchName:'Erosio',       desc:'Velocidade com que os rastros e marcas se dissolvem.', practical:'Baixo = tinta permanente · Alto = tinta que some rapidamente', color:'#a0a0ff' },
  { key:'layering',      label:'Estratificação', alchName:'Stratum',      desc:'Profundidade de sobreposição de camadas visuais.', practical:'Baixo = aparência plana · Alto = camadas profundas e ricas', color:'#ffa0c0' },
  { key:'linear',        label:'Linear',         alchName:'Linearis',     desc:'Preferência por linhas retas versus curvas orgânicas (modo Rizoma).', practical:'Baixo = curvas orgânicas · Alto = linhas retas e rizomáticas', color:'#80d0d0' },
];

// ── Opus Magnus Phases ────────────────────────────────────────────────────────
const OPUS_PHASES: { id: OpusPhase; label: string; symbol: string; color: string; desc: string; genes: Partial<DNAGenes> }[] = [
  { id:'nigredo',   label:'Nigredo',   symbol:'⬛', color:'#606080', desc:'Dissolução: caos inicial, putrefação criativa. Tudo deve dissolver antes de renascer.',     genes:{entropy:0.95,structure:0.08,coherence:0.10,memory:0.25,fragmentation:0.92} },
  { id:'albedo',    label:'Albedo',    symbol:'⬜', color:'#c0ccd8', desc:'Purificação: o branco emerge do negro. Clareza, estrutura cristalina, leveza.',              genes:{entropy:0.05,structure:0.65,coherence:0.95,memory:0.92,fragmentation:0.05,contrast:0.80} },
  { id:'citrinitas',label:'Citrinitas',symbol:'🟡', color:'#d0a020', desc:'Iluminação: o amarelo dourado do amanhecer. Ritmo, fluxo orientado, emergência.',          genes:{entropy:0.30,flow:0.80,rhythm:0.80,coherence:0.75,contrast:0.70,memory:0.60} },
  { id:'rubedo',    label:'Rubedo',    symbol:'🔴', color:'#c03028', desc:'Completude: o vermelho vibrante da consumação. Todas as forças em síntese dinâmica.',       genes:{entropy:0.42,structure:0.62,flow:0.72,coherence:0.82,contrast:0.88,rhythm:0.75,symmetry:0.38} },
  { id:'lapis',     label:'Lapis',     symbol:'⊕',  color:'#c8800a', desc:'A Grande Obra: a Pedra Filosofal. Equilíbrio supremo, transmutação de toda a experiência.', genes:{structure:0.75,flow:0.75,entropy:0.35,memory:0.90,coherence:0.95,contrast:0.85,symmetry:0.60,rhythm:0.70} },
];

// ── Alchemical Operations ─────────────────────────────────────────────────────
const ALCHEMY_OPS: { id: AlchemyOp; symbol: string; label: string; color: string; flash: AlchemyFlashType | null; desc: string; effect: string }[] = [
  { id:'SOLVE',      symbol:'🜄', label:'Solve',       color:'#3080ff', flash:'solve',       desc:'Solvite et Coagulate — Dissolve!', effect:'Aumenta entropia +15%, reduz coerência -10%, amplifica fluxo' },
  { id:'COAGULA',    symbol:'🜃', label:'Coagula',     color:'#c08020', flash:'coagula',     desc:'Solvite et Coagulate — Coagula!', effect:'Aumenta estrutura +15%, reduz entropia -12%, amplifica coerência' },
  { id:'CALCINATIO', symbol:'🔥', label:'Calcinatio',  color:'#ff5020', flash:'calcinatio',  desc:'Queima a impureza, deixa apenas o essencial', effect:'Contraste máximo, erosão alta, memória curta — purga pela chama' },
  { id:'SUBLIMATIO', symbol:'☁',  label:'Sublimatio',  color:'#8060ff', flash:'sublimatio',  desc:'O sólido ascende ao éter sem passar pelo líquido', effect:'Eleva flow, reduz estrutura, ativa movimento ascendente' },
  { id:'FERMENTATIO',symbol:'🌿', label:'Fermentatio', color:'#40c060', flash:'fermentatio', desc:'A fermentação transforma, converte, inicia nova vida', effect:'Ativa ritmo pulsante, fragmentação média, transição de padrão' },
  { id:'SILENCIO',   symbol:'○',  label:'Silêncio',    color:'#808090', flash:null,           desc:'Pausa contemplativa — deixa a matéria repousar', effect:'Reduz entropia, suaviza ritmo, permite o padrão emergir' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const W = 260;


function SliderRow({ label, alchName, val, min=0, max=1, step=0.01, color='#c0a0ff', onChange, desc, practical }: {
  label: string; alchName?: string; val: number; min?: number; max?: number;
  step?: number; color?: string; onChange: (v: number) => void;
  desc?: string; practical?: string;
}) {
  const [hover, setHover] = useState(false);
  const pct = Math.round(((val - min) / (max - min)) * 100);
  return (
    <div style={{ position:'relative' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
        <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.55)', flex:1 }}>
          {alchName ? <><span style={{color, fontSize:8, letterSpacing:'0.05em'}}>{alchName}</span> <span style={{opacity:0.4}}>·</span> </> : null}
          {label}
        </span>
        <span style={{ fontSize:9, fontFamily:'monospace', color, minWidth:34, textAlign:'right' }}>
          {pct}%
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', cursor:'pointer', accentColor:color, height:4 }}
      />
      {hover && (desc || practical) && (
        <div style={{
          position:'absolute', left:0, right:0, bottom:'calc(100% + 6px)', zIndex:20,
          background:'rgba(10,8,20,0.97)', border:'1px solid rgba(255,255,255,0.12)',
          borderRadius:6, padding:'8px 10px', pointerEvents:'none',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {desc && <div style={{fontSize:9, color:'rgba(255,255,255,0.7)', marginBottom:4, lineHeight:1.5}}>{desc}</div>}
          {practical && <div style={{fontSize:8, color:'rgba(255,255,255,0.38)', lineHeight:1.5, fontStyle:'italic'}}>{practical}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const AlchemyHUD: React.FC<AlchemyHUDProps> = (props) => {
  const {
    toolState, palette, onToolChange, agentShape, onAgentShape, sizeMul, onSizeMul,
    brushTextureId, onBrushTexture, onSpawnSingleton, singletonSize, onSingletonSize,
    simSpeed, onSimSpeed, staticAgents, onStaticAgents, isolatedSpecies, onIsolated,
    linear, onLinear, geoMode, onGeoMode, geoPanelOpen, onToggleGeoPanel,
    dna, onDNAChange, onMutate, pinnedDNA, onLoadPreset, onResetSim,
    onRecolorSpecies, onRandomPalette, onSetAllShape, onDNAGene,
    onChaosInject, onFreezeAll, onPulseAll, onScatterAll, onHueRotate,
    onSatShift, onLitShift, onSizeAll, onRespawn, quantaCount, onFlash,
    guideCount, onClearGuides,
  } = props;

  const [tab, setTab] = useState<AlchemyTab>('materia');
  const [selectedEl, setSelectedEl] = useState<string>('prima');
  const [opusPhase, setOpusPhase] = useState<OpusPhase>('nigredo');
  const [hueRotDeg, setHueRotDeg] = useState(30);

  // ── Element Discovery (localStorage) ──────────────────────────────────────
  const [discovered, setDiscovered] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('alchemyDiscovered_v2');
      return s ? new Set(JSON.parse(s)) : new Set(['prima','ignis','aqua','terra','aer']);
    } catch { return new Set(['prima','ignis','aqua','terra','aer']); }
  });

  const discover = useCallback((id: string) => {
    setDiscovered(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      localStorage.setItem('alchemyDiscovered_v2', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // ── Quantum Sequencer ─────────────────────────────────────────────────────
  const SEQ_OPS: AlchemyOp[] = ['SOLVE','COAGULA','CALCINATIO','SUBLIMATIO','FERMENTATIO','SILENCIO'];
  const [seqSteps, setSeqSteps] = useState<AlchemyOp[]>(['SOLVE','COAGULA','SILENCIO','CALCINATIO','SOLVE','COAGULA','SILENCIO','SILENCIO']);
  const [seqBPM, setSeqBPM] = useState(60);
  const [seqPlaying, setSeqPlaying] = useState(false);
  const [seqCurrent, setSeqCurrent] = useState(-1);
  const seqIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seqIdxRef = useRef(-1);
  const dnaRef = useRef(dna);
  const onDNAGeneRef = useRef(onDNAGene);
  const onFlashRef = useRef(onFlash);

  useEffect(() => { dnaRef.current = dna; }, [dna]);
  useEffect(() => { onDNAGeneRef.current = onDNAGene; }, [onDNAGene]);
  useEffect(() => { onFlashRef.current = onFlash; }, [onFlash]);

  const fireOp = useCallback((op: AlchemyOp) => {
    const g = dnaRef.current.genes;
    const set = onDNAGeneRef.current;
    const flash = onFlashRef.current;
    switch(op) {
      case 'SOLVE':      set('entropy',     Math.min(1, g.entropy+0.15));     set('coherence',   Math.max(0, g.coherence-0.10));   flash('solve');       break;
      case 'COAGULA':    set('structure',   Math.min(1, g.structure+0.15));   set('entropy',     Math.max(0, g.entropy-0.12));     flash('coagula');     break;
      case 'CALCINATIO': set('contrast',    0.95);                             set('erosion',     0.80); set('memory', 0.25);        flash('calcinatio');  break;
      case 'SUBLIMATIO': set('flow',        Math.min(1, g.flow+0.20));        set('structure',   Math.max(0, g.structure-0.15));   flash('sublimatio');  break;
      case 'FERMENTATIO':set('rhythm',      Math.min(1, g.rhythm+0.25));      set('fragmentation',Math.min(0.7, g.fragmentation+0.15)); flash('fermentatio'); break;
      case 'SILENCIO':   set('entropy',     Math.max(0, g.entropy-0.10));     set('rhythm',      Math.max(0, g.rhythm-0.10));     break;
    }
  }, []);

  useEffect(() => {
    if (!seqPlaying) {
      if (seqIntervalRef.current) clearInterval(seqIntervalRef.current);
      seqIdxRef.current = -1;
      setSeqCurrent(-1);
      return;
    }
    const interval = Math.round(60000 / seqBPM);
    seqIntervalRef.current = setInterval(() => {
      seqIdxRef.current = (seqIdxRef.current + 1) % 8;
      const idx = seqIdxRef.current;
      setSeqCurrent(idx);
      fireOp(seqSteps[idx]);
    }, interval);
    return () => { if (seqIntervalRef.current) clearInterval(seqIntervalRef.current); };
  }, [seqPlaying, seqBPM, seqSteps, fireOp]);

  const cycleStep = (i: number) => {
    setSeqSteps(prev => {
      const next = [...prev];
      const cur = SEQ_OPS.indexOf(prev[i]);
      next[i] = SEQ_OPS[(cur + 1) % SEQ_OPS.length];
      return next;
    });
  };

  // ── Apply Opus Phase ───────────────────────────────────────────────────────
  const applyOpusPhase = (phase: OpusPhase) => {
    setOpusPhase(phase);
    const p = OPUS_PHASES.find(x => x.id === phase);
    if (!p) return;
    const newGenes = { ...dna.genes, ...p.genes };
    onDNAChange({ ...dna, genes: newGenes });
    // Discover phase elements
    if (phase === 'nigredo')   discover('nigredo');
    if (phase === 'albedo')    discover('albedo');
    if (phase === 'rubedo')    { discover('rubedo'); discover('citrinitas'); }
    if (phase === 'lapis')     discover('lapis');
  };

  // ── Apply Element ──────────────────────────────────────────────────────────
  const applyElement = (el: AlchemyElement) => {
    setSelectedEl(el.id);
    discover(el.id);
    const newGenes = { ...dna.genes, ...el.dna };
    const newDNA: DNA = { ...dna, genes: newGenes, palette: el.palette, background: el.bg, quantaCount: el.count };
    onLoadPreset(newDNA);
  };

  const selEl = ALCHEMY_ELEMENTS.find(e => e.id === selectedEl) ?? ALCHEMY_ELEMENTS[0];
  const allDiscovered = ALCHEMY_ELEMENTS.every(e => discovered.has(e.id));

  // ── Inject animation CSS once ──────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('alchemy-anim-css')) return;
    const s = document.createElement('style');
    s.id = 'alchemy-anim-css';
    s.textContent = `
      @keyframes alch-solve      { 0%{opacity:0;transform:scale(0.3)} 20%{opacity:0.8} 100%{opacity:0;transform:scale(2.2)} }
      @keyframes alch-coagula    { 0%{opacity:0} 15%{opacity:0.85} 100%{opacity:0} }
      @keyframes alch-calcinatio { 0%{opacity:0;transform:scaleY(0)} 10%{opacity:0.9} 80%{opacity:0.5} 100%{opacity:0} }
      @keyframes alch-sublimatio { 0%{opacity:0;transform:translateY(40px)} 15%{opacity:0.8} 100%{opacity:0;transform:translateY(-40px)} }
      @keyframes alch-fermentatio{ 0%{opacity:0;transform:scale(0.5)rotate(0deg)} 20%{opacity:0.75} 100%{opacity:0;transform:scale(1.8)rotate(45deg)} }
      .flash-solve       { animation: alch-solve      1.6s ease-out forwards; background: radial-gradient(circle, rgba(20,80,200,0.55) 0%, rgba(0,120,180,0.3) 40%, transparent 70%); }
      .flash-coagula     { animation: alch-coagula    1.6s ease-out forwards; background: radial-gradient(circle, rgba(220,160,20,0.55) 0%, rgba(180,110,10,0.3) 40%, transparent 70%); }
      .flash-calcinatio  { animation: alch-calcinatio 1.6s ease-out forwards; background: linear-gradient(to top, rgba(255,80,20,0.6) 0%, rgba(255,160,40,0.3) 40%, transparent 75%); }
      .flash-sublimatio  { animation: alch-sublimatio 1.6s ease-out forwards; background: radial-gradient(ellipse 60% 80% at 50% 80%, rgba(100,60,220,0.55) 0%, rgba(60,20,180,0.3) 50%, transparent 80%); }
      .flash-fermentatio { animation: alch-fermentatio 1.6s ease-out forwards; background: radial-gradient(circle, rgba(40,180,80,0.55) 0%, rgba(20,120,40,0.3) 45%, transparent 70%); }
      .alchemy-tab-btn { transition: color 0.15s, background 0.15s, border-color 0.15s; }
      .alchemy-tab-btn:hover { background: rgba(255,255,255,0.06) !important; }
    `;
    document.head.appendChild(s);
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const bg = 'rgba(8,6,18,0.99)';
  const borderC = 'rgba(255,255,255,0.05)';

  const TABS: { id: AlchemyTab; symbol: string; label: string; color: string }[] = [
    { id:'materia',  symbol:'🜃', label:'Matéria',  color:'#c8a030' },
    { id:'athanor',  symbol:'🜂', label:'Athanor',  color:'#ff6030' },
    { id:'opus',     symbol:'✦',  label:'Opus',     color:'#a060ff' },
    { id:'poderes',  symbol:'☿',  label:'Poderes',  color:'#40c0d0' },
  ];

  return (
    <div style={{
      width:W, height:'100%', display:'flex', flexDirection:'column',
      background:bg, borderRight:`1px solid ${borderC}`,
      overflow:'hidden', userSelect:'none', flexShrink:0, fontFamily:'system-ui, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding:'10px 14px 8px', borderBottom:`1px solid ${borderC}`,
        background:'rgba(12,8,24,0.9)', flexShrink:0,
      }}>
        <div style={{ fontSize:10, letterSpacing:'0.18em', color:'rgba(200,160,40,0.7)', textTransform:'uppercase', fontWeight:600 }}>
          ⚗ Ateliê Alquímico
        </div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.22)', marginTop:2, letterSpacing:'0.06em' }}>
          Q: <span style={{ color: quantaCount>0?'rgba(200,180,100,0.6)':'rgba(80,200,120,0.5)', fontFamily:'monospace' }}>{quantaCount}</span>
          {' · '}
          <span style={{ color:'rgba(255,255,255,0.3)' }}>{dna.name ?? 'custom'}</span>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display:'flex', borderBottom:`1px solid ${borderC}`, flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="alchemy-tab-btn"
            style={{
              flex:1, padding:'9px 2px 7px', border:'none', cursor:'pointer',
              borderBottom: tab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
              background: tab===t.id ? `${t.color}14` : 'transparent',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              color: tab===t.id ? t.color : 'rgba(255,255,255,0.28)',
            }}>
            <span style={{ fontSize:13, lineHeight:1 }}>{t.symbol}</span>
            <span style={{ fontSize:6.5, letterSpacing:'0.1em', textTransform:'uppercase' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>

        {/* ═══════════════════════════════════ MATÉRIA ═══════════════════════ */}
        {tab === 'materia' && (
          <div style={{ padding:'10px 10px' }}>
            <p style={{ fontSize:8.5, color:'rgba(255,255,255,0.32)', lineHeight:1.6, marginBottom:10 }}>
              Escolha um elemento para contemplar e invocar no cânvas. Cada elemento carrega uma configuração alquímica única.
            </p>

            {/* Periodic Table Grid */}
            <div style={{ fontSize:7.5, color:'rgba(200,160,40,0.55)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Tábua Periódica Alquímica
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:3, marginBottom:12 }}>
              {ALCHEMY_ELEMENTS.map(el => {
                const isDisc = discovered.has(el.id);
                const isSel = selectedEl === el.id;
                return (
                  <button key={el.id} onClick={() => {
                    setSelectedEl(el.id);
                    if (isDisc) discover(el.id);
                  }}
                    title={isDisc ? el.name : `🔒 ${el.hint}`}
                    style={{
                      padding:'7px 2px 5px', borderRadius:5, cursor:'pointer',
                      border:`1px solid ${isSel ? el.color+'aa' : isDisc ? el.color+'33' : 'rgba(255,255,255,0.06)'}`,
                      background: isSel ? `${el.color}1a` : isDisc ? `${el.color}0a` : 'rgba(255,255,255,0.02)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      transition:'all 0.12s', position:'relative',
                      boxShadow: isSel ? `0 0 8px ${el.glow}40` : 'none',
                    }}>
                    <span style={{ fontSize:14, lineHeight:1, filter:isDisc?'none':'grayscale(1) brightness(0.3)' }}>
                      {el.symbol}
                    </span>
                    <span style={{
                      fontSize:5.5, letterSpacing:'0.05em', textTransform:'uppercase',
                      color: isDisc ? (isSel ? el.color : 'rgba(255,255,255,0.45)') : 'rgba(255,255,255,0.15)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:50,
                    }}>
                      {isDisc ? el.name.split(' ')[0] : '???'}
                    </span>
                    {!isDisc && (
                      <div style={{
                        position:'absolute', top:2, right:2,
                        fontSize:7, color:'rgba(255,255,255,0.2)'
                      }}>🔒</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Element Card */}
            {selEl && (
              <div style={{
                border:`1px solid ${selEl.color}44`, borderRadius:8,
                background:`${selEl.color}08`, padding:'10px 12px', marginBottom:10,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:28, filter:discovered.has(selEl.id)?'none':'grayscale(1)' }}>{selEl.symbol}</span>
                  <div>
                    <div style={{ fontSize:12, color:selEl.color, fontWeight:600 }}>
                      {discovered.has(selEl.id) ? selEl.name : '???'}
                    </div>
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>
                      {discovered.has(selEl.id) ? selEl.lat : 'Desconhecido'}
                    </div>
                  </div>
                </div>
                {discovered.has(selEl.id) ? (
                  <>
                    <p style={{ fontSize:8.5, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:5 }}>{selEl.desc}</p>
                    <div style={{
                      fontSize:8, color:selEl.color, background:`${selEl.color}15`,
                      borderRadius:4, padding:'4px 8px', marginBottom:8, lineHeight:1.5,
                    }}>
                      ⚡ {selEl.role}
                    </div>
                    {/* DNA preview mini */}
                    <div style={{ display:'flex', gap:2, marginBottom:8, flexWrap:'wrap' }}>
                      {selEl.palette.map((c, i) => (
                        <div key={i} style={{ width:16, height:16, borderRadius:3, background:c, flexShrink:0 }} />
                      ))}
                    </div>
                    <button onClick={() => applyElement(selEl)} style={{
                      width:'100%', padding:'8px 0', borderRadius:5, cursor:'pointer',
                      background:`${selEl.color}22`, border:`1px solid ${selEl.color}66`,
                      color:selEl.color, fontSize:10, fontWeight:600, letterSpacing:'0.1em',
                      textTransform:'uppercase', transition:'all 0.12s',
                    }}>
                      {selEl.symbol} Invocar {selEl.name.split(' ')[0]}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize:8.5, color:'rgba(255,255,255,0.3)', lineHeight:1.6 }}>
                    🔒 <em>Elemento não descoberto ainda</em><br/>
                    <span style={{ color:'rgba(255,200,80,0.45)' }}>Dica: {selEl.hint}</span>
                  </div>
                )}
              </div>
            )}

            {/* Collection progress */}
            <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.22)', letterSpacing:'0.08em', textAlign:'center', marginTop:4 }}>
              {discovered.size}/{ALCHEMY_ELEMENTS.length} elementos descobertos
              {allDiscovered && <span style={{ color:'#c8800a', marginLeft:5 }}>⊕ OBRA COMPLETA!</span>}
            </div>

            {/* Agent Shape (moved here for contemplative workflow) */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                ◈ Forma dos Agentes
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:3 }}>
                {(['circle','square','diamond','triangle','cross','star','brush'] as AgentShape[]).map(sh => {
                  const icons: Record<string, string> = { circle:'●', square:'■', diamond:'◆', triangle:'▲', cross:'+', star:'★', brush:'𝓑' };
                  const act = agentShape === sh;
                  return (
                    <button key={sh} onClick={() => onAgentShape(sh)} title={sh}
                      style={{
                        padding:'6px 2px', borderRadius:4, cursor:'pointer', fontSize:13,
                        background: act ? 'rgba(200,160,40,0.16)' : 'rgba(255,255,255,0.03)',
                        border:`1px solid ${act ? 'rgba(200,160,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        color: act ? 'rgba(200,160,40,0.95)' : 'rgba(255,255,255,0.35)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                      {icons[sh]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color swatches */}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
                ◈ Paleta Ativa
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:2 }}>
                {palette.slice(0,6).map((c, i) => (
                  <button key={i} onClick={() => onToolChange({ colorIndex:i })}
                    style={{
                      aspectRatio:'1', borderRadius:3, background:c, border:'none', cursor:'pointer',
                      outline: toolState.colorIndex===i ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.1)',
                      outlineOffset:1,
                    }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ ATHANOR ═══════════════════════ */}
        {tab === 'athanor' && (
          <div style={{ padding:'10px 10px' }}>

            {/* VELOCIDADE — PROMINENTE */}
            <div style={{
              background:'rgba(255,100,30,0.06)', border:'1px solid rgba(255,100,30,0.2)',
              borderRadius:8, padding:'12px 12px', marginBottom:12,
            }}>
              <div style={{ fontSize:9, color:'rgba(255,130,60,0.8)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4, fontWeight:600 }}>
                🜂 Velocidade do Tempo
              </div>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.35)', marginBottom:8, lineHeight:1.5 }}>
                Controla o ritmo da simulação — de contemplação lenta à aceleração máxima.
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="range" min={0.01} max={10} step={0.01} value={simSpeed}
                  onChange={e => onSimSpeed(parseFloat(e.target.value))}
                  style={{ flex:1, cursor:'pointer', accentColor:'#ff6030', height:6 }}
                />
                <span style={{ fontFamily:'monospace', fontSize:11, color:'#ff8050', minWidth:40, textAlign:'right' }}>
                  {simSpeed < 0.1 ? simSpeed.toFixed(2) : simSpeed.toFixed(1)}×
                </span>
              </div>
              <div style={{ display:'flex', gap:3, marginTop:6 }}>
                {[[0.05,'Contemplar'],[0.3,'Lento'],[1,'Normal'],[3,'Rápido'],[8,'Frenético']].map(([v, l]) => (
                  <button key={l} onClick={() => onSimSpeed(Number(v))}
                    style={{
                      flex:1, padding:'4px 2px', borderRadius:3, cursor:'pointer', fontSize:7,
                      background: Math.abs(simSpeed-Number(v))<0.05 ? 'rgba(255,100,30,0.2)' : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${Math.abs(simSpeed-Number(v))<0.05 ? 'rgba(255,100,30,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: Math.abs(simSpeed-Number(v))<0.05 ? 'rgba(255,130,60,0.9)' : 'rgba(255,255,255,0.3)',
                      letterSpacing:'0.05em', textTransform:'uppercase',
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Tool Palette */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
              ◈ Ferramentas
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2, marginBottom:10 }}>
              {TOOL_DEFS.map(tool => {
                const isActive = toolState.activeToolId === tool.id;
                const catColors: Record<string, string> = { vida:'#50dc78', forca:'#ff6040', mutar:'#a060ff', guiar:'#40b0ff' };
                const c = catColors[tool.category] ?? '#aaa';
                return (
                  <button key={tool.id} onClick={() => onToolChange({ activeToolId:tool.id })}
                    title={`${tool.name} — ${tool.description}`}
                    style={{
                      padding:'7px 3px 5px', borderRadius:4, cursor:'pointer', border:'none',
                      background: isActive ? `${c}18` : 'rgba(255,255,255,0.02)',
                      borderBottom: isActive ? `2px solid ${c}88` : '2px solid transparent',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      color: isActive ? c : 'rgba(255,255,255,0.30)',
                    }}>
                    <span style={{ fontSize:14, lineHeight:1 }}>{tool.icon}</span>
                    <span style={{ fontSize:6, lineHeight:1.2, textAlign:'center', textTransform:'uppercase', letterSpacing:'0.04em', wordBreak:'break-word', maxWidth:50 }}>
                      {tool.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tamanho dos agentes */}
            <div style={{ marginBottom:10 }}>
              <SliderRow label="Tamanho dos Agentes" alchName="Magnitudo" val={sizeMul} min={0.2} max={6} step={0.1} color="#c8a030"
                onChange={onSizeMul} desc="Escala visual de todos os agentes na simulação."
                practical="0.2x = partículas minúsculas · 6x = bolhas grandes" />
            </div>

            {/* Mode toggles */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Modos Especiais
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
              {[
                { label:'Fixo — Agentes imóveis (apenas pintura)', active:staticAgents, onClick:onStaticAgents, color:'rgba(255,180,60,0.9)' },
                { label:'Isolado — Espécies sem interação cruzada', active:isolatedSpecies, onClick:onIsolated, color:'rgba(255,100,160,0.95)' },
                { label:'Rizoma — Linhas retas em vez de curvas', active:linear, onClick:onLinear, color:'rgba(100,200,255,0.9)' },
              ].map(({ label, active, onClick, color }) => (
                <button key={label} onClick={onClick}
                  style={{
                    padding:'6px 8px', borderRadius:4, cursor:'pointer', textAlign:'left', fontSize:8.5,
                    background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                    border:`1px solid ${active ? color.replace('0.9)','0.35)').replace('0.95)','0.35)') : 'rgba(255,255,255,0.07)'}`,
                    color: active ? color : 'rgba(255,255,255,0.35)',
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                  <span style={{ fontSize:9 }}>{active ? '●' : '○'}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Compositor Geo */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Compositor Visual
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, marginBottom:6 }}>
              {(['fluid','geometric','hybrid','3d'] as const).map(m => {
                const labels = { fluid:'≈ Fluido', geometric:'◈ Geo', hybrid:'◑ Híbrido', '3d':'⬡ 3D' };
                const colors = { fluid:'#808090', geometric:'#60e080', hybrid:'#60b0ff', '3d':'#c080ff' };
                const act = geoMode === m;
                return (
                  <button key={m} onClick={() => onGeoMode(m)}
                    style={{
                      padding:'6px 4px', borderRadius:4, cursor:'pointer', fontSize:8,
                      background: act ? `${colors[m]}18` : 'rgba(255,255,255,0.02)',
                      border:`1px solid ${act ? `${colors[m]}55` : 'rgba(255,255,255,0.07)'}`,
                      color: act ? colors[m] : 'rgba(255,255,255,0.28)',
                      letterSpacing:'0.06em', fontFamily:'monospace',
                    }}>
                    {labels[m]}
                  </button>
                );
              })}
            </div>
            <button onClick={onToggleGeoPanel}
              style={{
                width:'100%', padding:'5px 0', borderRadius:4, cursor:'pointer',
                fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase',
                background: geoPanelOpen ? 'rgba(60,180,80,0.12)' : 'rgba(255,255,255,0.03)',
                border:`1px solid ${geoPanelOpen ? 'rgba(80,220,100,0.3)' : 'rgba(255,255,255,0.07)'}`,
                color: geoPanelOpen ? 'rgba(160,240,160,0.8)' : 'rgba(255,255,255,0.25)',
              }}>
              ▸ Parâmetros Geométricos Avançados
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════ OPUS ═════════════════════════ */}
        {tab === 'opus' && (
          <div style={{ padding:'10px 10px' }}>

            {/* Opus Magnus Phases */}
            <div style={{
              background:'rgba(160,80,0,0.06)', border:'1px solid rgba(200,140,20,0.2)',
              borderRadius:8, padding:'10px 12px', marginBottom:12,
            }}>
              <div style={{ fontSize:9, color:'rgba(200,160,40,0.75)', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:600, marginBottom:3 }}>
                ✦ Opus Magnus — A Grande Obra
              </div>
              <p style={{ fontSize:8, color:'rgba(255,255,255,0.35)', lineHeight:1.55, marginBottom:8 }}>
                A transmutação alquímica passa por quatro fases. Cada fase reconfigura o DNA da simulação.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {OPUS_PHASES.map((ph, i) => {
                  const isActive = opusPhase === ph.id;
                  return (
                    <button key={ph.id} onClick={() => applyOpusPhase(ph.id)}
                      title={ph.desc}
                      style={{
                        padding:'7px 10px', borderRadius:5, cursor:'pointer', textAlign:'left',
                        background: isActive ? `${ph.color}18` : 'rgba(255,255,255,0.02)',
                        border:`1px solid ${isActive ? `${ph.color}55` : 'rgba(255,255,255,0.07)'}`,
                        color: isActive ? ph.color : 'rgba(255,255,255,0.35)',
                        display:'flex', alignItems:'flex-start', gap:8,
                      }}>
                      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{ph.symbol}</span>
                      <div>
                        <div style={{ fontSize:9.5, fontWeight:600, marginBottom:2 }}>
                          {i+1}. {ph.label}
                          {isActive && <span style={{ marginLeft:6, fontSize:7, letterSpacing:'0.08em', opacity:0.7 }}>● ATIVO</span>}
                        </div>
                        <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.35)', lineHeight:1.4 }}>{ph.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DNA Gene Sliders */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
              ◈ Genes Alquímicos — passe o cursor para explicação
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
              {GENE_MAP.map(g => {
                const v = (dna.genes[g.key] as number | undefined) ?? 0;
                return (
                  <SliderRow key={g.key}
                    label={g.label} alchName={g.alchName}
                    val={v} min={0} max={1} step={0.01} color={g.color}
                    onChange={v2 => onDNAChange({ ...dna, genes: { ...dna.genes, [g.key]: v2 } })}
                    desc={g.desc} practical={g.practical}
                  />
                );
              })}
            </div>

            {/* Presets as Receitas */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
              ◈ Receitas Alquímicas
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:12 }}>
              {[...PRESETS, ...EXTRA_PRESETS].slice(0, 12).map(p => (
                <button key={p.id} onClick={() => { onLoadPreset(p); discover('aether'); }}
                  style={{
                    padding:'6px 8px', borderRadius:4, cursor:'pointer', textAlign:'left', fontSize:8.5,
                    background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)',
                    color:'rgba(255,255,255,0.55)', display:'flex', alignItems:'center', gap:6,
                    transition:'all 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}>
                  <span style={{ fontSize:9 }}>◎</span>
                  {p.name}
                </button>
              ))}
            </div>

            {/* ── Quantum Sequencer ── */}
            <div style={{
              background:'rgba(100,40,200,0.06)', border:'1px solid rgba(120,60,220,0.25)',
              borderRadius:8, padding:'10px 12px',
            }}>
              <div style={{ fontSize:9, color:'rgba(160,100,255,0.8)', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:600, marginBottom:3 }}>
                ⚙ Sequenciador Quântico
              </div>
              <p style={{ fontSize:8, color:'rgba(255,255,255,0.35)', lineHeight:1.55, marginBottom:8 }}>
                Um relógio alquímico de 8 passos. Em cada batida, executa automaticamente uma operação no cânvas. Clique num passo para mudar sua operação.
              </p>
              <p style={{ fontSize:7.5, color:'rgba(160,100,255,0.5)', lineHeight:1.5, marginBottom:8 }}>
                <strong style={{ color:'rgba(160,100,255,0.7)' }}>Como Opus Magnus interage:</strong>{' '}
                cada fase do Opus configura o DNA base; o Sequenciador opera <em>sobre</em> esse DNA, criando variações rítmicas dentro da fase ativa.
              </p>

              {/* Steps */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:2, marginBottom:8 }}>
                {seqSteps.map((op, i) => {
                  const opInfo = ALCHEMY_OPS.find(x => x.id === op);
                  const isCurrent = seqCurrent === i && seqPlaying;
                  return (
                    <button key={i} onClick={() => cycleStep(i)}
                      title={`Passo ${i+1}: ${op} → clique para mudar`}
                      style={{
                        padding:'6px 2px', borderRadius:4, cursor:'pointer',
                        background: isCurrent ? `${opInfo?.color}35` : 'rgba(255,255,255,0.04)',
                        border:`1px solid ${isCurrent ? `${opInfo?.color}99` : 'rgba(255,255,255,0.1)'}`,
                        color: opInfo?.color ?? '#888',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:1,
                        boxShadow: isCurrent ? `0 0 8px ${opInfo?.color}50` : 'none',
                        transition:'all 0.1s',
                      }}>
                      <span style={{ fontSize:11 }}>{opInfo?.symbol}</span>
                      <span style={{ fontSize:5.5, letterSpacing:'0.03em', textTransform:'uppercase' }}>
                        {op === 'SILENCIO' ? '–' : op.slice(0,3)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* BPM + Play */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:8, color:'rgba(255,255,255,0.35)', minWidth:30 }}>BPM</span>
                <input type="range" min={20} max={180} step={2} value={seqBPM}
                  onChange={e => setSeqBPM(parseInt(e.target.value))}
                  style={{ flex:1, cursor:'pointer', accentColor:'#a060ff' }}
                />
                <span style={{ fontFamily:'monospace', fontSize:9, color:'rgba(160,100,255,0.8)', minWidth:28, textAlign:'right' }}>
                  {seqBPM}
                </span>
              </div>

              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => setSeqPlaying(v => !v)}
                  style={{
                    flex:2, padding:'7px 0', borderRadius:5, cursor:'pointer',
                    background: seqPlaying ? 'rgba(100,40,200,0.22)' : 'rgba(100,40,200,0.12)',
                    border:`1px solid rgba(120,60,220,${seqPlaying ? '0.6' : '0.3'})`,
                    color: seqPlaying ? 'rgba(180,130,255,0.95)' : 'rgba(140,90,255,0.7)',
                    fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase',
                  }}>
                  {seqPlaying ? '◼ Parar' : '▶ Iniciar'}
                </button>
                <button onClick={() => { setSeqSteps(Array(8).fill('SILENCIO')); setSeqPlaying(false); }}
                  style={{
                    flex:1, padding:'7px 0', borderRadius:5, cursor:'pointer',
                    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                    color:'rgba(255,255,255,0.3)', fontSize:8, letterSpacing:'0.06em',
                  }}>
                  Reset
                </button>
              </div>

              {seqPlaying && (
                <div style={{ marginTop:6, fontSize:8, color:'rgba(160,100,255,0.55)', textAlign:'center' }}>
                  Passo {seqCurrent + 1}/8 · {ALCHEMY_OPS.find(x => x.id === seqSteps[Math.max(0, seqCurrent)])?.label ?? '–'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ PODERES ═══════════════════════ */}
        {tab === 'poderes' && (
          <div style={{ padding:'10px 10px' }}>

            {/* Alchemical Operations */}
            <div style={{ fontSize:9, color:'rgba(64,192,208,0.75)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:3, fontWeight:600 }}>
              ☿ Operações Alquímicas
            </div>
            <p style={{ fontSize:8, color:'rgba(255,255,255,0.30)', lineHeight:1.55, marginBottom:8 }}>
              Intervenções diretas na matéria. Cada operação altera os genes do DNA em tempo real, visível imediatamente na simulação.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
              {ALCHEMY_OPS.map(op => (
                <button key={op.id} onClick={() => fireOp(op.id)}
                  style={{
                    padding:'9px 10px', borderRadius:6, cursor:'pointer', textAlign:'left',
                    background:`${op.color}0d`, border:`1px solid ${op.color}33`,
                    color:op.color, transition:'all 0.12s', display:'flex', alignItems:'flex-start', gap:8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${op.color}20`; e.currentTarget.style.borderColor=`${op.color}66`; }}
                  onMouseLeave={e => { e.currentTarget.style.background=`${op.color}0d`; e.currentTarget.style.borderColor=`${op.color}33`; }}>
                  <span style={{ fontSize:18, flexShrink:0, lineHeight:1 }}>{op.symbol}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, marginBottom:2, letterSpacing:'0.05em' }}>{op.label}</div>
                    <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.4)', lineHeight:1.45, fontStyle:'italic', marginBottom:2 }}>{op.desc}</div>
                    <div style={{ fontSize:7.5, color:`${op.color}99`, lineHeight:1.4 }}>{op.effect}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quantum Barriers */}
            <div style={{
              background:'rgba(40,80,200,0.06)', border:'1px solid rgba(60,120,220,0.2)',
              borderRadius:8, padding:'10px 12px', marginBottom:10,
            }}>
              <div style={{ fontSize:9, color:'rgba(100,160,255,0.75)', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600, marginBottom:3 }}>
                ⊞ Barreiras Quânticas — Athanors
              </div>
              <p style={{ fontSize:8, color:'rgba(255,255,255,0.35)', lineHeight:1.55, marginBottom:6 }}>
                No contexto alquímico, barreiras são <strong style={{color:'rgba(100,160,255,0.6)'}}>Athanors</strong> — fornos herméticos que criam espaços selados para as reações acontecerem. Sem um Athanor, a transmutação se dissipa.
              </p>
              <p style={{ fontSize:8, color:'rgba(255,255,255,0.3)', lineHeight:1.5, marginBottom:6 }}>
                <span style={{color:'rgba(100,160,255,0.6)'}}>Barreira de Fluxo</span> (ferramenta Flow): canaliza o movimento dos agentes numa direção — perfeita para <strong>Sublimatio</strong>.<br/>
                <span style={{color:'rgba(255,100,180,0.6)'}}>Barreira de Pinch</span> (ferramenta Pinch): comprime e concentra — perfeita para <strong>Coagula</strong> e <strong>Fermentatio</strong>.
              </p>
              <p style={{ fontSize:8, color:'rgba(255,255,255,0.3)', lineHeight:1.5, marginBottom:8 }}>
                Crie barreiras <em>antes</em> de aplicar uma operação para conter a transformação numa área específica do cânvas.
              </p>
              {guideCount > 0 ? (
                <button onClick={onClearGuides}
                  style={{
                    width:'100%', padding:'6px 0', borderRadius:4, cursor:'pointer',
                    background:'rgba(60,120,255,0.1)', border:'1px solid rgba(60,120,255,0.3)',
                    color:'rgba(100,160,255,0.8)', fontSize:8.5, letterSpacing:'0.08em',
                  }}>
                  ✕ Remover {guideCount} Barreira(s)
                </button>
              ) : (
                <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.2)', fontStyle:'italic', textAlign:'center' }}>
                  Nenhuma barreira ativa · Use Fluxo ou Pinch para criar
                </div>
              )}
            </div>

            {/* Quick interventions */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Intervenções Imediatas
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
              {[
                { icon:'💥', label:'Caos',    color:'#ff6040', desc:'Injeta entropia máxima',         onClick:onChaosInject },
                { icon:'❄',  label:'Freeze',  color:'#60c0ff', desc:'Congela todos os agentes',       onClick:onFreezeAll },
                { icon:'⚡',  label:'Pulso',   color:'#ffd060', desc:'Explosão de velocidade',         onClick:onPulseAll },
                { icon:'💫',  label:'Scatter', color:'#c060ff', desc:'Dispersão centrífuga',           onClick:onScatterAll },
                { icon:'🔄',  label:'Respawn', color:'#60ff90', desc:'Respawna no padrão atual',       onClick:onRespawn },
                { icon:'🎲',  label:'Paleta',  color:'#ffa060', desc:'Nova paleta aleatória',          onClick:onRandomPalette },
              ].map(b => (
                <button key={b.label} onClick={b.onClick} title={b.desc}
                  style={{
                    padding:'8px 4px', borderRadius:5, cursor:'pointer',
                    background:`${b.color}10`, border:`1px solid ${b.color}30`,
                    color:`${b.color}cc`, fontSize:8.5, letterSpacing:'0.06em',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    transition:'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${b.color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.background=`${b.color}10`; }}>
                  <span style={{ fontSize:14 }}>{b.icon}</span>
                  <span style={{ textTransform:'uppercase' }}>{b.label}</span>
                  <span style={{ fontSize:6.5, color:'rgba(255,255,255,0.3)', textTransform:'none' }}>{b.desc}</span>
                </button>
              ))}
            </div>

            {/* Cor por Espécie */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Cor por Espécie
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
              {['Luminoso','Sombra','Fluxo','Expansão','Magnético','Glitch'].map((name, i) => {
                const c = palette[i % palette.length] ?? '#888888';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0, border:'1px solid rgba(255,255,255,0.15)' }} />
                    <span style={{ fontSize:8.5, color:'rgba(255,255,255,0.45)', flex:1 }}>{i}· {name}</span>
                    <input type="color" value={c.startsWith('#') ? c : '#888888'}
                      onChange={e => onRecolorSpecies(i, e.target.value)}
                      style={{ width:28, height:20, padding:0, border:'1px solid rgba(255,255,255,0.15)', borderRadius:3, cursor:'pointer', background:'none' }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Hue rotate */}
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
              ◈ Rotação de Matiz
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:4 }}>
              <input type="range" min={0} max={180} step={5} value={hueRotDeg}
                onChange={e => setHueRotDeg(parseInt(e.target.value))}
                style={{ flex:1, cursor:'pointer', accentColor:'#ff80c0' }}
              />
              <button onClick={() => onHueRotate(hueRotDeg)}
                style={{
                  padding:'4px 10px', borderRadius:3, cursor:'pointer', fontSize:8,
                  border:'1px solid rgba(255,100,180,0.3)', background:'rgba(255,100,180,0.1)',
                  color:'rgba(255,150,200,0.9)', letterSpacing:'0.06em',
                }}>
                +{hueRotDeg}°
              </button>
            </div>
            <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
              {[30,60,90,120,180].map(deg => (
                <button key={deg} onClick={() => onHueRotate(deg)}
                  style={{
                    padding:'3px 7px', borderRadius:3, cursor:'pointer', fontSize:7.5,
                    border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)',
                    color:'rgba(255,255,255,0.5)',
                  }}>+{deg}°</button>
              ))}
            </div>

            {/* Lum/Sat */}
            <div style={{ display:'flex', gap:4, marginBottom:10 }}>
              {[
                { icon:'🌑', label:'-Sat', color:'#8080a0', fn:()=>onSatShift(-0.15) },
                { icon:'🎨', label:'+Sat', color:'#ff80ff', fn:()=>onSatShift(+0.15) },
                { icon:'🌙', label:'-Lit', color:'#404060', fn:()=>onLitShift(-0.10) },
                { icon:'☀',  label:'+Lit', color:'#ffe060', fn:()=>onLitShift(+0.10) },
              ].map(b => (
                <button key={b.label} onClick={b.fn}
                  style={{
                    flex:1, padding:'6px 2px', borderRadius:4, cursor:'pointer',
                    border:`1px solid ${b.color}33`, background:`${b.color}11`,
                    color:`${b.color}cc`, fontSize:7.5,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  }}>
                  <span style={{ fontSize:12 }}>{b.icon}</span>
                  <span style={{ textTransform:'uppercase' }}>{b.label}</span>
                </button>
              ))}
            </div>

          </div>
        )}

        <div style={{ height:16 }} />
      </div>
    </div>
  );
};
