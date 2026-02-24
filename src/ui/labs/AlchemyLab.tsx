// ── Alchemy Lab v2.1 — HUD Compacta + Discovery Modal Gamificada ──────────────
import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  AlchemyState, ElementMix, AlchemyLens,
  AlchemyBar, BarType, BAR_COLORS, QuantumSequencer,
} from '../../sim/alchemy/alchemyTypes';
import { createAlchemyState, stepAlchemy, applyOpPulse } from '../../sim/alchemy/alchemyEngine';
import {
  SUBSTANCE_META, SUBSTANCE_ORDER, RECIPES,
  TransmutationState, createTransmutationState,
  getRecipeScore, computeQuintessence,
} from '../../sim/alchemy/alchemyTransmutation';
import { renderAlchemy } from '../../sim/alchemy/alchemyRenderer';
import {
  OPUS_PHASES, createOpusState, diagnosePhase,
  getPhaseTarget, nextPhase, OpusState,
} from '../../sim/alchemy/alchemyOpus';
import {
  GrimoireEntry, createGrimoire, addEntry,
  filterEntries, formatTimestamp,
} from '../../sim/alchemy/alchemyGrimoire';
import { renderGlyph } from '../../sim/alchemy/alchemyGlyphs';
import { ALCHEMY_PRESETS, getPreset } from '../../sim/alchemy/alchemyPresets';
import { createDefaultSequencer, tickSequencer, SEQ_PRESETS } from '../../sim/alchemy/alchemySequencer';
import {
  PERIODIC_ELEMENTS, ELEMENT_BY_Z, INITIAL_DISCOVERED,
  CATEGORY_INFO, CATEGORY_ORDER, meetsRecipe, ChemElement,
} from '../../sim/alchemy/alchemyPeriodicTable';
import { Book, Bookmark, X, Trash2, Play, Pause, Zap, BookOpen, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { FlaskConical, Atom } from 'lucide-react';
import { useZoomPan, screenToWorldAlchemy } from '../../hooks/useZoomPan';
import { ZoomControls } from '../../app/components/ZoomControls';

// ── CSS Animations ────────────────────────────────────────────────────────────
const STYLES = `
@keyframes flash-solve      { 0%{opacity:.5}  70%{opacity:.1} 100%{opacity:0} }
@keyframes flash-coagula    { 0%{opacity:.55} 70%{opacity:.12} 100%{opacity:0} }
@keyframes flash-calcinatio { 0%{opacity:.7}  60%{opacity:.2} 100%{opacity:0} }
@keyframes flash-sublimatio { 0%{opacity:.5}  70%{opacity:.08} 100%{opacity:0} }
@keyframes flash-fermentatio{ 0%{opacity:.45} 70%{opacity:.1} 100%{opacity:0} }
@keyframes flash-putrefactio{ 0%{opacity:.8}  50%{opacity:.4} 100%{opacity:0} }
@keyframes flash-circulatio { 0%{opacity:.45} 70%{opacity:.08} 100%{opacity:0} }
@keyframes flash-fixatio    { 0%{opacity:.55} 70%{opacity:.12} 100%{opacity:0} }
@keyframes orbit-1 { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes orbit-2 { from{transform:rotate(120deg)} to{transform:rotate(480deg)} }
@keyframes orbit-3 { from{transform:rotate(240deg)} to{transform:rotate(600deg)} }
@keyframes nucleus-pulse { 0%,100%{box-shadow:0 0 20px var(--el-color,#fff)} 50%{box-shadow:0 0 50px var(--el-color,#fff)} }
@keyframes modal-in { from{opacity:0;transform:scale(.9) translateY(30px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes badge-bounce { 0%,100%{transform:scale(1)} 40%{transform:scale(1.15)} 60%{transform:scale(.95)} }
@keyframes glow-pulse { 0%,100%{opacity:.65} 50%{opacity:1} }
@keyframes slide-in-left { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes progress-fill { from{width:0} to{width:var(--w)} }
.alchemy-hud-enter { animation: slide-in-left .25s ease-out; }
`;

type FlashType = 'solve'|'coagula'|'calcinatio'|'sublimatio'|'fermentatio'|'putrefactio'|'circulatio'|'fixatio';

const FLASH_COLORS: Record<FlashType, string> = {
  solve:      'rgba(100,170,255,.18)', coagula:     'rgba(255,150,40,.22)',
  calcinatio: 'rgba(255,70,20,.28)',   sublimatio:  'rgba(120,220,255,.18)',
  fermentatio:'rgba(60,210,60,.18)',   putrefactio: 'rgba(90,0,90,.38)',
  circulatio: 'rgba(150,70,255,.18)', fixatio:     'rgba(50,180,180,.22)',
};

const OPS_DATA = [
  { id:'solve'      as FlashType, label:'Solve',        latin:'Solutio',      icon:'◌', color:'#5aafff', desc:'Dissolve — dispersa partículas, separa o fixo do volátil.' },
  { id:'coagula'    as FlashType, label:'Coagula',      latin:'Coagulatio',   icon:'◉', color:'#ffaa30', desc:'Coagula — une partículas, solidifica o volátil em forma estável.' },
  { id:'calcinatio' as FlashType, label:'Calcinatio',   latin:'Calcinatio',   icon:'🔥', color:'#ff5020', desc:'Eleva calor +35%. Purifica pela chama. Desbloqueia elementos de alta temperatura.' },
  { id:'sublimatio' as FlashType, label:'Sublimatio',   latin:'Sublimatio',   icon:'☁', color:'#80e8ff', desc:'Eleva Ar, reduz Terra. O sólido se torna volátil — gases nobres e halogênios.' },
  { id:'fermentatio'as FlashType, label:'Fermentatio',  latin:'Fermentatio',  icon:'🌿', color:'#50dd50', desc:'Equilibra os 4 elementos em 25% cada — ativa Quintessência máxima.' },
  { id:'putrefactio'as FlashType, label:'Putrefactio',  latin:'Putrefactio',  icon:'💀', color:'#aa40aa', desc:'Regride tudo ao Plúmbum — reinicia o ciclo alquímico.' },
  { id:'circulatio' as FlashType, label:'Circulatio',   latin:'Circulatio',   icon:'🌀', color:'#a060ff', desc:'Força orbital circular — COAGULA → SOLVE em ciclo rápido.' },
  { id:'fixatio'    as FlashType, label:'Fixatio',      latin:'Fixatio',      icon:'⚓', color:'#40cccc', desc:'Congela velocidades + reduz calor. Cristaliza o caos em ordem.' },
];

const BAR_META: Record<BarType, { label: string; color: string; icon: string; desc: string }> = {
  attractor:{ label:'Atrator',  color:BAR_COLORS.attractor, icon:'⊕', desc:'Puxa partículas — o forno absorvente' },
  repulsor: { label:'Repulsor', color:BAR_COLORS.repulsor,  icon:'⊗', desc:'Expele partículas — o forno repelente' },
  channel:  { label:'Canal',    color:BAR_COLORS.channel,   icon:'→', desc:'Guia o fluxo em uma direção' },
  barrier:  { label:'Barreira', color:BAR_COLORS.barrier,   icon:'▬', desc:'Barreira quântica — pode ser tunelada' },
  tunnel:   { label:'Túnel',    color:BAR_COLORS.tunnel,    icon:'⊃', desc:'Canal quântico — passagem seletiva' },
};

const ELEM_META = {
  earth:{ sym:'▽', label:'Terra',  color:'#8b7a55', hint:'Solidez · Metais · Minerais' },
  water:{ sym:'▽', label:'Água',   color:'#3a7fa0', hint:'Fluidez · Hidrogênio · Dissolução' },
  air:  { sym:'△', label:'Ar',     color:'#90b0c0', hint:'Volatilidade · Gases · Leveza' },
  fire: { sym:'△', label:'Fogo',   color:'#c8561e', hint:'Reatividade · Calor · Energia' },
} as const;

// ── Element Knob ──────────────────────────────────────────────────────────────
const ElemKnob: React.FC<{ k: keyof ElementMix; value: number; onChange:(v:number)=>void }> = ({ k, value, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{active:boolean;startAngle:number;startValue:number}>({ active:false, startAngle:0, startValue:0 });
  const { sym, label, color, hint } = ELEM_META[k];
  const size=50, cx=25, cy=25, R=20;
  const getAngle = (e:MouseEvent|React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return Math.atan2(e.clientY-(r.top+r.height/2), e.clientX-(r.left+r.width/2))*180/Math.PI;
  };
  const onDown = (e:React.MouseEvent) => { e.preventDefault(); drag.current={active:true,startAngle:getAngle(e),startValue:value}; };
  useEffect(()=>{
    const move=(e:MouseEvent)=>{if(!drag.current.active)return;const da=(getAngle(e)-drag.current.startAngle)/240;onChange(Math.max(.01,Math.min(1,drag.current.startValue+da)));};
    const up=()=>{drag.current.active=false;};
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
  },[onChange]);
  const ang=(d:number):[number,number]=>[cx+R*Math.cos(d*Math.PI/180),cy+R*Math.sin(d*Math.PI/180)];
  const sd=150,[sx,sy]=ang(sd),[ex,ey]=ang(sd+value*240),large=value*240>180?1:0;
  return (
    <div className="flex flex-col items-center gap-0.5 select-none cursor-ns-resize" title={hint} onMouseDown={onDown}>
      <svg ref={svgRef} width={size} height={size} style={{filter:value>0.4?`drop-shadow(0 0 ${value*4}px ${color})`:'none'}}>
        <path d={`M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ang(sd+240)[0]} ${ang(sd+240)[1]}`} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={2.2} strokeLinecap="round"/>
        {value>.01&&<path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" opacity={.85}/>}
        <text x={cx} y={cy+4} textAnchor="middle" fill={color} fontSize={11} fontFamily="serif" opacity={.9}>{sym}</text>
      </svg>
      <div style={{fontSize:6,color:color+'aa',letterSpacing:'.1em',textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:6,color:color+'55',fontFamily:'monospace'}}>{Math.round(value*100)}%</div>
    </div>
  );
};

// ── Heat Slider ───────────────────────────────────────────────────────────────
const HeatSlider: React.FC<{ value:number; onChange:(v:number)=>void }> = ({ value, onChange }) => {
  const hColor = `hsl(${Math.max(0,30-value*32)},88%,52%)`;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:3}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:6.5,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em'}}>⋈ Calor do Atanor</span>
        <span style={{fontSize:8,fontFamily:'monospace',color:hColor}}>{Math.round(value*100)}°</span>
      </div>
      <div style={{position:'relative',height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'visible'}}>
        <div style={{
          position:'absolute',left:0,top:0,height:'100%',
          width:`${value*100}%`,
          background:`linear-gradient(90deg, rgba(100,100,255,.6), ${hColor})`,
          borderRadius:3, transition:'width .05s',
          boxShadow:`0 0 ${value*8}px ${hColor}66`,
        }}/>
        <input type="range" min={0} max={1} step={.01} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))}
          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',margin:0}}/>
      </div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.2)',lineHeight:1.4}}>
        {value < .25 && 'Frio — Gases nobres, elementos leves'}
        {value >= .25 && value < .55 && 'Moderado — Metais de transição, sais'}
        {value >= .55 && value < .80 && 'Quente — Metais pesados, lantanídeos'}
        {value >= .80 && 'Extremo — Actinídeos, elementos sintéticos, Opus RUBEDO'}
      </div>
    </div>
  );
};

// ── Glyph Card ────────────────────────────────────────────────────────────────
const GlyphCard: React.FC<{ entry:GrimoireEntry; onBookmark:()=>void }> = ({ entry, onBookmark }) => {
  const cr = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{ if(cr.current) renderGlyph(cr.current,entry.glyphSpec,36); },[entry.glyphSpec]);
  const phaseColor:Record<string,string>={NIGREDO:'#555',ALBEDO:'#aac',CITRINITAS:'#da0',RUBEDO:'#800'};
  return (
    <div className={`flex gap-2 p-1.5 rounded border ${entry.bookmarked?'border-amber-600/30 bg-amber-900/8':'border-white/[.04] bg-white/[.015]'}`}>
      <canvas ref={cr} width={36} height={36} className="rounded flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {entry.phase&&<span className="text-[5px] font-mono uppercase px-1 rounded" style={{color:phaseColor[entry.phase]??'#888',background:phaseColor[entry.phase]+'18'}}>{entry.phase}</span>}
            {entry.event&&<span className="text-[5px] font-mono px-1 rounded bg-red-900/25 text-red-400">{entry.event}</span>}
            <span className="text-[5px] font-mono text-white/20">{formatTimestamp(entry.timestamp)}</span>
          </div>
          <button onClick={onBookmark} className={`${entry.bookmarked?'text-amber-400':'text-white/15 hover:text-amber-500/40'}`}><Bookmark size={7}/></button>
        </div>
        <p className="text-[6.5px] font-serif text-white/55 leading-snug line-clamp-3 mb-0.5">{entry.text}</p>
        <p className="text-[5.5px] font-mono text-white/2 italic">{entry.causalLine}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── DISCOVERY MODAL — Zoom Gamificado ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
interface DiscoverySnapshot {
  element: ChemElement;
  earth: number; water: number; air: number; fire: number; heat: number;
  opsUsed: string[];
  opusPhase: string | null;
  lapisState: string;
  totalDiscovered: number;
}

const OrbitalDot: React.FC<{ orbit:number; speed:number; color:string; delay?:number }> = ({ orbit, speed, color, delay=0 }) => (
  <div style={{
    position:'absolute', top:'50%', left:'50%',
    width:orbit*2, height:orbit*2,
    marginTop:-orbit, marginLeft:-orbit,
    borderRadius:'50%',
    border:`1px solid ${color}28`,
    animation:`orbit-${(orbit%3)+1} ${speed}s linear infinite`,
    animationDelay:`${delay}s`,
  }}>
    <div style={{
      position:'absolute', top:-3, left:'50%', marginLeft:-3,
      width:6, height:6, borderRadius:'50%',
      background:color, boxShadow:`0 0 8px ${color}`,
      animation:`glow-pulse ${speed*.6}s ease-in-out infinite`,
    }}/>
  </div>
);

const DiscoveryModal: React.FC<{ data: DiscoverySnapshot; onContinue:()=>void; onReplay:()=>void }> = ({ data, onContinue, onReplay }) => {
  const { element: el, earth, water, air, fire, heat, opsUsed, opusPhase, lapisState, totalDiscovered } = data;
  const cat = CATEGORY_INFO[el.cat];
  const [tab, setTab] = useState<'story'|'recipe'|'table'>('story');

  const conditionsText = useMemo(() => {
    const parts: string[] = [];
    const r = el.recipe;
    if (r.earth) parts.push(`Terra ${Math.round(r.earth[0]*100)}-${Math.round(r.earth[1]*100)}%`);
    if (r.water) parts.push(`Água ${Math.round(r.water[0]*100)}-${Math.round(r.water[1]*100)}%`);
    if (r.air)   parts.push(`Ar ${Math.round(r.air[0]*100)}-${Math.round(r.air[1]*100)}%`);
    if (r.fire)  parts.push(`Fogo ${Math.round(r.fire[0]*100)}-${Math.round(r.fire[1]*100)}%`);
    parts.push(`Calor ${Math.round(r.heat[0]*100)}-${Math.round(r.heat[1]*100)}°`);
    if (r.ops?.length) parts.push(`Ops: ${r.ops.join(', ')}`);
    if (r.opusPhase) parts.push(`Opus ${r.opusPhase}`);
    if (r.lapisRequired) parts.push('Lapis Forjada');
    return parts;
  }, [el]);

  const activeConditions = useMemo(() => [
    { label:'Terra',   value:earth, color:ELEM_META.earth.color },
    { label:'Água',    value:water, color:ELEM_META.water.color },
    { label:'Ar',      value:air,   color:ELEM_META.air.color },
    { label:'Fogo',    value:fire,  color:ELEM_META.fire.color },
    { label:'Calor',   value:heat,  color:`hsl(${Math.max(0,30-heat*32)},88%,52%)` },
  ], [earth,water,air,fire,heat]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300,
      background:'rgba(0,0,0,.93)',
      display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(4px)',
    }}>
      <div style={{
        width:520, maxWidth:'90vw', maxHeight:'90vh',
        background:'rgba(8,6,16,.98)',
        border:`1px solid ${cat.color}44`,
        borderRadius:16,
        boxShadow:`0 0 60px ${cat.color}22, 0 0 120px rgba(0,0,0,.8)`,
        display:'flex', flexDirection:'column',
        animation:'modal-in .4s cubic-bezier(.34,1.56,.64,1) forwards',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg, ${cat.color}18 0%, rgba(8,6,16,0) 60%)`,
          borderBottom:`1px solid ${cat.color}25`,
          padding:'20px 24px 16px',
          display:'flex', gap:20, alignItems:'center',
        }}>
          {/* Orbital animation */}
          <div style={{ position:'relative', width:90, height:90, flexShrink:0 }}>
            <OrbitalDot orbit={38} speed={3.2} color={cat.color} delay={0}/>
            <OrbitalDot orbit={28} speed={2.1} color={cat.color} delay={.5}/>
            <OrbitalDot orbit={18} speed={1.4} color={cat.color} delay={1}/>
            {/* Nucleus */}
            <div style={{
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:44, height:44, borderRadius:'50%',
              background:`radial-gradient(circle, ${cat.color}40, ${cat.color}12)`,
              border:`2px solid ${cat.color}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, color:cat.color, fontFamily:'serif', fontWeight:700,
              animation:'nucleus-pulse 2s ease-in-out infinite',
              // @ts-ignore css var
              '--el-color': cat.color,
            }}>
              {el.symbol}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:`${cat.color}99`,letterSpacing:'.2em',textTransform:'uppercase',marginBottom:4}}>
              ✦ Elemento Descoberto · {totalDiscovered}/118
            </div>
            <div style={{fontSize:26,color:'rgba(255,255,255,.95)',fontWeight:700,lineHeight:1,marginBottom:3}}>
              {el.name}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
              <span style={{fontSize:9,fontFamily:'monospace',color:'rgba(255,255,255,.45)'}}>Z = {el.z}</span>
              <span style={{fontSize:9,fontFamily:'monospace',color:'rgba(255,255,255,.25)'}}>·</span>
              <span style={{fontSize:9,fontFamily:'monospace',color:'rgba(255,255,255,.45)'}}>M = {el.mass}</span>
              <span style={{fontSize:9,fontFamily:'monospace',color:'rgba(255,255,255,.25)'}}>·</span>
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:10,background:`${cat.color}22`,color:cat.color,border:`1px solid ${cat.color}44`}}>
                {cat.label}
              </span>
            </div>
            {el.alch && (
              <div style={{fontSize:9,color:`${cat.color}77`,fontStyle:'italic'}}>⚗ {el.alch}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{padding:'12px 24px 0',fontSize:11,color:'rgba(255,255,255,.65)',lineHeight:1.65}}>
          {el.desc}
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', gap:0,
          borderBottom:`1px solid rgba(255,255,255,.06)`,
          padding:'10px 24px 0', marginTop:8,
        }}>
          {(['story','recipe','table'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'5px 12px', borderRadius:'6px 6px 0 0', cursor:'pointer', fontSize:9,
              fontWeight: tab===t?600:400,
              background: tab===t ? `${cat.color}16` : 'transparent',
              border:`1px solid ${tab===t?cat.color+'33':'transparent'}`,
              borderBottom:`2px solid ${tab===t?cat.color:'transparent'}`,
              color: tab===t ? cat.color : 'rgba(255,255,255,.35)',
            }}>
              {t==='story' && '📖 Por que Aconteceu'}
              {t==='recipe' && '⚗ Receita'}
              {t==='table' && '⊞ Na Tabela'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{padding:'14px 24px',flex:1,overflowY:'auto',minHeight:140}}>
          {tab==='story' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{
                padding:'10px 14px', borderRadius:8,
                background:`${cat.color}0c`, border:`1px solid ${cat.color}28`,
                fontSize:10, color:'rgba(255,255,255,.7)', lineHeight:1.7,
              }}>
                {el.recipe.hint}
              </div>

              {/* What happened — conditions */}
              <div style={{fontSize:8,color:'rgba(255,255,255,.3)',letterSpacing:'.1em',textTransform:'uppercase',marginTop:2}}>
                Condições que você criou:
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {activeConditions.map(c => (
                  <div key={c.label} style={{
                    display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                    padding:'6px 10px',borderRadius:6,
                    background:`${c.color}10`,border:`1px solid ${c.color}35`,
                    minWidth:52,
                  }}>
                    <div style={{fontSize:14,fontFamily:'serif',color:c.color}}>{Math.round(c.value*100)}%</div>
                    <div style={{fontSize:7,color:`${c.color}99`,textTransform:'uppercase',letterSpacing:'.08em'}}>{c.label}</div>
                    <div style={{width:'100%',height:2,background:'rgba(255,255,255,.08)',borderRadius:2}}>
                      <div style={{height:'100%',width:`${c.value*100}%`,background:c.color,borderRadius:2}}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra conditions */}
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2}}>
                {opsUsed.length > 0 && opsUsed.slice(0,4).map(op => (
                  <span key={op} style={{
                    fontSize:8,padding:'3px 8px',borderRadius:10,
                    background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',
                    color:'rgba(255,255,255,.5)',
                  }}>✓ {op}</span>
                ))}
                {opusPhase && (
                  <span style={{fontSize:8,padding:'3px 8px',borderRadius:10,background:'rgba(160,80,255,.1)',border:'1px solid rgba(160,80,255,.3)',color:'rgba(200,150,255,.8)'}}>
                    ◈ Opus {opusPhase}
                  </span>
                )}
                {lapisState==='FORGED' && (
                  <span style={{fontSize:8,padding:'3px 8px',borderRadius:10,background:'rgba(255,200,60,.1)',border:'1px solid rgba(255,200,60,.3)',color:'rgba(255,220,100,.8)'}}>
                    ✦ Lapis Forjada
                  </span>
                )}
              </div>
            </div>
          )}

          {tab==='recipe' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:8.5,color:'rgba(255,255,255,.5)',lineHeight:1.65}}>
                Para descobrir <strong style={{color:cat.color}}>{el.name}</strong> novamente você precisa:
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {conditionsText.map((c,i) => (
                  <div key={i} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:6,
                    background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',
                  }}>
                    <span style={{fontSize:9,color:cat.color}}>◦</span>
                    <span style={{fontSize:9,color:'rgba(255,255,255,.65)'}}>{c}</span>
                  </div>
                ))}
                <div style={{
                  marginTop:4,padding:'6px 10px',borderRadius:6,
                  background:'rgba(255,255,255,.02)',
                  fontSize:8,color:'rgba(255,255,255,.3)',lineHeight:1.6,
                  border:'1px solid rgba(255,255,255,.05)',
                }}>
                  ⏱ Mantenha as condições por ~{el.recipe.ticksNeeded * 2}s para a descoberta.
                </div>
              </div>
            </div>
          )}

          {tab==='table' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:8.5,color:'rgba(255,255,255,.5)',lineHeight:1.65}}>
                <strong style={{color:cat.color}}>{el.name}</strong> está no período <strong style={{color:'rgba(255,255,255,.7)'}}>{el.period}</strong>
                {el.group && <>, grupo <strong style={{color:'rgba(255,255,255,.7)'}}>{el.group}</strong></>}.
                É um <strong style={{color:cat.color}}>{cat.label}</strong>.
              </div>
              <div style={{
                padding:'8px 12px', borderRadius:8,
                background:`${cat.color}08`,border:`1px solid ${cat.color}20`,
                fontSize:8.5, color:'rgba(255,255,255,.55)', lineHeight:1.7,
              }}>
                {el.cat==='alcali' && 'Metais Alcalinos reagem violentamente com água liberando Hidrogênio. São muito reativos — o Fogo Alquímico domina.'}
                {el.cat==='alcalino-terroso' && 'Metais Alcalino-Terrosos são menos reativos que alcalinos, mas ainda muito ativos. Terra + Fogo os invocam.'}
                {el.cat==='transicao' && 'Metais de Transição são versáteis — condutores, catalíticos, coloridos. Terra dominante + calor os revelam.'}
                {el.cat==='lantanideo' && 'Lantanídeos são terras raras usadas em tecnologia moderna. Requerem o Opus Magnus (fase NIGREDO a RUBEDO).'}
                {el.cat==='actinineo' && 'Actinídeos são radioativos. Muitos são sintéticos — apenas criados em reatores. O Lapis é necessário.'}
                {el.cat==='nao-metal' && 'Não-Metais são a base da química orgânica e atmosférica. Ar e Água os invocam com facilidade.'}
                {el.cat==='halogeno' && 'Halogênios são reativos, formam sais. Ar + Fogo (e às vezes Água) criam as condições para eles emergirem.'}
                {el.cat==='gas-nobre' && 'Gases Nobres são inertes — não reagem. Use SUBLIMATIO com Ar dominante e baixo calor para isolá-los.'}
                {el.cat==='semi-metal' && 'Semi-metais (metaloides) têm propriedades intermediárias. Terra + Ar ou Terra + Fogo os cristalizam.'}
                {el.cat==='metal-representativo' && 'Metais Representativos são estáveis e versáteis. Terra + calor moderado os forma.'}
                {el.cat==='desconhecido' && 'Elementos com propriedades ainda não totalmente conhecidas. São sintéticos e extremamente instáveis.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{
          padding:'12px 24px', borderTop:`1px solid rgba(255,255,255,.06)`,
          display:'flex', gap:8, justifyContent:'flex-end',
          background:'rgba(8,6,16,.6)',
        }}>
          <button onClick={onReplay} style={{
            padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:10,
            background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)',
            color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:5,
          }}>
            <RotateCcw size={11}/> Replay
          </button>
          <button onClick={onContinue} style={{
            padding:'8px 22px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700,
            background:`linear-gradient(135deg, ${cat.color}30, ${cat.color}18)`,
            border:`1px solid ${cat.color}55`,
            color:cat.color,display:'flex',alignItems:'center',gap:6,
            boxShadow:`0 0 20px ${cat.color}25`,
          }}>
            Continuar a Obra ▶
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── TABELA TAB ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const Tabela: React.FC<{
  discovered: Set<number>;
  progress: Map<number, number>;
}> = ({ discovered, progress }) => {
  const [hoveredZ, setHoveredZ] = useState<number|null>(null);

  const grid = useMemo(() => {
    const g: (ChemElement|null)[][] = Array.from({length:9}, ()=>Array(18).fill(null));
    for (const el of PERIODIC_ELEMENTS) g[el.row-1][el.col-1] = el;
    return g;
  }, []);

  const nearDiscovery = useMemo(() => {
    return PERIODIC_ELEMENTS
      .filter(el => !discovered.has(el.z) && (progress.get(el.z)??0) > 0)
      .sort((a,b)=>{
        const pa=(progress.get(a.z)??0)/a.recipe.ticksNeeded;
        const pb=(progress.get(b.z)??0)/b.recipe.ticksNeeded;
        return pb-pa;
      })
      .slice(0,4);
  }, [discovered, progress]);

  const hoveredEl = hoveredZ ? ELEMENT_BY_Z.get(hoveredZ) : null;

  return (
    <div style={{padding:'8px 8px 6px',display:'flex',flexDirection:'column',gap:7}}>
      {/* Counter */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:6.5,color:'rgba(255,255,255,.3)',letterSpacing:'.12em',textTransform:'uppercase'}}>
          ⊞ Tabela Periódica
        </div>
        <div style={{fontSize:9,fontFamily:'monospace',color:'rgba(255,255,255,.5)'}}>
          <span style={{color:'#80ff80'}}>{discovered.size}</span>
          <span style={{color:'rgba(255,255,255,.2)'}}>/118</span>
        </div>
      </div>

      {/* Progress bar total */}
      <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${discovered.size/118*100}%`,background:'linear-gradient(90deg,#6040c0,#80ff80)',borderRadius:2,transition:'width .5s'}}/>
      </div>

      {/* Near discovery hints */}
      {nearDiscovery.length > 0 && (
        <div style={{borderRadius:6,background:'rgba(255,200,60,.04)',border:'1px solid rgba(255,200,60,.12)',padding:'6px 8px'}}>
          <div style={{fontSize:6,color:'rgba(255,200,60,.65)',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:5}}>
            🔍 Próximo da Descoberta
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {nearDiscovery.map(el => {
              const prog = (progress.get(el.z)??0)/el.recipe.ticksNeeded;
              const cat = CATEGORY_INFO[el.cat];
              return (
                <div key={el.z} style={{display:'flex',alignItems:'center',gap:6}}
                  onMouseEnter={()=>setHoveredZ(el.z)}
                  onMouseLeave={()=>setHoveredZ(null)}>
                  <div style={{
                    width:20,height:20,borderRadius:3,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:8,fontWeight:700,fontFamily:'monospace',
                    background:`${cat.color}22`,border:`1px solid ${cat.color}55`,color:cat.color,
                  }}>{el.symbol}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                      <span style={{fontSize:7,color:'rgba(255,255,255,.55)'}}>{el.name}</span>
                      <span style={{fontSize:6.5,fontFamily:'monospace',color:cat.color}}>{Math.round(prog*100)}%</span>
                    </div>
                    <div style={{height:2.5,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${prog*100}%`,background:cat.color,borderRadius:2,transition:'width .5s'}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{overflowX:'auto',overflowY:'visible'}}>
        <div style={{
          display:'grid',
          gridTemplateRows:`repeat(9, 13px)`,
          gridTemplateColumns:`6px repeat(18, 12px)`,
          gap:1, minWidth:230,
        }}>
          {grid.map((row,ri) => (
            <React.Fragment key={ri}>
              <div style={{
                fontSize:5,color:'rgba(255,255,255,.18)',
                display:'flex',alignItems:'center',justifyContent:'flex-end',
                paddingRight:1,gridRow:ri+1,gridColumn:1,
              }}>
                {ri===7?'—':ri===8?'Ln':ri===9?'An':ri+1}
              </div>
              {row.map((el,ci) => {
                if (!el) return <div key={ci} style={{gridRow:ri+1,gridColumn:ci+2,width:12,height:13}}/>;
                const isDisc = discovered.has(el.z);
                const prog = (progress.get(el.z)??0)/el.recipe.ticksNeeded;
                const c = CATEGORY_INFO[el.cat];
                return (
                  <div key={ci} style={{gridRow:ri+1,gridColumn:ci+2}}
                    onMouseEnter={()=>setHoveredZ(el.z)}
                    onMouseLeave={()=>setHoveredZ(null)}>
                    <div style={{
                      width:12,height:13,borderRadius:1,border:'1px solid',cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:4.5,fontFamily:'monospace',fontWeight:700,
                      transition:'all .15s',
                      background: isDisc ? `${c.color}25` : prog>0 ? `${c.dim}18` : 'rgba(255,255,255,.015)',
                      borderColor: isDisc ? `${c.color}80` : prog>0 ? `${c.color}${Math.round(prog*160).toString(16).padStart(2,'0')}` : 'rgba(255,255,255,.07)',
                      color: isDisc ? c.color : prog>0 ? c.dim : 'rgba(255,255,255,.2)',
                      boxShadow: isDisc ? `0 0 3px ${c.color}33` : 'none',
                      animation: prog>0&&!isDisc ? 'glow-pulse 1.8s ease-in-out infinite' : 'none',
                    }}>
                      {el.symbol.slice(0,2)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Hovered info */}
      {hoveredEl && (
        <div style={{
          borderRadius:6,padding:'8px 10px',
          background:`${CATEGORY_INFO[hoveredEl.cat].color}0c`,
          border:`1px solid ${CATEGORY_INFO[hoveredEl.cat].color}33`,
        }}>
          <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
            <span style={{
              fontSize:20,fontFamily:'serif',fontWeight:700,lineHeight:1,
              color:CATEGORY_INFO[hoveredEl.cat].color,
              opacity:discovered.has(hoveredEl.z)?1:.4,
            }}>{hoveredEl.symbol}</span>
            <div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.85)',fontWeight:600}}>{hoveredEl.name}</div>
              <div style={{fontSize:7,color:'rgba(255,255,255,.3)',fontFamily:'monospace'}}>Z={hoveredEl.z} · {CATEGORY_INFO[hoveredEl.cat].label}</div>
            </div>
            <div style={{marginLeft:'auto',fontSize:9,color:discovered.has(hoveredEl.z)?'#80ff80':'rgba(255,255,255,.2)'}}>
              {discovered.has(hoveredEl.z)?'✓':'○'}
            </div>
          </div>
          {hoveredEl.alch && <div style={{fontSize:7,color:`${CATEGORY_INFO[hoveredEl.cat].color}77`,fontStyle:'italic',marginBottom:4}}>⚗ {hoveredEl.alch}</div>}
          <div style={{fontSize:7.5,color:'rgba(255,255,255,.55)',lineHeight:1.55,marginBottom:5}}>{hoveredEl.desc}</div>
          {!discovered.has(hoveredEl.z) && (
            <div style={{fontSize:7,color:'rgba(255,220,80,.75)',lineHeight:1.55,padding:'4px 6px',background:'rgba(255,200,60,.06)',borderRadius:4}}>
              💡 {hoveredEl.recipe.hint}
            </div>
          )}
          {!discovered.has(hoveredEl.z) && (progress.get(hoveredEl.z)??0)>0 && (
            <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden',marginTop:5}}>
              <div style={{
                height:'100%',
                width:`${(progress.get(hoveredEl.z)??0)/hoveredEl.recipe.ticksNeeded*100}%`,
                background:CATEGORY_INFO[hoveredEl.cat].color,borderRadius:2,
              }}/>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 6px',paddingTop:4,borderTop:'1px solid rgba(255,255,255,.05)'}}>
        {CATEGORY_ORDER.map(c=>(
          <div key={c} style={{display:'flex',alignItems:'center',gap:3}}>
            <div style={{width:7,height:7,borderRadius:1,background:`${CATEGORY_INFO[c].color}35`,border:`1px solid ${CATEGORY_INFO[c].color}55`}}/>
            <span style={{fontSize:5,color:'rgba(255,255,255,.25)'}}>{CATEGORY_INFO[c].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── ATANOR TAB ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const Atanor: React.FC<{
  elements: ElementMix; heat: number; transmutation: TransmutationState;
  quintessence: number; recipeScores: Record<string,number>;
  simSpeed: number;
  onElement:(k:keyof ElementMix,v:number)=>void;
  onHeat:(v:number)=>void; onPreset:(id:string)=>void;
  onSimSpeed:(v:number)=>void;
}> = ({ elements, heat, transmutation, quintessence, recipeScores, simSpeed, onElement, onHeat, onPreset, onSimSpeed }) => (
  <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:10}}>
    <div style={{fontSize:7,color:'rgba(255,180,60,.7)',letterSpacing:'.12em',textTransform:'uppercase'}}>⋈ Atanor — Forno Alquímico</div>

    {/* Tip */}
    <div style={{fontSize:7,color:'rgba(255,255,255,.4)',lineHeight:1.6,background:'rgba(255,180,60,.04)',borderRadius:4,padding:'5px 8px',border:'1px solid rgba(255,180,60,.1)'}}>
      Ajuste os <strong style={{color:'rgba(255,200,100,.8)'}}>4 Elementos</strong> e o
      <strong style={{color:'rgba(255,120,60,.8)'}}> Calor</strong> para criar condições de descoberta.
    </div>

    {/* Simulation speed */}
    <div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.22)',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4}}>
        Velocidade da Simulação
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:8,minWidth:16,textAlign:'right',fontFamily:'monospace',
          color: simSpeed < 0.2 ? '#60c8f0' : simSpeed < 0.7 ? '#a0c080' : '#ffa030'}}>
          {simSpeed < 0.15 ? '🐢' : simSpeed < 0.6 ? '🌊' : '⚡'} {Math.round(simSpeed * 100)}%
        </span>
        <input type="range" min={0.05} max={2.0} step={0.05} value={simSpeed}
          onChange={e=>onSimSpeed(+e.target.value)}
          style={{flex:1, accentColor:'#ffa030', cursor:'pointer'}}/>
        <div style={{display:'flex',gap:2}}>
          {[0.15, 0.4, 1.0].map(v=>(
            <button key={v} onClick={()=>onSimSpeed(v)} style={{
              fontSize:6, padding:'1px 4px', borderRadius:2, cursor:'pointer', border:'none',
              background: Math.abs(simSpeed-v)<0.03 ? 'rgba(255,160,60,.25)' : 'rgba(255,255,255,.05)',
              color: Math.abs(simSpeed-v)<0.03 ? 'rgba(255,180,80,.9)' : 'rgba(255,255,255,.3)',
            }}>{v===0.15?'Lento':v===0.4?'Médio':'Normal'}</button>
          ))}
        </div>
      </div>
    </div>

    {/* Element knobs */}
    <div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.22)',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:5}}>Proporção dos Elementos</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:2,alignItems:'end'}}>
        {(Object.keys(ELEM_META) as (keyof ElementMix)[]).map(k=>(
          <ElemKnob key={k} k={k} value={elements[k]} onChange={v=>onElement(k,v)}/>
        ))}
      </div>
    </div>

    {/* Heat */}
    <HeatSlider value={heat} onChange={onHeat}/>

    {/* Quintessence */}
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
        <span style={{fontSize:6.5,color:'rgba(255,255,255,.28)',textTransform:'uppercase',letterSpacing:'.08em'}}>Quintessência</span>
        <span style={{fontSize:7,fontFamily:'monospace',color:quintessence>.7?'#ffd060':'rgba(255,255,255,.4)'}}>{Math.round(quintessence*100)}%</span>
      </div>
      <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${quintessence*100}%`,background:'linear-gradient(90deg,#c060ff,#ffd060)',borderRadius:2,transition:'width .4s'}}/>
      </div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.22)',marginTop:2}}>= 1 quando os 4 elementos estão a 25% cada</div>
    </div>

    {/* Substances */}
    <div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.22)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Substâncias no Atanor</div>
      <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
        {SUBSTANCE_ORDER.map(sub=>{
          const meta=SUBSTANCE_META[sub]; const count=transmutation.counts[sub]??0;
          return (
            <div key={sub} style={{
              display:'flex',alignItems:'center',gap:3,padding:'3px 6px',borderRadius:4,
              background:count>0?meta.color+'16':'rgba(255,255,255,.02)',
              border:`1px solid ${count>0?meta.color+'40':'rgba(255,255,255,.05)'}`,
              opacity:count>0?1:.4,
            }}>
              <span style={{fontSize:9,lineHeight:1}}>{meta.symbol}</span>
              <div>
                <div style={{fontSize:6.5,color:meta.color,fontFamily:'serif',fontWeight:600}}>{meta.label}</div>
                <div style={{fontSize:5.5,color:'rgba(255,255,255,.3)',fontFamily:'monospace'}}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Active recipes */}
    <div>
      <div style={{fontSize:6,color:'rgba(255,255,255,.22)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Transmutações Ativas</div>
      {RECIPES.map(r=>{
        const score=recipeScores[r.id]??0; if(score<.05) return null;
        return (
          <div key={r.id} style={{padding:'4px 7px',borderRadius:4,background:'rgba(255,255,255,.02)',border:`1px solid rgba(80,255,80,${(score*.3).toFixed(2)})`,marginBottom:3}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
              <span style={{fontSize:7.5,color:'rgba(255,255,255,.65)',fontStyle:'italic'}}>{r.name}</span>
              <div style={{width:35,height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden',marginTop:1}}>
                <div style={{height:'100%',width:`${score*100}%`,background:'#60ff90',borderRadius:2}}/>
              </div>
            </div>
            <div style={{fontSize:6.5,color:'rgba(255,255,255,.38)',lineHeight:1.45}}>{r.hint}</div>
          </div>
        );
      }).filter(Boolean)}
      {RECIPES.every(r=>(recipeScores[r.id]??0)<.05)&&(
        <div style={{fontSize:7,color:'rgba(255,255,255,.18)',fontStyle:'italic'}}>Ajuste os elementos para ativar...</div>
      )}
    </div>

    {/* Preset */}
    <select onChange={e=>{if(e.target.value)onPreset(e.target.value);}} defaultValue=""
      style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.55)',fontSize:9,padding:'4px 6px',borderRadius:4,cursor:'pointer'}}>
      <option value="">— Preset Alquímico —</option>
      {ALCHEMY_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name} — {p.subtitle}</option>)}
    </select>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── OPUS TAB ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const OpusTab: React.FC<{
  opus: OpusState; sequencer: QuantumSequencer;
  onStartOpus:()=>void; onSeqToggle:()=>void;
  onSeqBpm:(v:number)=>void; onSeqPreset:(id:string)=>void; onSeqQuantum:()=>void;
}> = ({ opus, sequencer, onStartOpus, onSeqToggle, onSeqBpm, onSeqPreset, onSeqQuantum }) => {
  const PHASES = [
    { id:'NIGREDO' as const,    sym:'◼', color:'#664444', label:'Nigredo',    desc:'Putrefação — calor médio, terra+água, alta tensão' },
    { id:'ALBEDO' as const,     sym:'◽', color:'#b0b8d0', label:'Albedo',     desc:'Lavagem — calor baixo, água+ar, alta integração' },
    { id:'CITRINITAS' as const, sym:'◐', color:'#d4a020', label:'Citrinitas', desc:'Amarelecimento — equilíbrio, calor médio' },
    { id:'RUBEDO' as const,     sym:'◉', color:'#aa2020', label:'Rubedo',     desc:'Vermelhidão — fogo+terra, calor alto, grande obra' },
  ];
  return (
    <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:9}}>
      <div style={{fontSize:7,color:'rgba(255,160,80,.7)',letterSpacing:'.12em',textTransform:'uppercase'}}>☿ Opus Magnus — A Grande Obra</div>
      <div style={{fontSize:7,color:'rgba(255,255,255,.4)',lineHeight:1.6,background:'rgba(160,60,255,.04)',borderRadius:4,padding:'5px 8px',border:'1px solid rgba(160,60,255,.12)'}}>
        4 fases alquímicas que transformam <strong style={{color:'rgba(180,120,255,.9)'}}>Chumbo</strong> em <strong style={{color:'#ffd060'}}>Ouro</strong>.
        Cada fase exige condições específicas de elementos e métricas.
      </div>

      {/* Phases */}
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        {PHASES.map((ph,idx)=>{
          const isActive=opus.active&&opus.phase===ph.id;
          const isDone=opus.completed.includes(ph.id);
          const prog=isActive?opus.timer/opus.maxTimer:(isDone?1:0);
          return (
            <div key={ph.id} style={{
              padding:'5px 8px',borderRadius:5,
              background:isActive?`${ph.color}18`:isDone?'rgba(80,220,80,.05)':'rgba(255,255,255,.02)',
              border:`1px solid ${isActive?ph.color+'50':isDone?'rgba(80,220,80,.2)':'rgba(255,255,255,.05)'}`,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:isDone||isActive?3:0}}>
                <span style={{fontSize:12,color:ph.color,opacity:isDone||isActive?1:.3}}>{ph.sym}</span>
                <span style={{fontSize:8.5,color:isDone?'#80ff80':isActive?ph.color:'rgba(255,255,255,.3)',fontWeight:isDone||isActive?600:400}}>
                  {ph.label}
                </span>
                {isDone&&<span style={{fontSize:7,color:'#80ff80',marginLeft:'auto'}}>✓ Completo</span>}
                {isActive&&<span style={{fontSize:7,fontFamily:'monospace',color:ph.color,marginLeft:'auto'}}>{Math.round(prog*100)}%</span>}
              </div>
              <div style={{fontSize:6.5,color:'rgba(255,255,255,.35)',lineHeight:1.4,marginBottom:isActive?3:0}}>{ph.desc}</div>
              {isActive&&(
                <div style={{height:2,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${prog*100}%`,background:ph.color,borderRadius:2,transition:'width .5s'}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={onStartOpus} style={{
        width:'100%',padding:'7px',borderRadius:6,cursor:'pointer',
        background:opus.active?'rgba(220,60,60,.1)':'rgba(160,60,255,.14)',
        border:`1px solid ${opus.active?'rgba(220,60,60,.3)':'rgba(160,80,255,.4)'}`,
        color:opus.active?'rgba(255,120,120,.9)':'rgba(200,140,255,.9)',
        fontSize:9,letterSpacing:'.08em',textTransform:'uppercase',fontWeight:600,
      }}>
        {opus.active?`✕ Cancelar (${opus.phase})`:'◈ Iniciar Opus Magnus'}
      </button>

      {/* Sequencer */}
      <div style={{borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:7}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{fontSize:6.5,color:'rgba(255,255,255,.25)',textTransform:'uppercase',letterSpacing:'.08em'}}>Sequenciador Quântico</div>
          <button onClick={onSeqToggle} style={{
            padding:'2px 8px',borderRadius:3,cursor:'pointer',fontSize:7,
            background:sequencer.active?'rgba(80,220,80,.14)':'rgba(255,255,255,.04)',
            border:`1px solid ${sequencer.active?'rgba(80,220,80,.35)':'rgba(255,255,255,.1)'}`,
            color:sequencer.active?'rgba(120,255,120,.9)':'rgba(255,255,255,.38)',
          }}>{sequencer.active?'■ Stop':'▶ Start'}</button>
        </div>
        <div style={{display:'flex',gap:2,marginBottom:5}}>
          {sequencer.steps.map((step,i)=>{
            const isActive=sequencer.active&&sequencer.cursor===i;
            const sc=step.op==='SOLVE'?'#5aafff':step.op==='COAGULA'?'#ffaa30':'#60ff90';
            return (
              <div key={i} style={{
                flex:1,height:20,borderRadius:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0,
                background:isActive?`${sc}28`:step.active?'rgba(255,255,255,.05)':'rgba(255,255,255,.015)',
                border:`1px solid ${isActive?`${sc}60`:step.active?'rgba(255,255,255,.1)':'rgba(255,255,255,.04)'}`,
                boxShadow:isActive?`0 0 5px ${sc}44`:'none',transition:'all .1s',
              }}>
                <span style={{fontSize:6.5,color:isActive?sc:'rgba(255,255,255,.28)',lineHeight:1}}>{step.label}</span>
                {step.active&&<div style={{width:3,height:3,borderRadius:'50%',background:sc,marginTop:1,opacity:.65}}/>}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <span style={{fontSize:6,color:'rgba(255,255,255,.3)',minWidth:20}}>BPM</span>
          <input type="range" min={30} max={300} step={1} value={sequencer.bpm}
            onChange={e=>onSeqBpm(+e.target.value)}
            style={{flex:1,accentColor:'#a060ff',cursor:'pointer'}}/>
          <span style={{fontSize:8,fontFamily:'monospace',color:'rgba(255,255,255,.45)',minWidth:28}}>{sequencer.bpm}</span>
        </div>
        <div style={{display:'flex',gap:3,marginTop:4,flexWrap:'wrap'}}>
          {SEQ_PRESETS.map(p=>(
            <button key={p.id} onClick={()=>onSeqPreset(p.id)} style={{
              padding:'2px 6px',borderRadius:3,cursor:'pointer',fontSize:6.5,
              background:'rgba(160,80,255,.07)',border:'1px solid rgba(160,80,255,.18)',color:'rgba(200,150,255,.65)',
            }}>{p.id}</button>
          ))}
          <button onClick={onSeqQuantum} style={{
            padding:'2px 6px',borderRadius:3,cursor:'pointer',fontSize:6.5,
            background:sequencer.quantum?'rgba(255,200,60,.1)':'rgba(255,255,255,.03)',
            border:`1px solid ${sequencer.quantum?'rgba(255,200,60,.3)':'rgba(255,255,255,.08)'}`,
            color:sequencer.quantum?'rgba(255,220,100,.8)':'rgba(255,255,255,.28)',
          }}>⚛ Quantum</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCANA TAB ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const Arcana: React.FC<{
  onOp:(op:FlashType)=>void; opsUsed:Set<string>;
  bars:AlchemyBar[]; barTool:BarType|null;
  onBarTool:(t:BarType|null)=>void;
  onDeleteBar:(id:number)=>void; onToggleBar:(id:number)=>void;
  onBarStrength:(id:number,v:number)=>void;
  lens:AlchemyLens; onLens:(l:AlchemyLens)=>void;
}> = ({ onOp, opsUsed, bars, barTool, onBarTool, onDeleteBar, onToggleBar, onBarStrength, lens, onLens }) => {
  const [hovered, setHovered] = useState<typeof OPS_DATA[0]|null>(null);
  return (
    <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:9}}>
      <div style={{fontSize:7,color:'rgba(255,80,200,.7)',letterSpacing:'.12em',textTransform:'uppercase'}}>⚡ Arcana — Operações &amp; Poderes</div>

      {/* Operations grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
        {OPS_DATA.map(op=>{
          const used=opsUsed.has(op.id.toUpperCase());
          return (
            <button key={op.id} onClick={()=>onOp(op.id)}
              onMouseEnter={()=>setHovered(op)} onMouseLeave={()=>setHovered(null)}
              style={{
                padding:'5px 4px',borderRadius:5,cursor:'pointer',
                background:used?`${op.color}12`:'rgba(255,255,255,.03)',
                border:`1px solid ${used?`${op.color}40`:'rgba(255,255,255,.08)'}`,
                display:'flex',flexDirection:'column',alignItems:'center',gap:1.5,transition:'all .12s',
              }}>
              <span style={{fontSize:13,lineHeight:1}}>{op.icon}</span>
              <span style={{fontSize:6.5,color:used?op.color:'rgba(255,255,255,.45)',fontWeight:600}}>{op.label}</span>
              <span style={{fontSize:5.5,color:'rgba(255,255,255,.22)',fontStyle:'italic'}}>{op.latin}</span>
            </button>
          );
        })}
      </div>
      {hovered&&(
        <div style={{padding:'5px 8px',borderRadius:4,background:`${hovered.color}0a`,border:`1px solid ${hovered.color}28`,fontSize:7,color:'rgba(255,255,255,.55)',lineHeight:1.55}}>
          <strong style={{color:hovered.color}}>{hovered.label}</strong> — {hovered.desc}
        </div>
      )}

      {/* Lens */}
      <div>
        <div style={{fontSize:6,color:'rgba(255,255,255,.22)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Lente de Visualização</div>
        <div style={{display:'flex',gap:2}}>
          {(['SIGIL','FIELD','EVENTS','LAPIS'] as AlchemyLens[]).map(l=>(
            <button key={l} onClick={()=>onLens(l)} style={{
              flex:1,padding:'3px 2px',borderRadius:3,cursor:'pointer',fontSize:6,fontFamily:'monospace',
              background:lens===l?'rgba(255,255,255,.09)':'rgba(255,255,255,.02)',
              border:`1px solid ${lens===l?'rgba(255,255,255,.28)':'rgba(255,255,255,.06)'}`,
              color:lens===l?'rgba(255,255,255,.8)':'rgba(255,255,255,.28)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Bar tools */}
      <div>
        <div style={{fontSize:6,color:'rgba(255,255,255,.22)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>
          Atanores &amp; Barreiras
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {(Object.keys(BAR_META) as BarType[]).map(bt=>{
            const m=BAR_META[bt];
            return (
              <button key={bt} onClick={()=>onBarTool(barTool===bt?null:bt)} style={{
                padding:'4px 7px',borderRadius:4,cursor:'pointer',textAlign:'left',
                background:barTool===bt?`${m.color}16`:'rgba(255,255,255,.025)',
                border:`1px solid ${barTool===bt?`${m.color}50`:'rgba(255,255,255,.06)'}`,
                display:'flex',alignItems:'center',gap:6,
              }}>
                <span style={{fontSize:10,color:m.color,opacity:barTool===bt?1:.5}}>{m.icon}</span>
                <div>
                  <div style={{fontSize:7,color:barTool===bt?m.color:'rgba(255,255,255,.4)',fontWeight:barTool===bt?600:400}}>{m.label}</div>
                  <div style={{fontSize:5.5,color:'rgba(255,255,255,.2)'}}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {barTool&&(
          <div style={{marginTop:4,padding:'3px 7px',borderRadius:3,background:'rgba(255,200,100,.04)',border:'1px solid rgba(255,200,100,.12)',fontSize:7,color:'rgba(255,200,80,.75)'}}>
            🖱 Arraste no canvas para criar {BAR_META[barTool].label}
          </div>
        )}
        {bars.length>0&&(
          <div style={{marginTop:5,display:'flex',flexDirection:'column',gap:2}}>
            {bars.map(bar=>{
              const m=BAR_META[bar.type];
              return (
                <div key={bar.id} style={{
                  display:'flex',alignItems:'center',gap:2,padding:'3px 6px',borderRadius:4,
                  background:bar.active?'rgba(255,255,255,.03)':'rgba(255,255,255,.01)',
                  border:`1px solid ${bar.active?'rgba(255,255,255,.08)':'rgba(255,255,255,.03)'}`,
                  opacity:bar.active?1:.45,
                }}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:m.color,flexShrink:0}}/>
                  <div style={{flex:1,fontSize:6,color:`${m.color}bb`}}>{m.icon} {m.label}</div>
                  <input type="range" min={.1} max={1} step={.05} value={bar.strength}
                    onChange={e=>onBarStrength(bar.id,+e.target.value)}
                    style={{width:36,accentColor:m.color,cursor:'pointer'}}/>
                  <button onClick={()=>onToggleBar(bar.id)} style={{fontSize:5.5,padding:'1px 4px',borderRadius:2,cursor:'pointer',background:'rgba(255,255,255,.05)',border:'none',color:'rgba(255,255,255,.35)'}}>
                    {bar.active?'ON':'OFF'}
                  </button>
                  <button onClick={()=>onDeleteBar(bar.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,60,60,.5)',padding:0}}>
                    <Trash2 size={8}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
interface AlchemyLabProps { active: boolean; }
export const AlchemyLab: React.FC<AlchemyLabProps> = ({ active }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const stateRef    = useRef<AlchemyState|null>(null);
  const rafRef      = useRef(0);
  const lastTRef    = useRef(0);
  const runningRef  = useRef(true);

  const zoomPan = useZoomPan();

  const [elements, setElements] = useState<ElementMix>(ALCHEMY_PRESETS[1].elements);
  const [heat, setHeat]         = useState(ALCHEMY_PRESETS[1].heat);
  const [simSpeed, setSimSpeed] = useState(0.4);
  const [lens, setLens]         = useState<AlchemyLens>('SIGIL');
  const [running, setRunning]   = useState(true);
  const [leftTab, setLeftTab]   = useState<'tabela'|'atanor'|'opus'|'arcana'>('atanor');
  const [hudOpen, setHudOpen]   = useState(true);

  const [opus, setOpus]         = useState<OpusState>(createOpusState());
  const [grimoire, setGrimoire] = useState<GrimoireEntry[]>(createGrimoire());
  const [showGrim, setShowGrim] = useState(false);
  const [grimFilter, setGrimFilter] = useState<string|null>(null);

  const [bars, setBars]         = useState<AlchemyBar[]>([]);
  const [barTool, setBarTool]   = useState<BarType|null>(null);
  const [drawingBar, setDrawingBar] = useState<{x1:number;y1:number}|null>(null);
  const nextBarIdRef = useRef(1);

  const [sequencer, setSequencer] = useState<QuantumSequencer>(createDefaultSequencer());
  const [transmutation, setTransmutation] = useState<TransmutationState>(createTransmutationState());

  // Discovery
  const [discoveredElements, setDiscoveredElements] = useState<Set<number>>(new Set(INITIAL_DISCOVERED));
  const [elementProgress, setElementProgress]       = useState<Map<number,number>>(new Map());
  const [discoveryModal, setDiscoveryModal]         = useState<DiscoverySnapshot|null>(null);
  const [opsUsed, setOpsUsed]                       = useState<Set<string>>(new Set());
  const [activeFlash, setActiveFlash]               = useState<{type:FlashType;key:number}|null>(null);

  // Slow-mo + pre-discovery zoom (all in refs — used inside RAF)
  const simSpeedRef      = useRef(0.4);
  const slowMoRef        = useRef(1.0);
  const preDiscoRef      = useRef<{name:string;symbol:string;color:string;progress:number;hotX:number;hotY:number}|null>(null);
  const discoveryOpenRef = useRef(false);

  const discRef     = useRef<Set<number>>(new Set(INITIAL_DISCOVERED));
  const progressRef = useRef<Map<number,number>>(new Map());
  const opsUsedRef  = useRef<Set<string>>(new Set());
  const elemRef     = useRef(elements);
  const heatRef     = useRef(heat);
  const lensRef     = useRef<AlchemyLens>('SIGIL');
  const opusRef     = useRef<OpusState>(createOpusState());
  const grimoireRef = useRef<GrimoireEntry[]>([]);
  const barsRef     = useRef<AlchemyBar[]>([]);
  const seqRef      = useRef<QuantumSequencer>(createDefaultSequencer());
  const opusTargetRef = useRef<{mix:ElementMix;heat:number}|null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{ elemRef.current=elements; if(stateRef.current) stateRef.current.elements={...elements}; },[elements]);
  useEffect(()=>{ heatRef.current=heat;     if(stateRef.current) stateRef.current.heat=heat; },[heat]);
  useEffect(()=>{ lensRef.current=lens; },[lens]);
  useEffect(()=>{ opusRef.current=opus; },[opus]);
  useEffect(()=>{ grimoireRef.current=grimoire; },[grimoire]);
  useEffect(()=>{ barsRef.current=bars; },[bars]);
  useEffect(()=>{ seqRef.current=sequencer; },[sequencer]);
  useEffect(()=>{ runningRef.current=running; },[running]);
  useEffect(()=>{ simSpeedRef.current=simSpeed; },[simSpeed]);

  useEffect(()=>{
    const p = ALCHEMY_PRESETS[1];
    stateRef.current = createAlchemyState(p.agentCount, p.elements, p.heat);
  },[]);

  // Normalize elements
  const setElement = useCallback((key:keyof ElementMix, newVal:number)=>{
    setElements(prev=>{
      const others=(Object.entries(prev) as [keyof ElementMix,number][]).filter(([k])=>k!==key);
      const sum=others.reduce((s,[,v])=>s+v,0);
      const remaining=Math.max(.01,1-newVal);
      if(sum<.001){ const each=remaining/others.length; return {...prev,[key]:newVal,...Object.fromEntries(others.map(([k])=>[k,each]))}; }
      const scale=remaining/sum;
      return {...prev,[key]:newVal,...Object.fromEntries(others.map(([k,v])=>[k,v*scale]))};
    });
  },[]);

  // Flash
  const triggerFlash = useCallback((type:FlashType)=>{
    const k=Date.now();
    setActiveFlash({type,key:k});
    if(flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current=setTimeout(()=>setActiveFlash(null),1800);
  },[]);

  // Operations
  const handleOp = useCallback((op:FlashType)=>{
    triggerFlash(op);
    opsUsedRef.current.add(op.toUpperCase());
    setOpsUsed(new Set(opsUsedRef.current));
    if(!stateRef.current) return;
    const st=stateRef.current;
    switch(op){
      case 'solve':      applyOpPulse(st,'SOLVE'); break;
      case 'coagula':    applyOpPulse(st,'COAGULA'); break;
      case 'calcinatio':
        setHeat(prev=>{const v=Math.min(1,prev+.35);if(stateRef.current)stateRef.current.heat=v;return v;});
        applyOpPulse(st,'COAGULA');
        addEntry(grimoireRef.current,'event',st.metrics,elemRef.current,opusRef.current.active?opusRef.current.phase:null,'BURNOUT',st.lapis.state);
        setGrimoire([...grimoireRef.current]); break;
      case 'sublimatio':
        setElements(prev=>{const a=Math.min(.75,prev.air+.2),e=Math.max(.02,prev.earth-.15),f=prev.fire,w=prev.water,s=e+w+a+f;const n={earth:e/s,water:w/s,air:a/s,fire:f/s};if(stateRef.current)stateRef.current.elements=n;return n;});
        applyOpPulse(st,'SOLVE'); break;
      case 'fermentatio':
        setElements(()=>{const n={earth:.25,water:.25,air:.25,fire:.25};if(stateRef.current)stateRef.current.elements=n;return n;}); break;
      case 'putrefactio':
        setHeat(prev=>{const v=Math.max(0,prev-.2);if(stateRef.current)stateRef.current.heat=v;return v;});
        setElements(()=>{const n={earth:.30,water:.35,air:.15,fire:.20};if(stateRef.current)stateRef.current.elements=n;return n;});
        applyOpPulse(st,'SOLVE');
        for(const a of st.agents) a.substance='plumbum';
        addEntry(grimoireRef.current,'event',st.metrics,elemRef.current,opusRef.current.active?opusRef.current.phase:null,'DISSOLUTION',st.lapis.state);
        setGrimoire([...grimoireRef.current]); break;
      case 'circulatio':
        applyOpPulse(st,'COAGULA');
        setTimeout(()=>{if(stateRef.current)applyOpPulse(stateRef.current,'SOLVE');},600);
        setTimeout(()=>{if(stateRef.current)applyOpPulse(stateRef.current,'COAGULA');},1200); break;
      case 'fixatio':
        for(const a of st.agents){a.vx*=.15;a.vy*=.15;}
        setHeat(prev=>{const v=Math.max(0,prev-.15);if(stateRef.current)stateRef.current.heat=v;return v;});
        applyOpPulse(st,'COAGULA'); break;
    }
  },[triggerFlash]);

  // Preset
  const applyPreset = useCallback((id:string)=>{
    const p=getPreset(id); if(!p) return;
    setElements(p.elements); setHeat(p.heat);
    stateRef.current=createAlchemyState(p.agentCount,p.elements,p.heat);
    setOpus(createOpusState()); setGrimoire(createGrimoire()); setBars([]);
  },[]);

  // Opus
  const startOpus = useCallback(()=>{
    if(opus.active){setOpus(createOpusState());opusTargetRef.current=null;return;}
    if(!stateRef.current) return;
    const no:OpusState={active:true,phase:'NIGREDO',phaseIndex:0,timer:0,maxTimer:45,completed:[],lapisForged:false};
    setOpus(no); opusTargetRef.current=getPhaseTarget('NIGREDO');
    addEntry(grimoireRef.current,'phaseStart',stateRef.current.metrics,elemRef.current,'NIGREDO',null,stateRef.current.lapis.state);
    setGrimoire([...grimoireRef.current]);
  },[opus.active]);

  // Sequencer
  const toggleSeq = useCallback(()=>setSequencer(p=>({...p,active:!p.active})),[]);
  const setSeqBpm = useCallback((b:number)=>setSequencer(p=>({...p,bpm:b,stepDur:60/b})),[]);
  const loadSeqPreset = useCallback((id:string)=>{
    const p=SEQ_PRESETS.find(s=>s.id===id); if(!p) return;
    setSequencer(prev=>({...prev,steps:[...p.steps],bpm:p.bpm,stepDur:60/p.bpm,quantum:p.quantum,cursor:0,timer:0}));
  },[]);
  const toggleSeqQuantum = useCallback(()=>setSequencer(p=>({...p,quantum:!p.quantum})),[]);

  // Canvas interaction
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas||!active) return;
    const h=(e:WheelEvent)=>zoomPan.handleWheel(e,canvas);
    canvas.addEventListener('wheel',h,{passive:false});
    return()=>canvas.removeEventListener('wheel',h);
  },[active,zoomPan.handleWheel]);

  const cToWorld=useCallback((e:React.MouseEvent):[number,number]=>{
    const c=canvasRef.current!;
    return screenToWorldAlchemy(e.clientX,e.clientY,c.getBoundingClientRect(),zoomPan.zoomRef.current,zoomPan.panXRef.current,zoomPan.panYRef.current);
  },[zoomPan.zoomRef,zoomPan.panXRef,zoomPan.panYRef]);

  const onCanvasDown=useCallback((e:React.MouseEvent)=>{
    if(e.button===1){zoomPan.handlePanStart(e);return;}
    if(!barTool||e.button!==0) return;
    const [wx,wy]=cToWorld(e); setDrawingBar({x1:wx,y1:wy});
  },[barTool,cToWorld]);

  const onCanvasMove=useCallback((e:React.MouseEvent)=>zoomPan.handlePanMove(e),[zoomPan.handlePanMove]);

  const onCanvasUp=useCallback((e:React.MouseEvent)=>{
    zoomPan.handlePanEnd(e);
    if(!drawingBar||!barTool) return;
    const [wx,wy]=cToWorld(e);
    const dx=wx-drawingBar.x1,dy=wy-drawingBar.y1;
    if(Math.sqrt(dx*dx+dy*dy)>.02){
      setBars(prev=>[...prev,{id:nextBarIdRef.current++,x1:drawingBar.x1,y1:drawingBar.y1,x2:wx,y2:wy,type:barTool,strength:.6,active:true}]);
    }
    setDrawingBar(null);
  },[drawingBar,barTool,cToWorld]);

  // Keys
  useEffect(()=>{
    if(!active) return;
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='='){e.preventDefault();zoomPan.zoomIn();}
      if((e.ctrlKey||e.metaKey)&&e.key==='-'){e.preventDefault();zoomPan.zoomOut();}
      if((e.ctrlKey||e.metaKey)&&e.key==='0'){e.preventDefault();zoomPan.resetView();}
      if(e.key===' '&&!discoveryModal){e.preventDefault();setRunning(r=>!r);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[active,discoveryModal]);

  // RAF loop
  useEffect(()=>{
    if(!active){cancelAnimationFrame(rafRef.current);return;}
    let prevLapis='DORMANT';

    const loop=(now:number)=>{
      rafRef.current=requestAnimationFrame(loop);
      if(!canvasRef.current||!stateRef.current) return;
      const dt=Math.min(.05,(now-lastTRef.current)/1000);
      lastTRef.current=now;
      const st=stateRef.current;

      if(runningRef.current){
        // Opus lerp
        if(opusTargetRef.current){
          const tgt=opusTargetRef.current;
          setElements(prev=>{
            const l={
              earth:prev.earth+(tgt.mix.earth-prev.earth)*dt*.08,
              water:prev.water+(tgt.mix.water-prev.water)*dt*.08,
              air:  prev.air  +(tgt.mix.air  -prev.air  )*dt*.08,
              fire: prev.fire +(tgt.mix.fire -prev.fire )*dt*.08,
            };
            st.elements=l; return l;
          });
          setHeat(prev=>{const t2=prev+(tgt.heat-prev)*dt*.06;st.heat=t2;return t2;});
        }

        // Sequencer
        if(seqRef.current.active){
          const result=tickSequencer(seqRef.current,dt);
          if(result.stepFired&&result.firedStep){
            if(result.elementsDelta){
              setElements(prev=>{
                const d=result.elementsDelta!;
                const nxt={earth:d.earth??prev.earth,water:d.water??prev.water,air:d.air??prev.air,fire:d.fire??prev.fire};
                st.elements=nxt; return nxt;
              });
            }
            if(result.heatDelta!=null) setHeat(()=>{st.heat=result.heatDelta!;return result.heatDelta!;});
            if(result.op!=='NONE') applyOpPulse(st,result.op);
          }
          setSequencer({...seqRef.current});
        }

        // ── Pre-discovery: slow-mo + camera zoom toward hottest particle ────
        if (!discoveryOpenRef.current) {
          const bestPD = PERIODIC_ELEMENTS
            .filter(el => !discRef.current.has(el.z))
            .map(el => ({ el, prog: (progressRef.current.get(el.z)??0)/el.recipe.ticksNeeded }))
            .filter(({ prog }) => prog > 0.40)
            .sort((a,b) => b.prog - a.prog)[0];

          if (bestPD) {
            // Slow down proportional to progress
            const targetSlow = Math.max(0.10, 1 - bestPD.prog * 2.0);
            slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dt * 1.5);
            // Find hottest particle (most charge * coherence)
            let hotX = 0.5, hotY = 0.5, maxScore = 0;
            for (const agent of st.agents) {
              const s = agent.charge * agent.coherence;
              if (s > maxScore) { maxScore = s; hotX = agent.x; hotY = agent.y; }
            }
            // Zoom toward hot particle
            const targetZoom = 1.3 + bestPD.prog * 2.5;
            zoomPan.zoomRef.current += (targetZoom - zoomPan.zoomRef.current) * Math.min(1, dt * 0.6);
            // Pan toward hot particle
            const cw = canvasRef.current?.clientWidth ?? 900;
            const ch = canvasRef.current?.clientHeight ?? 600;
            const tpx = (0.5 - hotX) * cw  * zoomPan.zoomRef.current * 0.4;
            const tpy = (0.5 - hotY) * ch * zoomPan.zoomRef.current * 0.4;
            zoomPan.panXRef.current += (tpx - zoomPan.panXRef.current) * Math.min(1, dt * 0.45);
            zoomPan.panYRef.current += (tpy - zoomPan.panYRef.current) * Math.min(1, dt * 0.45);
            preDiscoRef.current = {
              name: bestPD.el.name, symbol: bestPD.el.symbol,
              color: CATEGORY_INFO[bestPD.el.cat].color,
              progress: bestPD.prog, hotX, hotY,
            };
          } else {
            // Slowly return to user's chosen speed & default zoom
            slowMoRef.current += (1.0 - slowMoRef.current) * Math.min(1, dt * 1.5);
            if (zoomPan.zoomRef.current > 1.02)
              zoomPan.zoomRef.current += (1.0 - zoomPan.zoomRef.current) * Math.min(1, dt * 0.5);
            if (Math.abs(zoomPan.panXRef.current) > 1 || Math.abs(zoomPan.panYRef.current) > 1) {
              zoomPan.panXRef.current *= Math.pow(0.96, dt * 60);
              zoomPan.panYRef.current *= Math.pow(0.96, dt * 60);
            }
            preDiscoRef.current = null;
          }
        }

        const simDt = dt * simSpeedRef.current * slowMoRef.current;
        stepAlchemy(st, simDt, barsRef.current);

        // ── Discovery check every 60 ticks ──────────────────────────────────
        if(st.tick%60===0){
          const conditions={earth:elemRef.current.earth,water:elemRef.current.water,air:elemRef.current.air,fire:elemRef.current.fire};
          const currentPhase=opusRef.current.active?opusRef.current.phase:null;

          for(const elem of PERIODIC_ELEMENTS){
            if(discRef.current.has(elem.z)) continue;
            if(meetsRecipe(elem.recipe,conditions,heatRef.current,opsUsedRef.current,currentPhase,st.lapis.state)){
              const prev=progressRef.current.get(elem.z)??0;
              const next=prev+1;
              progressRef.current.set(elem.z,next);
              if(next>=elem.recipe.ticksNeeded){
                discRef.current.add(elem.z);
                setDiscoveredElements(new Set(discRef.current));
                setElementProgress(new Map(progressRef.current));
                // PAUSE + show discovery modal
                runningRef.current=false;
                setRunning(false);
                const snap:DiscoverySnapshot={
                  element:elem,
                  earth:elemRef.current.earth, water:elemRef.current.water,
                  air:elemRef.current.air, fire:elemRef.current.fire,
                  heat:heatRef.current,
                  opsUsed:Array.from(opsUsedRef.current),
                  opusPhase:currentPhase,
                  lapisState:st.lapis.state,
                  totalDiscovered:discRef.current.size,
                };
                discoveryOpenRef.current = true;
                preDiscoRef.current = null;
                slowMoRef.current = 1.0;
                setDiscoveryModal(snap);
                addEntry(grimoireRef.current,'periodic',st.metrics,elemRef.current,currentPhase,null,st.lapis.state);
                setGrimoire([...grimoireRef.current]);
                break;
              }
            }
          }
          setElementProgress(new Map(progressRef.current));
        }

        // Lapis
        if(st.lapis.state!==prevLapis){
          if(st.lapis.state==='FORGED'){
            addEntry(grimoireRef.current,'lapisForged',st.metrics,st.elements,opusRef.current.active?opusRef.current.phase:null,null,st.lapis.state);
            setGrimoire([...grimoireRef.current]);
          }
          prevLapis=st.lapis.state;
        }

        // Events
        if(st.activeEvent&&st.eventTimer<.1){
          addEntry(grimoireRef.current,'event',st.metrics,st.elements,opusRef.current.active?opusRef.current.phase:null,st.activeEvent,st.lapis.state);
          setGrimoire([...grimoireRef.current]);
        }

        // Opus timer
        if(opusRef.current.active){
          setOpus(prev=>{
            if(!prev.active) return prev;
            const nt=prev.timer+dt;
            if(nt>=prev.maxTimer){
              const diag=diagnosePhase(prev.phase,st.metrics);
              const next2=nextPhase(prev);
              addEntry(grimoireRef.current,'phaseEnd',st.metrics,st.elements,prev.phase,null,st.lapis.state);
              if(diag.passed&&next2){
                const ns={...prev,timer:0,phase:next2,phaseIndex:prev.phaseIndex+1,completed:[...prev.completed,prev.phase]};
                opusTargetRef.current=getPhaseTarget(next2);
                addEntry(grimoireRef.current,'phaseStart',st.metrics,st.elements,next2,null,st.lapis.state);
                setGrimoire([...grimoireRef.current]);
                return ns;
              }else if(diag.passed&&!next2){
                opusTargetRef.current=null; setGrimoire([...grimoireRef.current]);
                return {...prev,active:false,completed:[...prev.completed,prev.phase]};
              }else{
                setGrimoire([...grimoireRef.current]);
                return {...prev,timer:0};
              }
            }
            return {...prev,timer:nt};
          });
        }

        if(st.tick%20===0) setTransmutation({...st.transmutation,counts:{...st.transmutation.counts},produced:{...st.transmutation.produced},flashes:[]});
      }

      const breath=Math.sin(st.breathPhase*Math.PI*2);
      renderAlchemy(canvasRef.current!,st,lensRef.current,opusRef.current.active?opusRef.current.phase:null,breath,barsRef.current,seqRef.current,zoomPan.zoomRef.current,zoomPan.panXRef.current,zoomPan.panYRef.current, 284, preDiscoRef.current);
    };

    lastTRef.current=performance.now();
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[active]);

  // Derived
  const quintessence = computeQuintessence(elements);
  const lapisState   = stateRef.current?.lapis.state ?? 'DORMANT';

  const recipeScores = useMemo(()=>Object.fromEntries(
    RECIPES.map(r=>[r.id,getRecipeScore(r,elements,heat,stateRef.current?.lapis.state??'DORMANT',stateRef.current?.pulse.op??'NONE',.5,transmutation.conjunctionActive)])
  ),[elements,heat,transmutation.conjunctionActive]);

  const filteredGrim = useMemo(()=>grimFilter?filterEntries(grimoire,grimFilter):grimoire.slice(0,40),[grimoire,grimFilter]);

  const HUD_W = 240;

  const TABS = [
    { id:'tabela'  as const, icon:<Atom size={13}/>,        label:'Tabela', color:'#60c0ff' },
    { id:'atanor'  as const, icon:<FlaskConical size={13}/>, label:'Atanor', color:'#ffa030' },
    { id:'opus'    as const, icon:<BookOpen size={13}/>,     label:'Opus',   color:'#b060ff' },
    { id:'arcana'  as const, icon:<Zap size={13}/>,          label:'Arcana', color:'#ff60c0' },
  ];

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[5]" style={{display:active?'flex':'none', top:36}}>
      <style>{STYLES}</style>

      {/* Canvas fills area below global top HUD */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block"
        style={{background:'#000',cursor:zoomPan.isPanning.current?'grabbing':barTool?'crosshair':'default'}}
        onMouseDown={onCanvasDown} onMouseMove={onCanvasMove}
        onMouseUp={onCanvasUp} onMouseLeave={()=>zoomPan.handlePanEnd()}/>

      {/* Flash overlay */}
      {activeFlash&&(
        <div key={activeFlash.key} style={{
          position:'fixed',inset:0,zIndex:90,pointerEvents:'none',
          background:FLASH_COLORS[activeFlash.type],
          animation:`flash-${activeFlash.type} 1.6s ease-out forwards`,
        }}/>
      )}

      {/* Substance banner */}
      {transmutation.bannerLife>0&&transmutation.bannerSubstance&&(()=>{
        const meta=SUBSTANCE_META[transmutation.bannerSubstance];
        return (
          <div style={{position:'fixed',top:'35%',left:'50%',transform:'translate(-50%,-50%)',zIndex:97,pointerEvents:'none',textAlign:'center'}}>
            <div style={{fontSize:24,letterSpacing:'.15em',fontFamily:'serif',color:meta.glowColor,opacity:Math.min(1,transmutation.bannerLife/2),textShadow:`0 0 30px ${meta.color}88`}}>
              {meta.symbol} {transmutation.bannerText} {meta.symbol}
            </div>
          </div>
        );
      })()}

      {/* ── LEFT HUD ── */}
      <div style={{
        position:'fixed',left:0,top:36,bottom:0,zIndex:20,display:'flex',
        pointerEvents:'none',
      }}>
        {/* Toggle tab strip */}
        <div style={{
          width:44,display:'flex',flexDirection:'column',alignItems:'center',
          background:'rgba(6,5,12,.97)',borderRight:'1px solid rgba(255,255,255,.05)',
          pointerEvents:'all', paddingTop:4,
        }}>
          {TABS.map(tab=>(
            <button key={tab.id}
              onClick={()=>{ if(leftTab===tab.id&&hudOpen){ setHudOpen(false); } else { setLeftTab(tab.id); setHudOpen(true); } }}
              style={{
                width:36,height:36,borderRadius:6,border:'none',cursor:'pointer',margin:'2px 0',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1.5,
                background: hudOpen&&leftTab===tab.id ? `${tab.color}18` : 'transparent',
                boxShadow: hudOpen&&leftTab===tab.id ? `inset 0 0 0 1px ${tab.color}40` : 'none',
                color: hudOpen&&leftTab===tab.id ? tab.color : 'rgba(255,255,255,.25)',
                transition:'all .15s',
              }}>
              {tab.icon}
              <span style={{fontSize:5,letterSpacing:'.08em',textTransform:'uppercase'}}>{tab.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div style={{width:24,height:1,background:'rgba(255,255,255,.06)',margin:'4px 0'}}/>

          {/* Play/Pause */}
          <button onClick={()=>setRunning(r=>!r)}
            title={running?'Pausar [Espaço]':'Continuar [Espaço]'}
            style={{
              width:36,height:28,borderRadius:5,cursor:'pointer',
              background:'rgba(255,255,255,.03)',
              border:`1px solid ${running?'rgba(255,255,255,.06)':'rgba(255,140,60,.40)'}`,
              color:running?'rgba(255,255,255,.28)':'rgba(255,160,80,.90)',
              display:'flex',alignItems:'center',justifyContent:'center',
              margin:'2px 0',
            }}>
            {running?<Pause size={12}/>:<Play size={12}/>}
          </button>

          {/* Grimoire */}
          <button onClick={()=>setShowGrim(v=>!v)}
            title="Grimório"
            style={{
              width:36,height:28,borderRadius:5,border:'none',cursor:'pointer',margin:'2px 0',
              background:showGrim?'rgba(255,200,60,.1)':'transparent',
              color:showGrim?'rgba(255,220,100,.8)':'rgba(255,255,255,.3)',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
            <Book size={12}/>
          </button>

          {/* HUD toggle */}
          <button onClick={()=>setHudOpen(v=>!v)}
            title={hudOpen?'Recolher HUD':'Expandir HUD'}
            style={{
              width:36,height:28,borderRadius:5,border:'none',cursor:'pointer',margin:'2px 0',
              background:'transparent',color:'rgba(255,255,255,.2)',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
            {hudOpen?<ChevronLeft size={11}/>:<ChevronRight size={11}/>}
          </button>

          {/* Lapis indicator */}
          <div style={{marginTop:'auto',marginBottom:8,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{
              width:10,height:10,borderRadius:'50%',
              background:lapisState==='FORGED'?'#ffd060':lapisState==='FORMING'?'#a060ff':lapisState==='CRACKED'?'#ff4040':'#333',
              boxShadow:lapisState==='FORGED'?'0 0 8px #ffd060':'none',
            }}/>
            <span style={{fontSize:4.5,color:'rgba(255,255,255,.2)',textTransform:'uppercase',letterSpacing:'.06em',writingMode:'vertical-rl',transform:'rotate(180deg)'}}>
              {discoveredElements.size}/118
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {hudOpen && (
          <div className="alchemy-hud-enter" style={{
            width:HUD_W,display:'flex',flexDirection:'column',
            background:'rgba(6,5,12,.97)',borderRight:'1px solid rgba(255,255,255,.05)',
            pointerEvents:'all',overflowY:'auto',overflowX:'hidden',
          }}>
            {/* Tab header */}
            <div style={{
              padding:'6px 10px 5px',borderBottom:'1px solid rgba(255,255,255,.05)',
              flexShrink:0,
            }}>
              <div style={{
                fontSize:7,letterSpacing:'.14em',textTransform:'uppercase',
                color: TABS.find(t=>t.id===leftTab)?.color ?? 'rgba(255,255,255,.4)',
              }}>
                {leftTab==='tabela' && '⊞ Tabela Periódica'}
                {leftTab==='atanor' && '⋈ Atanor — Forno Alquímico'}
                {leftTab==='opus'   && '☿ Opus Magnus'}
                {leftTab==='arcana' && '⚡ Operações &amp; Poderes'}
              </div>
            </div>

            {/* Tab content */}
            <div style={{flex:1}}>
              {leftTab==='tabela' && <Tabela discovered={discoveredElements} progress={elementProgress}/>}
              {leftTab==='atanor' && (
                <Atanor elements={elements} heat={heat} transmutation={transmutation}
                  quintessence={quintessence} recipeScores={recipeScores}
                  simSpeed={simSpeed} onSimSpeed={v=>{setSimSpeed(v);simSpeedRef.current=v;}}
                  onElement={setElement} onHeat={v=>{setHeat(v);if(stateRef.current)stateRef.current.heat=v;}} onPreset={applyPreset}/>
              )}
              {leftTab==='opus' && (
                <OpusTab opus={opus} sequencer={sequencer}
                  onStartOpus={startOpus} onSeqToggle={toggleSeq}
                  onSeqBpm={setSeqBpm} onSeqPreset={loadSeqPreset} onSeqQuantum={toggleSeqQuantum}/>
              )}
              {leftTab==='arcana' && (
                <Arcana onOp={handleOp} opsUsed={opsUsed} bars={bars} barTool={barTool}
                  onBarTool={setBarTool}
                  onDeleteBar={id=>setBars(p=>p.filter(b=>b.id!==id))}
                  onToggleBar={id=>setBars(p=>p.map(b=>b.id===id?{...b,active:!b.active}:b))}
                  onBarStrength={(id,v)=>setBars(p=>p.map(b=>b.id===id?{...b,strength:v}:b))}
                  lens={lens} onLens={l=>{setLens(l);lensRef.current=l;}}/>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── GRIMOIRE ── */}
      {showGrim && (
        <div style={{
          position:'fixed',right:0,top:36,bottom:0,width:240,zIndex:20,
          display:'flex',flexDirection:'column',
          background:'rgba(6,5,12,.97)',borderLeft:'1px solid rgba(255,255,255,.05)',
        }}>
          <div style={{padding:'7px 10px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{fontSize:8,color:'rgba(255,200,80,.7)',letterSpacing:'.1em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:5}}>
              <Book size={10}/> Grimório ({grimoire.length})
            </div>
            <button onClick={()=>setShowGrim(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.3)'}}>
              <X size={10}/>
            </button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'6px 8px',display:'flex',flexDirection:'column',gap:3}}>
            {filteredGrim.length===0&&(
              <div style={{fontSize:8,color:'rgba(255,255,255,.2)',textAlign:'center',padding:'20px 0',fontStyle:'italic'}}>
                O Grimório está vazio.<br/>Execute operações para registrar.
              </div>
            )}
            {filteredGrim.map(e=>(
              <GlyphCard key={e.id} entry={e}
                onBookmark={()=>setGrimoire(prev=>prev.map(g=>g.id===e.id?{...g,bookmarked:!g.bookmarked}:g))}/>
            ))}
          </div>
        </div>
      )}

      {/* Zoom */}
      <div style={{position:'fixed',bottom:16,right:showGrim?258:16,zIndex:25}}>
        <ZoomControls zoom={zoomPan.zoom} onZoomIn={zoomPan.zoomIn} onZoomOut={zoomPan.zoomOut} onReset={zoomPan.resetView}/>
      </div>

      {/* Opus mini-bar */}
      {opus.active && (
        <div style={{
          position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:25,pointerEvents:'none',
          display:'flex',alignItems:'center',gap:8,padding:'5px 14px',borderRadius:20,
          background:'rgba(6,5,12,.9)',border:`1px solid ${OPUS_PHASES[opus.phase].color}44`,
        }}>
          <span style={{fontSize:11,color:OPUS_PHASES[opus.phase].color}}>{OPUS_PHASES[opus.phase].symbol}</span>
          <div>
            <div style={{fontSize:7.5,color:OPUS_PHASES[opus.phase].color,letterSpacing:'.08em',textTransform:'uppercase'}}>
              Opus: {opus.phase}
            </div>
            <div style={{width:110,height:2,background:'rgba(255,255,255,.07)',borderRadius:2,overflow:'hidden',marginTop:2}}>
              <div style={{height:'100%',width:`${(opus.timer/opus.maxTimer)*100}%`,background:OPUS_PHASES[opus.phase].color,borderRadius:2,transition:'width .5s'}}/>
            </div>
          </div>
          <span style={{fontSize:7.5,fontFamily:'monospace',color:'rgba(255,255,255,.4)'}}>
            {Math.round(opus.timer)}s/{opus.maxTimer}s
          </span>
        </div>
      )}

      {/* Paused indicator */}
      {!running && !discoveryModal && (
        <div style={{
          position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          zIndex:30,pointerEvents:'none',textAlign:'center',
        }}>
          <div style={{fontSize:11,color:'rgba(255,255,255,.25)',letterSpacing:'.2em',textTransform:'uppercase',fontFamily:'monospace'}}>
            ■ PAUSADO
          </div>
          <div style={{fontSize:8,color:'rgba(255,255,255,.12)',marginTop:4}}>Espaço para continuar</div>
        </div>
      )}

      {/* ── DISCOVERY MODAL ── */}
      {discoveryModal && (
        <DiscoveryModal
          data={discoveryModal}
          onContinue={()=>{
            discoveryOpenRef.current = false;
            slowMoRef.current = 1.0;
            setDiscoveryModal(null);
            setRunning(true);
            runningRef.current=true;
          }}
          onReplay={()=>{
            triggerFlash('calcinatio');
            setTimeout(()=>triggerFlash('coagula'),600);
          }}
        />
      )}
    </div>
  );
};
