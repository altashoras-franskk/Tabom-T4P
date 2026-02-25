// ── Music Lab v2 — Synesthetic Quanta Instrument ─────────────────────────────
import React, { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { getControllerManager } from '../input/controller/ControllerInputManager';
import { ControllerCursor } from '../input/controller/ControllerCursor';
import { ControllerHUD } from '../input/controller/ControllerHUD';
import { QuickMenu } from '../input/controller/QuickMenu';
import type { ControllerFrameState } from '../input/controller/types';
import {
  MusicState, MusicPreset, MusicLens, MusicalTool,
  VoiceRole, NoteEvent, RoleConfig, PhysicsParams,
  DEFAULT_PHYSICS, ROLE_COLORS, ROLE_HUES, ToolCursor, GateType,
  SCALE_INTERVALS, quantizeToScale, Scale,
  FxZoneEffect, defaultUserMatrix, CanvasPalette, PaletteMode, DEFAULT_PALETTE, MusicAesthetic,
} from '../sim/music/musicTypes';
import { createMusicState, stepMusic, makeQuantum, spawnRipple } from '../sim/music/musicEngine';
import { MUSIC_PRESETS, getPreset } from '../sim/music/musicPresets';
import { audioEngine } from '../audio/audioEngine';
import { BEHAVIOR_PRESETS, BEHAVIOR_BY_ID, applyBehaviorToPhysics } from '../sim/music/behaviorPresets';
import { renderMusic } from '../render/musicRenderer';
import { DEFAULT_MUSIC_AESTHETIC, getMusicVisualPreset, MUSIC_VISUAL_PRESETS } from '../sim/music/musicAesthetics';
import { captureMusicSnapshotV1, saveMusicSnapshotToStorage } from '../bridge/musicMetaArtBridge';
import { CanvasRecorder, RecorderState } from './components/recording/canvasRecorder';
import { RecordingButton } from './components/recording/RecordingButton';

// Lazy load 3D renderer to avoid blocking initial load
const Music3DRenderer = lazy(() => import('../render/music3DRenderer'));
import { StudioSequencer, DEFAULT_STUDIO_ROWS, SRow, PatternDef } from './components/music/StudioSequencer';
import { MusicGuide } from './components/music/MusicGuide';
import { WhatsNewBanner } from './components/music/WhatsNewBanner';
import { ZoomControls } from './components/ZoomControls';
import { useZoomPan, screenToWorldMusic } from '../hooks/useZoomPan';
import {
  Pause, RotateCcw, Music, X, Volume2, Film,
  MousePointer2, Plus, Minus, Target, Zap, RefreshCw,
  Snowflake, Shuffle, Eraser, ChevronRight,
  ChevronLeft, Settings, Sliders, ZapOff, Trash2, Dice5, HelpCircle, Image,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ── TAG COLORS ────────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string,string> = {
  Techno:'#ff3b5c',Club:'#cc2255',Ambient:'#44ffcc',Eno:'#88ffdd',
  Classical:'#ffd700',Baroque:'#cc9900',Minimalist:'#aaffaa',
  Jazz:'#ff9944',Swing:'#ffaa33',Experimental:'#cc44ff',
  Electronic:'#00d4ff',Generative:'#66ffaa',Meditative:'#aaccff',
  Drone:'#9966ff',Space:'#88aaff',Romantic:'#ff8899',
  Reich:'#ccffaa',Glitch:'#ff00ff',Cage:'#aaaaaa',
  'Free Jazz':'#ff6633',Groove:'#ffcc44',Dark:'#cc3366',Soft:'#88ffcc',
  Rave:'#ff4400',Improvisation:'#ff9966',Breakbeat:'#ff2200',Strings:'#ffdd66',
  Modal:'#aaffbb',Aquatic:'#00ccff',Arpeggios:'#ccffff',Minimalism:'#ccffcc',
  Dynamic:'#ff8866',Phasing:'#aaffcc',Choral:'#ffaabb',Orchestral:'#ffcc77',
};

// ── TOOL CONFIG ───────────────────────────────────────────────────────────────
const TOOLS: { id:MusicalTool; icon: React.ReactNode; label:string; key:string; color:string }[] = [
  { id:'select',    icon:<MousePointer2 size={13}/>, label:'Select',    key:'Q', color:'#aaaaff' },
  { id:'spawn',     icon:<Plus size={13}/>,          label:'Spawn',     key:'W', color:'#aaffaa' },
  { id:'gate',      icon:<Minus size={13}/>,         label:'Gate Line', key:'E', color:'#ffffff' },
  { id:'attractor', icon:<Target size={13}/>,        label:'Attractor', key:'A', color:'#00aaff' },
  { id:'repulsor',  icon:<ZapOff size={13}/>,        label:'Repulsor',  key:'T', color:'#ff4400' },
  { id:'vortex',    icon:<RefreshCw size={13}/>,     label:'Vortex',    key:'Y', color:'#cc44ff' },
  { id:'excite',    icon:<Zap size={13}/>,           label:'Excite',    key:'U', color:'#ff8800' },
  { id:'freeze',    icon:<Snowflake size={13}/>,     label:'Freeze',    key:'I', color:'#88ddff' },
  { id:'mutate',    icon:<Shuffle size={13}/>,       label:'Mutate',    key:'O', color:'#ff88ff' },
  { id:'erase',     icon:<Eraser size={13}/>,        label:'Erase',     key:'P', color:'#ff4466' },
  // ── Quantum powers ──────────────────────────────────────────────────────────
  { id:'channel', icon:<span style={{fontSize:11}}>≋</span>, label:'Q.Channel', key:'1', color:'#c0c8d0' },
  { id:'rail',    icon:<span style={{fontSize:11}}>⊢</span>, label:'G.Rail',    key:'2', color:'#c8960a' },
  { id:'tunnel',  icon:<span style={{fontSize:11}}>⊙</span>, label:'Q.Tunnel',  key:'3', color:'#cc66ff' },
  // ── Barriers ────────────────────────────────────────────────────────────────
  { id:'mirror',   icon:<span style={{fontSize:11}}>⟺</span>, label:'Mirror',   key:'4', color:'#c0e8ff' },
  { id:'absorber', icon:<span style={{fontSize:11}}>◉</span>, label:'Absorber', key:'5', color:'#dd3333' },
  { id:'membrane', icon:<span style={{fontSize:11}}>⇥</span>, label:'Membrane', key:'6', color:'#cc44ff' },
  // ── Patch 01.1 ──────────────────────────────────────────────────────────────
  { id:'cage',   icon:<span style={{fontSize:11}}>⬡</span>, label:'Cage',     key:'7', color:'#00ffcc' },
  { id:'string', icon:<span style={{fontSize:11}}>⌇</span>, label:'H.String', key:'8', color:'#ffd700' },
  { id:'zone',   icon:<span style={{fontSize:11}}>✦</span>, label:'FX Zone',  key:'9', color:'#ff44cc' },
  { id:'metro',  icon:<span style={{fontSize:11}}>⌛</span>, label:'Metro',    key:'0', color:'#ffcc00' },
];

const VOICE_ROLES: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];

// ── Default role configs (fallback for roles absent in the active preset) ──────
// Ensures ARP / STRINGS / CHOIR always fire even if the preset doesn't list them.
const ROLE_DEFAULTS: Record<VoiceRole, RoleConfig> = {
  KICK:    {proportion:1,pitchRange:[36,48],waveform:'kick',   filterType:'lowpass', filterFreq:200,  filterQ:1,  envelope:{attack:.001,decay:.10,sustain:0.00,release:.08},gainScale:1.00,detune:0,panSpread:.10,maxVoices:2,cooldownMin:.15},
  BASS:    {proportion:1,pitchRange:[28,52],waveform:'sawtooth',filterType:'lowpass', filterFreq:280,  filterQ:3,  envelope:{attack:.010,decay:.20,sustain:0.65,release:.25},gainScale:.75,detune:0,panSpread:.25,maxVoices:3,cooldownMin:.35},
  PERC:    {proportion:1,pitchRange:[48,84],waveform:'noise',   filterType:'highpass',filterFreq:5000, filterQ:.4, envelope:{attack:.001,decay:.06,sustain:0.00,release:.04},gainScale:.55,detune:0,panSpread:.60,maxVoices:4,cooldownMin:.18},
  PAD:     {proportion:1,pitchRange:[48,72],waveform:'sine',    filterType:'lowpass', filterFreq:900,  filterQ:1.2,envelope:{attack:.80, decay:.30,sustain:0.80,release:1.50},gainScale:.50,detune:0,panSpread:.80,maxVoices:4,cooldownMin:.90},
  LEAD:    {proportion:1,pitchRange:[52,88],waveform:'sawtooth',filterType:'lowpass', filterFreq:2200, filterQ:2,  envelope:{attack:.010,decay:.12,sustain:0.50,release:.20},gainScale:.70,detune:0,panSpread:.40,maxVoices:3,cooldownMin:.22},
  ARP:     {proportion:1,pitchRange:[60,96],waveform:'square',  filterType:'lowpass', filterFreq:3000, filterQ:1.5,envelope:{attack:.003,decay:.12,sustain:0.15,release:.22},gainScale:.60,detune:0,panSpread:.60,maxVoices:3,cooldownMin:.14},
  STRINGS: {proportion:1,pitchRange:[48,76],waveform:'triangle',filterType:'lowpass', filterFreq:1800, filterQ:1.5,envelope:{attack:.35, decay:.20,sustain:0.70,release:1.20},gainScale:.50,detune:0,panSpread:.90,maxVoices:4,cooldownMin:.70},
  CHOIR:   {proportion:1,pitchRange:[48,72],waveform:'sine',    filterType:'lowpass', filterFreq:800,  filterQ:1.0,envelope:{attack:1.20,decay:.50,sustain:0.75,release:2.50},gainScale:.45,detune:0,panSpread:1.0,maxVoices:3,cooldownMin:1.50},
};

// ── Timbre Templates ──────────────────────────────────────────────────────────
interface TimbreTemplate {
  name: string; icon: string; color: string;
  wave: RoleConfig['waveform'];
  fType: RoleConfig['filterType'];
  fFreq: number; fQ: number;
  env: { attack:number; decay:number; sustain:number; release:number };
  gain: number; det: number; cd: number;
}
const TIMBRE_TEMPLATES: TimbreTemplate[] = [
  { name:'Sub Bass', icon:'◉', color:'#ff8c00', wave:'sine',     fType:'lowpass',  fFreq:90,   fQ:1,   env:{attack:.01, decay:.3,  sustain:.82,release:.6},  gain:.82, det:0,   cd:.35 },
  { name:'Acid 303', icon:'⌇', color:'#ff5500', wave:'sawtooth', fType:'lowpass',  fFreq:360,  fQ:18,  env:{attack:.002,decay:.14, sustain:.35,release:.1},   gain:.75, det:-7,  cd:.14 },
  { name:'Hard Kick',icon:'●', color:'#ff3b5c', wave:'kick',     fType:'lowpass',  fFreq:180,  fQ:.5,  env:{attack:.001,decay:.08, sustain:.0, release:.06},  gain:.90, det:0,   cd:.4  },
  { name:'FM Bell',  icon:'∆', color:'#00d4c8', wave:'triangle', fType:'bandpass', fFreq:3200, fQ:3,   env:{attack:.003,decay:.25, sustain:.1, release:.85},  gain:.55, det:0,   cd:.22 },
  { name:'Saw Lead', icon:'⊿', color:'#39ff70', wave:'sawtooth', fType:'lowpass',  fFreq:2000, fQ:4,   env:{attack:.008,decay:.1,  sustain:.5, release:.2},   gain:.60, det:7,   cd:.18 },
  { name:'Square',   icon:'□', color:'#00aaff', wave:'square',   fType:'lowpass',  fFreq:1200, fQ:2.5, env:{attack:.005,decay:.12, sustain:.42,release:.15},  gain:.5,  det:0,   cd:.2  },
  { name:'Warm Pad', icon:'~', color:'#9b59ff', wave:'sawtooth', fType:'lowpass',  fFreq:550,  fQ:2,   env:{attack:.55, decay:.3,  sustain:.75,release:1.2},  gain:.45, det:0,   cd:.85 },
  { name:'Choir',    icon:'♪', color:'#ff69b4', wave:'sine',     fType:'lowpass',  fFreq:750,  fQ:1.2, env:{attack:1.1, decay:.5,  sustain:.8, release:2.0},  gain:.45, det:0,   cd:2.0 },
  { name:'Shimmer',  icon:'✦', color:'#ffd700', wave:'triangle', fType:'highpass', fFreq:2400, fQ:1.5, env:{attack:.2,  decay:.3,  sustain:.6, release:1.0},  gain:.40, det:12,  cd:.6  },
  { name:'Snare',    icon:'◈', color:'#00e5ff', wave:'snare',    fType:'bandpass', fFreq:2600, fQ:.8,  env:{attack:.001,decay:.07, sustain:.0, release:.05},  gain:.65, det:0,   cd:.18 },
  { name:'Hi-Hat',   icon:'×', color:'#aaccff', wave:'hihat',    fType:'highpass', fFreq:5500, fQ:.5,  env:{attack:.001,decay:.03, sustain:.0, release:.02},  gain:.5,  det:0,   cd:.12 },
  { name:'Glitch',   icon:'⌗', color:'#ff00ff', wave:'square',   fType:'bandpass', fFreq:2800, fQ:8,   env:{attack:.001,decay:.04, sustain:.1, release:.04},  gain:.6,  det:0,   cd:.1  },
];

// ── Slider sub-component ─────────────────────────────────────────────────────
const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

const S: React.FC<{
  label:string; value:number; min:number; max:number; step:number;
  display?:(v:number)=>string; color?:string; onChange:(v:number)=>void;
}> = ({ label, value, min, max, step, display, color=ACCENT, onChange }) => {
  const pct = ((value-min)/(max-min)*100).toFixed(1)+'%';
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span style={{fontFamily:MONO,fontSize:7,color:color+'66',letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</span>
        <span style={{fontFamily:MONO,fontSize:7,color:color+'99'}}>
          {display?display(value):value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        className="h-px w-full appearance-none cursor-pointer"
        style={{background:`linear-gradient(90deg,${color}55 ${pct},rgba(255,255,255,.06) ${pct})`}}
      />
    </div>
  );
};

const Tog: React.FC<{label:string;on:boolean;color?:string;onToggle:()=>void}> = ({label,on,color='#88aaff',onToggle})=>(
  <button onClick={onToggle}
    className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest transition-colors"
    style={{color:on?color:'rgba(255,255,255,.25)'}}>
    <span>{on?'◉':'○'}</span>{label}
  </button>
);

// ── Preset Grid ───────────────────────────────────────────────────────────────
const PresetGrid: React.FC<{currentId:string;onSelect:(id:string)=>void;onClose:()=>void}> = ({currentId,onSelect,onClose})=>{
  const [filter,setFilter]=useState<string|null>(null);
  const allTags=useMemo(()=>Array.from(new Set(MUSIC_PRESETS.flatMap(p=>p.tags))).sort(),[]);
  const shown=filter?MUSIC_PRESETS.filter(p=>p.tags.includes(filter)):MUSIC_PRESETS;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.88)'}} onClick={onClose}>
      <div className="w-[820px] max-w-[96vw] max-h-[88vh] flex flex-col border border-dashed border-white/[0.06] bg-black"
        style={{fontFamily:MONO}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-dashed border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span style={{fontSize:12,color:`${ACCENT}40`}}>◈</span>
            <span style={{fontFamily:DOTO,fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.30)'}}>60 PRESETS</span>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60"><X size={13}/></button>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-dashed border-white/[0.06] overflow-x-auto flex-shrink-0"
          style={{scrollbarWidth:'none'}}>
          <button onClick={()=>setFilter(null)}
            className={`text-[6px] uppercase tracking-[0.14em] px-2 py-0.5 border whitespace-nowrap transition-all
              ${!filter?'border-[#37b2da]/50 text-[#37b2da] bg-[#37b2da]/8':'border-white/[0.06] text-white/28 hover:text-white/55'}`}
            style={{fontFamily:MONO,borderRadius:0}}>All</button>
          {allTags.map(t=>(
            <button key={t} onClick={()=>setFilter(filter===t?null:t)}
              className={`text-[6px] uppercase tracking-[0.14em] px-2 py-0.5 border whitespace-nowrap transition-all
                ${filter===t?'border-current bg-current/10':'border-white/[0.06] text-white/28 hover:text-white/55'}`}
              style={{fontFamily:MONO,borderRadius:0,...(filter===t?{color:TAG_COLORS[t]??'#aaa',borderColor:TAG_COLORS[t]??'#aaa'}:{})}}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto"
          style={{scrollbarWidth:'thin',scrollbarColor:'rgba(55,178,218,.15) transparent'}}>
          {shown.map(p=>(
            <button key={p.id} onClick={()=>{onSelect(p.id);onClose();}}
              className={`text-left p-3 border transition-all
                ${p.id===currentId?'border-[#37b2da]/40 bg-[#37b2da]/[0.04]':'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]'}`}
              style={{borderRadius:0,borderStyle:p.id===currentId?'solid':'dashed'}}>
              <div className="flex items-center gap-0.5 mb-1.5">
                {Array.from({length:5}).map((_,i)=>(
                  <div key={i} className="w-1.5 h-1.5" style={{background:i<p.intensity?p.primary:'rgba(255,255,255,.08)',borderRadius:0}}/>
                ))}
                <span className="ml-1 text-[6px] text-white/18" style={{fontFamily:MONO}}>{p.bpm}bpm</span>
              </div>
              <div className="text-[9px] mb-0.5 leading-tight"
                style={{color:p.id===currentId?p.primary:'rgba(255,255,255,.7)',fontFamily:MONO,fontWeight:300}}>
                {p.name}
              </div>
              <div className="text-[7px] text-white/25 mb-2 leading-snug line-clamp-1" style={{fontFamily:MONO}}>{p.vibe}</div>
              <div className="flex flex-wrap gap-0.5">
                {p.tags.slice(0,3).map(t=>(
                  <span key={t} className="text-[5px] uppercase tracking-[0.14em] px-1.5 py-0.5"
                    style={{color:TAG_COLORS[t]??'#aaa',background:(TAG_COLORS[t]??'#aaa')+'10',
                      border:`1px solid ${TAG_COLORS[t]??'#aaa'}28`,fontFamily:MONO,borderRadius:0}}>{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Studio Sequencer pitch helper ─────────────────────────────────────────────
function getStudioPitch(role: VoiceRole, stepIdx: number, root: number, scale: Scale): number {
  const ivs = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.minor;
  switch (role) {
    case 'KICK':    return root;
    case 'BASS':    return root + 12;
    case 'PERC':    return root + 24;
    case 'PAD':     return root + 24 + (ivs[2] ?? 4);
    case 'STRINGS': return root + 19 + (ivs[0] ?? 0);
    case 'CHOIR':   return root + 24 + (ivs[3] ?? 5);
    case 'LEAD': {
      const deg = Math.floor(stepIdx / 2) % ivs.length;
      return root + 24 + ivs[deg];
    }
    case 'ARP': {
      const deg = stepIdx % ivs.length;
      return root + 24 + ivs[deg];
    }
    default: return root + 24;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const INIT_PRESET = getPreset('eno-drift') ?? MUSIC_PRESETS[0];

interface MusicLabProps { active: boolean; }
export const MusicLab: React.FC<MusicLabProps> = ({ active }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef<MusicState|null>(null);
  const presetRef    = useRef<MusicPreset>(INIT_PRESET);
  const rafRef       = useRef(0);
  const lastTRef     = useRef(0);
  const runningRef   = useRef(false);
  const physRef      = useRef<PhysicsParams>({ ...DEFAULT_PHYSICS, motionStyle: INIT_PRESET.motionStyle ?? 'drift' });
  const roleOverRef  = useRef<Partial<Record<VoiceRole,Partial<RoleConfig>>>>({});
  const cursorRef    = useRef<{wx:number;wy:number;active:boolean}>({wx:0,wy:0,active:false});

  // ── Sprint 4: Selection refs ───────────────────────────────────────────────
  const hoverIdxRef    = useRef<number>(-1);
  const isLassoingRef  = useRef(false);
  const lassoStartRef  = useRef<{x:number;y:number}|null>(null);
  const lassoRectRef   = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  // Context menu (right-click on quantum)
  const [contextMenu, setContextMenu] = useState<{sx:number;sy:number;qIdx:number}|null>(null);

  // ── Zoom / Pan ─────────────────────────────────────────────────────────────
  const zoomPan = useZoomPan();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [presetId,    setPresetId]   = useState(INIT_PRESET.id);
  const [audioOn,     setAudioOn]    = useState(false);
  const [running,     setRunning]    = useState(false);
  const [cinematic,   setCinematic]  = useState(false);
  const [showGrid,    setShowGrid]   = useState(false);
  const [lens,        setLens]       = useState<MusicLens>(INIT_PRESET.lens);
  const [bpm,         setBpm]        = useState(INIT_PRESET.bpm);
  const [fxAmount,    setFxAmount]   = useState(0.5);
  const [masterVol,   setMasterVol]  = useState(0.65);
  const [activeTool,  setActiveTool] = useState<MusicalTool>('gate');
  const [spawnRole,   setSpawnRole]  = useState<VoiceRole>('PAD');
  const [spawnCount,  setSpawnCount] = useState(1);
  const [brushRadius, setBrushRadius]= useState(0.14);
  const [attStrength, setAttStr]     = useState(0.14);
  const [physicsMode, setPhysicsMode] = useState(false);
  const [composeMode, setComposeMode] = useState(false);
  const composeDragRef = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  // Composition snapshot — saved on Compose entry + Release, restored on Reset [R]
  const compositionSnapshotRef = useRef<any>(null);
  // Mirror flag so Reset button re-renders when snapshot is available
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [leftOpen,    setLeftOpen]   = useState(true);
  const [rightOpen,   setRightOpen]  = useState(false);
  const [rightTab,    setRightTab]   = useState<'timbre'|'harmony'|'physics'|'matrix'|'palette'|'aesthetic'>('harmony');
  const [editRole,    setEditRole]   = useState<VoiceRole>('PAD');
  const [showVel,     setShowVel]    = useState(false);
  const [phys,        setPhys]       = useState<PhysicsParams>({ ...DEFAULT_PHYSICS, motionStyle: INIT_PRESET.motionStyle ?? 'drift' });
  const [behaviorId,  setBehaviorId] = useState<string>('');
  const [quantaCount, setQuantaCount]= useState(INIT_PRESET.quantaCount);
  const [pitchMapMode,setPitchMapMode]= useState<'preset'|'canvas'>('preset');
  // ── 3D Visualization (Patch 01.3) ──────────────────────────────────────────
  const [view3D,      setView3D]     = useState(false);
  const view3DRef = useRef(false);
  useEffect(() => { view3DRef.current = view3D; }, [view3D]);
  const [camera3D,    setCamera3D]   = useState<'3d-orbital'|'3d-fpp'|'3d-top'|'3d-side'>('3d-orbital');
  const [show3DGrid,   setShow3DGrid]   = useState(true);
  const [show3DAxes,   setShow3DAxes]   = useState(false);
  const [show3DTrails, setShow3DTrails] = useState(true);
  const [color3DMode,  setColor3DMode]  = useState<'role'|'charge'|'velocity'>('role');
  // ── Live Harmonic Field (mirrors presetRef, updates engine in real time) ──
  const [liveRoot,        setLiveRoot]       = useState(INIT_PRESET.root);
  const [liveScale,       setLiveScale]      = useState<Scale>(INIT_PRESET.scale);
  const [liveHarmonyMode, setLiveHarmonyMode]= useState<'consonant'|'any'|'dissonant'>((INIT_PRESET as any).harmonyMode ?? 'consonant');
  const [liveEventRate,   setLiveEventRate]  = useState((INIT_PRESET as any).eventRate ?? 0.25);
  const [, forceRender] = useState(0);

  // ── New quantum tool state ─────────────────────────────────────────────────
  const channelPtsRef     = useRef<[number,number,number,number][]>([]);
  const lastChanPosRef    = useRef<[number,number]|null>(null);
  const isPaintingChanRef = useRef(false);
  const [channelPreview,  setChannelPreview] = useState<[number,number,number,number][]|null>(null);
  const [tunnelFirst,     setTunnelFirst]    = useState<{x:number;y:number}|null>(null);
  const railDrawingRef    = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const [, setRailDrawing]= useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  // Sequencer UI mirrors
  const [seqActive,    setSeqActive]    = useState(false);
  const [seqTempoMult, setSeqTempoMult] = useState(1);
  const [seqSteps,     setSeqSteps]     = useState(8);

  // ── Studio Sequencer state ─────────────────────────────────────────────────
  const [studioRows,      setStudioRows]      = useState<SRow[]>(DEFAULT_STUDIO_ROWS);
  const [studioActive,    setStudioActive]    = useState(false);
  const [studioStepCount, setStudioStepCount] = useState<8|16>(16);
  const [studioCursorUI,  setStudioCursorUI]  = useState(0);
  const [showStudioSeq,   setShowStudioSeq]   = useState(true);

  // ── Guide overlay ──────────────────────────────────────────────────────────
  const [showGuide, setShowGuide] = useState(false);

  // ── Patch 01.1: overlay/palette/new-tool state ─────────────────────────────
  const [showOverlays,  setShowOverlays]  = useState(true);
  const showOverlaysRef = useRef(true);
  useEffect(() => { showOverlaysRef.current = showOverlays; }, [showOverlays]);
  const [palette, setPalette] = useState<CanvasPalette>({ ...DEFAULT_PALETTE });
  const paletteRef = useRef<CanvasPalette>({ ...DEFAULT_PALETTE });
  useEffect(() => { paletteRef.current = palette; }, [palette]);
  const [visualPresetId, setVisualPresetId] = useState<string>('meta-lite');
  const [aesthetic, setAesthetic] = useState<MusicAesthetic>({ ...DEFAULT_MUSIC_AESTHETIC });
  const aestheticRef = useRef<MusicAesthetic>({ ...DEFAULT_MUSIC_AESTHETIC });
  useEffect(() => { aestheticRef.current = aesthetic; }, [aesthetic]);
  const [lastCoverExport, setLastCoverExport] = useState<number>(0);
  const cageDrawingRef   = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const isCageDrawRef    = useRef(false);
  const stringDrawRef    = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const isStringDrawRef  = useRef(false);
  const zonePointsRef    = useRef<[number,number][]>([]);
  const isPaintZoneRef   = useRef(false);
  const [zonePreviewPts, setZonePreviewPts] = useState<[number,number][]|null>(null);
  const [zoneEffect,   setZoneEffect]   = useState<FxZoneEffect>('slow');
  const [zoneStrength, setZoneStrength] = useState(0.7);
  const [zoneParam,    setZoneParam]    = useState(0.5);
  const [metroStrength, setMetroStrength] = useState(0.10);

  // ── Studio Sequencer refs ──────────────────────────────────────────────────
  const studioRowsRef     = useRef<SRow[]>(DEFAULT_STUDIO_ROWS());
  const studioActiveRef   = useRef(false);
  const studioStepCntRef  = useRef<number>(16);
  const studioCursorRef   = useRef(-1);
  const studioTimerRef    = useRef(0);
  useEffect(() => { studioRowsRef.current  = studioRows;      }, [studioRows]);
  useEffect(() => { studioActiveRef.current= studioActive;    }, [studioActive]);
  useEffect(() => { studioStepCntRef.current= studioStepCount; }, [studioStepCount]);

  // Gate drawing
  const drawingRef    = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const isDrawingRef  = useRef(false);
  const selectedIdRef = useRef<number|null>(null);
  const isDraggingRef = useRef(false);

  // ── Recording ─────────────────────────────────────────────────────────────
  const recorderRef = useRef<CanvasRecorder | null>(null);
  const [recState,   setRecState]   = useState<RecorderState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);

  useEffect(() => {
    recorderRef.current = new CanvasRecorder(setRecState);
    return () => { recorderRef.current?.dispose(); };
  }, []);

  useEffect(() => {
    if (recState !== 'recording') { setRecElapsed(0); return; }
    const id = setInterval(() => setRecElapsed(recorderRef.current?.elapsed ?? 0), 500);
    return () => clearInterval(id);
  }, [recState]);

  // ── Bind wheel zoom to canvas ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const handler = (e: WheelEvent) => zoomPan.handleWheel(e, canvas);
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [active, zoomPan.handleWheel]);

  // Sync physRef with phys state
  useEffect(() => { physRef.current = phys; }, [phys]);

  // ── Harmonic Field live-mutators ──────────────────────────────────────────
  // (defined as const refs to avoid re-allocation per render)
  const NOTE_NAMES = useMemo(() => ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], []);
  const SCALE_LABELS: Record<Scale,string> = useMemo(() => ({
    major:'Major', minor:'Minor', pentatonic:'Penta', blues:'Blues',
    dorian:'Dorian', phrygian:'Phryg', lydian:'Lydian', mixolydian:'Mixo',
    whole_tone:'Whole', harmonic_minor:'H.Min', chromatic:'Chrom',
  }), []);
  const applyRoot = useCallback((r: number) => {
    setLiveRoot(r);
    presetRef.current.root = r;
    const st = stateRef.current;
    if (st) for (const q of st.quanta) q.pitch = quantizeToScale(q.pitch, r, presetRef.current.scale);
  }, []);
  const applyScale = useCallback((s: Scale) => {
    setLiveScale(s);
    presetRef.current.scale = s;
    const st = stateRef.current;
    if (st) for (const q of st.quanta) q.pitch = quantizeToScale(q.pitch, presetRef.current.root, s);
  }, []);
  const applyHarmonyMode = useCallback((m: 'consonant'|'any'|'dissonant') => {
    setLiveHarmonyMode(m);
    (presetRef.current as any).harmonyMode = m;
  }, []);
  const applyEventRate = useCallback((v: number) => {
    setLiveEventRate(v);
    (presetRef.current as any).eventRate = v;
  }, []);

  // ── Preset-scene variation helpers ─────────────────────────────────────────
  const fnv1a32 = useCallback((str: string): number => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }, []);
  const mulberry32 = useCallback((seed: number) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, []);
  const clamp = useCallback((v: number, a: number, b: number) => Math.max(a, Math.min(b, v)), []);

  const pickBehaviorForPreset = useCallback((p: MusicPreset): string => {
    if (BEHAVIOR_BY_ID[p.motionStyle as any]) return p.motionStyle as any;
    const map: Record<string, string> = {
      swarm: 'murmuration',
      orbit: 'revolution',
      flow: 'migration',
      drift: 'meditation',
      spiral: 'revolution',
      lattice: 'school',
      ballistic: 'chaos',
    };
    return map[p.motionStyle] ?? 'murmuration';
  }, []);

  const makePhysicsForPreset = useCallback((p: MusicPreset, variation: number): { phys: PhysicsParams; behaviorId: string } => {
    const seed = (fnv1a32(p.id) ^ Math.floor(clamp(variation, 0, 1) * 0xffffffff)) >>> 0;
    const r = mulberry32(seed);
    const baseId = pickBehaviorForPreset(p);
    const base = BEHAVIOR_BY_ID[baseId] ?? BEHAVIOR_PRESETS[0];

    let out: PhysicsParams = applyBehaviorToPhysics(base, { ...DEFAULT_PHYSICS });
    out.entainment = p.entainment;

    const t = clamp((p.intensity ?? 2) / 5, 0, 1);
    const j = () => (r() - 0.5) * 2;
    out.damping     = clamp((out.damping ?? DEFAULT_PHYSICS.damping) - t * 0.012 + j() * 0.004, 0.90, 0.999);
    out.maxSpeed    = clamp((out.maxSpeed ?? DEFAULT_PHYSICS.maxSpeed) * (0.78 + t * 0.65) + j() * 0.06, 0.02, 0.90);
    out.turbulence  = clamp((out.turbulence ?? DEFAULT_PHYSICS.turbulence) + t * 0.14 + j() * 0.12, 0, 1);
    out.cohesion    = clamp((out.cohesion ?? DEFAULT_PHYSICS.cohesion) * (0.75 + t * 0.55) + j() * 0.35, 0, 3);
    out.separation  = clamp((out.separation ?? DEFAULT_PHYSICS.separation) * (0.75 + t * 0.60) + j() * 0.35, 0, 3);
    out.alignment   = clamp((out.alignment ?? DEFAULT_PHYSICS.alignment) * (0.70 + t * 0.90) + j() * 0.25, 0, 2);
    out.zoneRadius  = clamp((out.zoneRadius ?? DEFAULT_PHYSICS.zoneRadius) + j() * 0.08, 0.03, 0.50);
    out.vortexForce = clamp((out.vortexForce ?? DEFAULT_PHYSICS.vortexForce) + (p.motionStyle === 'orbit' ? 0.10 : 0) + j() * 0.06, 0, 0.40);
    out.burstRate   = clamp((out.burstRate ?? DEFAULT_PHYSICS.burstRate) + t * 0.22 + j() * 0.18, 0, 1);

    if (p.motionStyle === 'migration' || p.motionStyle === 'exodus' || base.motionStyle === 'migration' || base.motionStyle === 'exodus') {
      const ang = r() * Math.PI * 2;
      out.migrationX = Math.cos(ang);
      out.migrationY = Math.sin(ang);
    }

    out.bounceWalls = false;
    out.physicsOnly = false;
    out.restitution = out.restitution ?? 0.82;
    out.motionStyle = base.motionStyle;
    return { phys: out, behaviorId: base.id };
  }, [applyBehaviorToPhysics, clamp, fnv1a32, mulberry32, pickBehaviorForPreset]);

  const seedParticleTimbresForPreset = useCallback((p: MusicPreset, variation: number) => {
    const st = stateRef.current;
    if (!st || st.count <= 0) return;
    const seed = (fnv1a32(p.id + '_tmb') ^ Math.floor(clamp(variation, 0, 1) * 0xffffffff)) >>> 0;
    const r = mulberry32(seed);
    const tags = new Set((p.tags ?? []).map(String));
    const ambient = tags.has('Ambient') || tags.has('Meditative') || tags.has('Drone');
    const club    = tags.has('Techno') || tags.has('Club') || tags.has('Rave') || tags.has('Breakbeat') || tags.has('Groove');
    const classical= tags.has('Classical') || tags.has('Orchestral') || tags.has('Strings') || tags.has('Choral');

    const pools: Record<VoiceRole, number[]> = {
      KICK:    club ? [2,2,2] : [2,2],
      BASS:    club ? [0,0,1,0] : ambient ? [0,0,0] : [0,0,1],
      PERC:    club ? [9,10,11,9,10] : [9,10,11],
      PAD:     ambient ? [6,6,7,8,6] : classical ? [6,8,7,6] : [6,6,8,7],
      LEAD:    ambient ? [3,8,5,3] : club ? [4,4,5,1] : classical ? [3,5,8] : [4,5,3,8],
      ARP:     club ? [3,11,5,3] : [3,8,5],
      STRINGS: classical ? [6,8,7,6] : [6,7,8],
      CHOIR:   ambient || classical ? [7,7,6,8] : [7,6,8],
    };

    const probBase = ambient ? 0.22 : club ? 0.42 : 0.30;
    for (const q of st.quanta) {
      if (r() > probBase) { q.timbreIdx = -1; continue; }
      const pool = pools[q.role] ?? [6,8,5];
      q.timbreIdx = pool[Math.floor(r() * pool.length)] ?? -1;
    }
  }, [clamp, fnv1a32, mulberry32]);

  // Per-role random timbre
  const randomizeRole = useCallback((role: VoiceRole) => {
    const idx = Math.floor(Math.random() * TIMBRE_TEMPLATES.length);
    const t   = TIMBRE_TEMPLATES[idx];
    setRoleParams(role, { waveform:t.wave, filterType:t.fType, filterFreq:t.fFreq,
      filterQ:t.fQ, envelope:{...t.env}, gainScale:t.gain, detune:t.det, cooldownMin:t.cd });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-particle random timbre (used in context menu)
  const randomizeParticleTmb = useCallback((qIdx: number) => {
    const q = stateRef.current?.quanta[qIdx];
    if (!q) return;
    q.timbreIdx = Math.floor(Math.random() * TIMBRE_TEMPLATES.length);
    forceRender(n=>n+1);
  }, []);

  // ── Live Pad: quantize selection to a scale degree ─────────────────────────
  const padQuantizeDegree = useCallback((intervalSemis: number) => {
    const st = stateRef.current;
    if (!st) return;
    const p = presetRef.current;

    const selected = st.quanta.filter(q => q.selected);
    const targets: typeof selected = selected.length
      ? selected
      : (() => {
        // If nothing selected: quantize nearest to cursor (small radius)
        const wx = cursorRef.current.wx, wy = cursorRef.current.wy;
        let best: any = null, bestD = 0.14;
        for (const q of st.quanta) {
          const d = Math.hypot(q.x - wx, q.y - wy);
          if (d < bestD) { bestD = d; best = q; }
        }
        return best ? [best] : [];
      })();
    if (!targets.length) return;

    const targetPc = (p.root + intervalSemis) % 12;

    const nearestPitchInRange = (cur: number, pc: number, minP: number, maxP: number): number => {
      let best = clamp(cur, minP, maxP);
      let bestD = 1e9;
      for (let m = Math.floor(minP); m <= Math.floor(maxP); m++) {
        if ((m % 12 + 12) % 12 !== pc) continue;
        const d = Math.abs(m - cur);
        if (d < bestD) { bestD = d; best = m; }
      }
      return best;
    };

    for (const q of targets) {
      const base = p.roles[q.role] ?? ROLE_DEFAULTS[q.role];
      const over = roleOverRef.current[q.role];
      const cfg  = over ? ({ ...base, ...over } as RoleConfig) : base;
      const [minP, maxP] = cfg.pitchRange ?? [48, 84];
      q.pitch = nearestPitchInRange(q.pitch, targetPc, minP, maxP);
    }

    // Audition the hit (uses the currently edited role)
    if (audioEngine.ready) {
      const base = p.roles[editRole] ?? ROLE_DEFAULTS[editRole];
      const over = roleOverRef.current[editRole];
      const cfg  = over ? ({ ...base, ...over } as RoleConfig) : base;
      const [minP, maxP] = cfg.pitchRange ?? [48, 84];
      const midi = nearestPitchInRange((minP + maxP) / 2, targetPc, minP, maxP);
      audioEngine.fire({
        pitch: midi,
        velocity: 0.55,
        role: editRole,
        x: 0,
        y: 0,
        duration: Math.max(0.05, cfg.envelope.attack + cfg.envelope.decay + cfg.envelope.sustain * 1.5),
        timbre: 0.6,
      }, cfg);
    }

    forceRender(n => n + 1);
  }, [clamp, editRole]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const variation = Math.random();
    stateRef.current = createMusicState(INIT_PRESET, { variation });
    stateRef.current.bpm = INIT_PRESET.bpm;
    seedParticleTimbresForPreset(INIT_PRESET, variation);
    const { phys: initPhys, behaviorId: bId } = makePhysicsForPreset(INIT_PRESET, variation);
    physRef.current = initPhys;
    setPhys(initPhys);
    setBehaviorId(bId);
    setSeqActive(stateRef.current.sequencer.active);
    setSeqSteps(stateRef.current.sequencer.steps.length);
    setSeqTempoMult(stateRef.current.sequencer.tempoMult);
  }, [makePhysicsForPreset, seedParticleTimbresForPreset]);

  // ── Apply preset ──────────────────────────────────────────────────────────
  const applyPreset = useCallback((id: string, opts?: { keepCinematic?: boolean }) => {
    const p = getPreset(id); if (!p) return;
    const variation = Math.random();
    presetRef.current  = p;
    stateRef.current   = createMusicState(p, { variation });
    stateRef.current.bpm = p.bpm;
    roleOverRef.current  = {};
    setPresetId(id); setBpm(p.bpm); setLens(p.lens);
    // ── Never override the user's HUD visibility from a preset ──────────────
    // Removed: setCinematic(p.cinematic) — caused HUD to vanish on preset switch
    setQuantaCount(p.quantaCount);
    seedParticleTimbresForPreset(p, variation);
    const { phys: newPhys, behaviorId: bId } = makePhysicsForPreset(p, variation);
    physRef.current = newPhys;
    setPhys(newPhys);
    setBehaviorId(bId);
    // Sync sequencer UI to seeded scene
    setSeqActive(stateRef.current.sequencer.active);
    setSeqSteps(stateRef.current.sequencer.steps.length);
    setSeqTempoMult(stateRef.current.sequencer.tempoMult);
    // Sync live harmonic states
    setLiveRoot(p.root);
    setLiveScale(p.scale);
    setLiveHarmonyMode((p as any).harmonyMode ?? 'any');
    setLiveEventRate((p as any).eventRate ?? 1.0);
    if (audioEngine.ready) {
      audioEngine.setReverb(p.reverbAmt * fxAmount);
      audioEngine.setDelay(p.delayAmt * fxAmount, p.delayTime);
      audioEngine.setMasterGain(p.masterGain * masterVol);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxAmount, makePhysicsForPreset, masterVol, seedParticleTimbresForPreset]);

  // ── Sync BPM ──────────────────────────────────────────────────────────────
  useEffect(() => { if (stateRef.current) stateRef.current.bpm = bpm; }, [bpm]);

  // ── Sync FX ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioEngine.ready) return;
    const p = presetRef.current;
    audioEngine.setReverb(p.reverbAmt * fxAmount);
    audioEngine.setDelay(p.delayAmt * fxAmount, p.delayTime);
  }, [fxAmount]);
  useEffect(() => {
    if (audioEngine.ready) audioEngine.setMasterGain(presetRef.current.masterGain * masterVol);
  }, [masterVol]);

  // ── Audio toggle ──────────────────────────────────────────────────────────
  const handleAudioToggle = useCallback(async () => {
    if (!audioEngine.ready) {
      await audioEngine.init();
      const p = presetRef.current;
      audioEngine.setReverb(p.reverbAmt * fxAmount);
      audioEngine.setDelay(p.delayAmt * fxAmount, p.delayTime);
      audioEngine.setMasterGain(p.masterGain * masterVol);
      setAudioOn(true); runningRef.current = true; setRunning(true);
    } else if (!audioOn) {
      // Engine already initialised (hot-reload / remount) but React state reset —
      // dismiss overlay and start fresh without reinitialising the AudioContext
      const p = presetRef.current;
      audioEngine.restoreGains(p.reverbAmt * fxRef.current, p.delayAmt * fxRef.current, p.delayTime, p.masterGain * masterVolRef.current);
      setAudioOn(true); runningRef.current = true; setRunning(true);
    } else {
      const next = !runningRef.current;
      runningRef.current = next;
      setRunning(next);
      if (!next) {
        // Pausing → cut everything instantly
        audioEngine.cutAll();
      } else {
        // Unpausing → restore FX gains with soft fade-in
        const p = presetRef.current;
        audioEngine.restoreGains(p.reverbAmt * fxRef.current, p.delayAmt * fxRef.current, p.delayTime, p.masterGain * masterVolRef.current);
      }
    }
  }, [fxAmount, masterVol, audioOn]);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  const lensRef       = useRef<MusicLens>('Harmony');
  const cinematicRef  = useRef(false);
  const fxRef         = useRef(0.5);
  const masterVolRef  = useRef(1.0);
  const showVelRef    = useRef(false);
  const pitchMapModeRef = useRef<'preset'|'canvas'>('preset');
  useEffect(() => { lensRef.current      = lens;       }, [lens]);
  useEffect(() => { cinematicRef.current = cinematic;  }, [cinematic]);
  useEffect(() => { fxRef.current        = fxAmount;   }, [fxAmount]);
  useEffect(() => { masterVolRef.current = masterVol;  }, [masterVol]);
  useEffect(() => { showVelRef.current   = showVel;    }, [showVel]);
  useEffect(() => { pitchMapModeRef.current = pitchMapMode; }, [pitchMapMode]);

  const applyVisualPreset = useCallback((id: string) => {
    const vp = getMusicVisualPreset(id);
    if (!vp) return;
    setVisualPresetId(id);
    if (vp.palette) {
      setPalette(prev => ({ ...prev, ...vp.palette, roleColorOverrides: { ...prev.roleColorOverrides, ...(vp.palette!.roleColorOverrides ?? {}) } }));
    }
    if (vp.aesthetic) {
      setAesthetic(prev => ({
        ...prev,
        ...vp.aesthetic,
        canvas:      { ...prev.canvas,      ...(vp.aesthetic!.canvas ?? {}) },
        quanta:      { ...prev.quanta,      ...(vp.aesthetic!.quanta ?? {}) },
        trails:      { ...prev.trails,      ...(vp.aesthetic!.trails ?? {}) },
        connections: { ...prev.connections, ...(vp.aesthetic!.connections ?? {}) },
        tools:       { ...prev.tools,       ...(vp.aesthetic!.tools ?? {}) },
        post:        { ...prev.post,        ...(vp.aesthetic!.post ?? {}) },
        overlays:    { ...prev.overlays,    ...(vp.aesthetic!.overlays ?? {}) },
        threeD:      { ...prev.threeD,      ...(vp.aesthetic!.threeD ?? {}) },
      }));
    }
  }, []);

  const exportSnapshotToMetaArt = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    const snap = captureMusicSnapshotV1({
      state: st,
      preset: presetRef.current,
      palette: paletteRef.current,
      aesthetic: aestheticRef.current,
      phys: physRef.current,
      roleOverrides: roleOverRef.current,
    });
    saveMusicSnapshotToStorage(snap);
    setLastCoverExport(Date.now());
  }, []);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (!canvasRef.current || !stateRef.current) return;
      const dt = Math.min(0.05, (now - lastTRef.current) / 1000);
      lastTRef.current = now;
      const state  = stateRef.current;
      const preset = presetRef.current;

      if (runningRef.current) {
        if (audioEngine.ready) audioEngine.tickEnergy(dt);
        state.roleEnergy = { ...audioEngine.roleEnergy };

        // Build effectivePreset: merge ROLE_DEFAULTS → preset.roles → roleOverRef
        // This fixes ARP/STRINGS/CHOIR that are absent in some presets.
        const effectiveRoles: Partial<Record<VoiceRole, RoleConfig>> = {};
        for (const role of VOICE_ROLES) {
          const base  = preset.roles[role] ?? ROLE_DEFAULTS[role];
          const over  = roleOverRef.current[role];
          effectiveRoles[role] = over ? { ...base, ...over } as RoleConfig : base;
        }
        const effectivePreset = { ...preset, roles: effectiveRoles };

        // ── Pitch mapping modes ────────────────────────────────────────────
        if (pitchMapModeRef.current === 'canvas') {
          const iv = SCALE_INTERVALS[effectivePreset.scale];
          const degN = Math.max(1, iv.length);
          for (const q of state.quanta) {
            const cfg = effectiveRoles[q.role] ?? preset.roles[q.role] ?? ROLE_DEFAULTS[q.role];
            const [minP, maxP] = cfg.pitchRange ?? [48, 84];
            const x01 = clamp((q.x + 1) / 2, 0, 1);
            const y01 = clamp((1 - (q.y + 1) / 2), 0, 1); // top = high
            const deg = Math.floor(x01 * degN) % degN;
            const pc = (effectivePreset.root + iv[deg]) % 12;
            const octMin = Math.floor((minP - pc) / 12);
            const octMax = Math.floor((maxP - pc) / 12);
            const oct = Math.round(octMin + (octMax - octMin) * y01);
            const target = clamp(pc + oct * 12, minP, maxP);
            q.pitch = quantizeToScale(target, effectivePreset.root, effectivePreset.scale);
          }
        }

        stepMusic(state, effectivePreset, physRef.current, dt, (ev: NoteEvent, cfg: RoleConfig) => {
          let finalCfg = cfg; // overrides already baked into effectivePreset
          // Per-particle timbre (timbreIdx >= 0) beats role-level override
          if (ev.timbreIdx !== undefined && ev.timbreIdx >= 0) {
            const tmpl = TIMBRE_TEMPLATES[ev.timbreIdx];
            if (tmpl) finalCfg = { ...cfg, waveform:tmpl.wave, filterType:tmpl.fType,
              filterFreq:tmpl.fFreq, filterQ:tmpl.fQ, envelope:{...tmpl.env},
              gainScale:cfg.gainScale*tmpl.gain, detune:tmpl.det, cooldownMin:tmpl.cd };
          }
          if (audioEngine.ready) audioEngine.fire(ev, finalCfg);
        });

        // ── Studio Sequencer tick (deterministic 4/4 grid) ────────────────
        if (studioActiveRef.current && audioEngine.ready) {
          const stepDur = 15 / state.bpm; // (60/bpm)/4 = one 16th-note
          studioTimerRef.current += dt;
          let stepped = false;
          while (studioTimerRef.current >= stepDur) {
            studioTimerRef.current -= stepDur;
            studioCursorRef.current =
              (studioCursorRef.current + 1) % studioStepCntRef.current;
            stepped = true;
            const cur     = studioCursorRef.current;
            const hasSolo = studioRowsRef.current.some(r => r.solo);
            for (const row of studioRowsRef.current) {
              if (row.muted || (hasSolo && !row.solo)) continue;
              const step = row.steps[cur];
              if (!step?.on) continue;
              const baseCfg = preset.roles[row.role];
              if (!baseCfg) continue;
              const over     = roleOverRef.current[row.role];
              const finalCfg = over ? { ...baseCfg, ...over } as RoleConfig : baseCfg;
              const pitch    = getStudioPitch(row.role, cur, preset.root, preset.scale);
              audioEngine.fire({
                pitch, velocity: step.vel * 0.92,
                role:     row.role,
                x:        (Math.random() - 0.5) * 1.6,
                y:        (Math.random() - 0.5) * 1.6,
                duration: Math.max(0.05, finalCfg.envelope.attack + finalCfg.envelope.decay + finalCfg.envelope.sustain * 1.5),
                timbre:   0.5,
              }, finalCfg);
            }
          }
          if (stepped) setStudioCursorUI(studioCursorRef.current);
        }
      }
      const beatPulse = state.beatPhase < 0.08 || state.beatPhase > 0.92;
      const cursor: ToolCursor = {
        tool: activeTool, wx: cursorRef.current.wx, wy: cursorRef.current.wy,
        radius: brushRadius, active: cursorRef.current.active,
      };
      if (!view3DRef.current) {
        renderMusic(
          canvasRef.current!, state, preset, lensRef.current,
          cinematicRef.current, fxRef.current, beatPulse,
          drawingRef.current, cursor, showVelRef.current,
          channelPtsRef.current.length>1?channelPtsRef.current:null,
          tunnelFirst,
          railDrawingRef.current,
          zoomPan.zoomRef.current,
          zoomPan.panXRef.current,
          zoomPan.panYRef.current,
          hoverIdxRef.current,
          lassoRectRef.current,
          showOverlaysRef.current,
          paletteRef.current,
          cageDrawingRef.current,
          zonePointsRef.current.length > 2 ? zonePointsRef.current : null,
          aestheticRef.current,
        );
      }

      // ── Compose-mode velocity drag overlay ─────────────────────────────
      const drag = composeDragRef.current;
      if (drag && canvasRef.current) {
        const c   = canvasRef.current;
        const ctx = c.getContext('2d');
        if (ctx) {
          const sc  = Math.min(c.width, c.height) / 2;
          const cxS = c.width  / 2 + zoomPan.panXRef.current * sc * zoomPan.zoomRef.current;
          const cyS = c.height / 2 + zoomPan.panYRef.current * sc * zoomPan.zoomRef.current;
          const z   = zoomPan.zoomRef.current;
          const x1s = cxS + drag.x1 * sc * z, y1s = cyS + drag.y1 * sc * z;
          const x2s = cxS + drag.x2 * sc * z, y2s = cyS + drag.y2 * sc * z;
          const dx = x2s - x1s, dy = y2s - y1s;
          const len = Math.sqrt(dx * dx + dy * dy);
          const spawnCol = ROLE_COLORS[spawnRole] || '#fff';
          // Draw arrow shaft
          ctx.save();
          ctx.strokeStyle = spawnCol;
          ctx.lineWidth   = 1.5;
          ctx.globalAlpha = 0.85;
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(x1s, y1s); ctx.lineTo(x2s, y2s); ctx.stroke();
          ctx.setLineDash([]);
          // Arrow head
          if (len > 4) {
            const ax = dx / len, ay = dy / len;
            const hw = 7;
            ctx.beginPath();
            ctx.moveTo(x2s, y2s);
            ctx.lineTo(x2s - ax * hw - ay * hw * 0.5, y2s - ay * hw + ax * hw * 0.5);
            ctx.lineTo(x2s - ax * hw + ay * hw * 0.5, y2s - ay * hw - ax * hw * 0.5);
            ctx.closePath();
            ctx.fillStyle = spawnCol;
            ctx.fill();
          }
          // Spawn point circle
          ctx.beginPath(); ctx.arc(x1s, y1s, 4, 0, Math.PI * 2);
          ctx.fillStyle = spawnCol; ctx.globalAlpha = 0.6; ctx.fill();
          ctx.restore();
        }
      }
    };
    lastTRef.current = performance.now();
    rafRef.current   = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeTool, brushRadius, tunnelFirst]);

  // ── Controller Mode V1 ───────────────────────────────────────────────────
  const ctrlCursorElRef  = useRef<HTMLDivElement | null>(null);
  const [ctrlFrame, setCtrlFrame] = useState<ControllerFrameState>({
    connected: false, name: '', axes:{lx:0,ly:0,rx:0,ry:0},
    triggers:{lt:0,rt:0}, buttons:{} as never, justPressed:{} as never, justReleased:{} as never,
  });
  const [ctrlHUDVis, setCtrlHUDVis] = useState(true);
  const [musicQuickMenuOpen, setMusicQuickMenuOpen] = useState(false);
  const handleAudioToggleRef = useRef(handleAudioToggle);
  const applyPresetRef = useRef(applyPreset);
  useEffect(() => { handleAudioToggleRef.current = handleAudioToggle; }, [handleAudioToggle]);
  useEffect(() => { applyPresetRef.current = applyPreset; }, [applyPreset]);

  useEffect(() => {
    if (!active) return;
    const ctrlMgr = getControllerManager();
    const ctrlCursor = { x: 0.5, y: 0.5 };
    const SPEED = 0.014;
    const MUSIC_PRESETS_LOCAL = MUSIC_PRESETS;
    let presetIdx = 0;
    let prevA = false, prevB = false, prevDL = false, prevDR = false;
    let prevDU = false, prevDD = false, prevLB = false, prevRB = false;
    let prevStart = false, prevY = false;
    let lastHapticBeat = 0, lastBpmHaptic = 0;
    const bpmRef2 = { current: 120 };

    const ctrlLoop = (now: number) => {
      const raf = requestAnimationFrame(ctrlLoop);
      (window as Record<string, unknown>)['__ctrl_music_raf'] = raf;

      const ctrl = ctrlMgr.poll(now);
      if (!ctrl.connected) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width, H = rect.height;

      // Move cursor
      ctrlCursor.x = Math.max(0, Math.min(1, ctrlCursor.x + ctrl.axes.lx * SPEED));
      ctrlCursor.y = Math.max(0, Math.min(1, ctrlCursor.y + ctrl.axes.ly * SPEED));

      // Update cursor DOM directly (no React re-render)
      const el = ctrlCursorElRef.current;
      if (el) {
        el.style.display = 'block';
        el.style.left = `${ctrlCursor.x * 100}%`;
        el.style.top  = `${ctrlCursor.y * 100}%`;
      }

      // Map to world coords (zoom-aware approximation)
      const zoom = (zoomPan as Record<string, Record<string, number>>).zoomRef?.current ?? 1;
      const panX = (zoomPan as Record<string, Record<string, number>>).panXRef?.current ?? 0;
      const panY = (zoomPan as Record<string, Record<string, number>>).panYRef?.current ?? 0;
      const wx = (ctrlCursor.x * W / zoom) - panX / zoom;
      const wy = (ctrlCursor.y * H / zoom) - panY / zoom;
      cursorRef.current.wx = wx;
      cursorRef.current.wy = wy;
      cursorRef.current.active = ctrl.triggers.rt > 0.06;

      // LT → deactivate (mute)
      if (ctrl.triggers.lt > 0.3) cursorRef.current.active = false;

      // RS vertical → adjust filter (if phys has filterCutoff)
      if (Math.abs(ctrl.axes.ry) > 0.15) {
        setPhys((prev: PhysicsParams) => ({
          ...prev,
          entainment: Math.max(0, Math.min(1, (prev.entainment ?? 0.5) - ctrl.axes.ry * 0.018)),
        }));
      }

      // A → audio toggle
      if (ctrl.buttons.a && !prevA) { handleAudioToggleRef.current(); ctrlMgr.rumble(0.2, 60); }

      // B → panic / stop
      if (ctrl.buttons.b && !prevB) { runningRef.current = false; setRunning(false); audioEngine.cutAll(); ctrlMgr.rumble(0.35, 80); }

      // LB/RB → cycle tools (spawnRole cycle)
      const roles: VoiceRole[] = ['BASS','PAD','LEAD','PERC','ARP','STRINGS'];
      if (ctrl.buttons.lb && !prevLB) {
        const idx = roles.indexOf(spawnRole);
        setSpawnRole(roles[(idx - 1 + roles.length) % roles.length]);
        ctrlMgr.rumble(0.12, 35);
      }
      if (ctrl.buttons.rb && !prevRB) {
        const idx = roles.indexOf(spawnRole);
        setSpawnRole(roles[(idx + 1) % roles.length]);
        ctrlMgr.rumble(0.12, 35);
      }

      // D-pad left/right → presets
      if (ctrl.buttons.dpadLeft && !prevDL) {
        presetIdx = (presetIdx - 1 + MUSIC_PRESETS_LOCAL.length) % MUSIC_PRESETS_LOCAL.length;
        applyPresetRef.current(MUSIC_PRESETS_LOCAL[presetIdx].id);
        ctrlMgr.rumble(0.12, 35);
      }
      if (ctrl.buttons.dpadRight && !prevDR) {
        presetIdx = (presetIdx + 1) % MUSIC_PRESETS_LOCAL.length;
        applyPresetRef.current(MUSIC_PRESETS_LOCAL[presetIdx].id);
        ctrlMgr.rumble(0.12, 35);
      }

      // D-pad up/down → BPM adjust
      if (ctrl.buttons.dpadUp && !prevDU) setBpm((b: number) => Math.min(200, b + 5));
      if (ctrl.buttons.dpadDown && !prevDD) setBpm((b: number) => Math.max(40, b - 5));

      // Start → open quick menu (preset list + tool list)
      if (ctrl.buttons.start && !prevStart) setMusicQuickMenuOpen(v => !v);

      // Y → capture / snapshot marker + haptic tap
      if (ctrl.buttons.y && !prevY) {
        ctrlMgr.rumble(0.35, 80, 0.4, 0.6);
      }

      // Musical haptics — light pulse every beat (approx. via BPM)
      if (runningRef.current && audioOn) {
        bpmRef2.current = bpm;
        const beatMs = (60 / Math.max(40, bpmRef2.current)) * 1000;
        if (now - lastBpmHaptic > beatMs * 0.9) {
          ctrlMgr.rumble(ctrl.triggers.rt > 0.1 ? 0.45 : 0.18, 30, 0.8, 0.2);
          lastBpmHaptic = now;
        }
      }

      if (now % 60 < 16) setCtrlFrame({ ...ctrl });

      prevA = ctrl.buttons.a; prevB = ctrl.buttons.b;
      prevDL = ctrl.buttons.dpadLeft; prevDR = ctrl.buttons.dpadRight;
      prevDU = ctrl.buttons.dpadUp; prevDD = ctrl.buttons.dpadDown;
      prevLB = ctrl.buttons.lb; prevRB = ctrl.buttons.rb;
      prevStart = ctrl.buttons.start; prevY = ctrl.buttons.y;
    };

    const initRaf = requestAnimationFrame(ctrlLoop);
    return () => {
      cancelAnimationFrame(initRaf);
      cancelAnimationFrame((window as Record<string, number>)['__ctrl_music_raf'] ?? 0);
    };
  }, [active]); // eslint-disable-line

  // ── World coords (zoom-aware) ─────────────────────────────────────────────
  const s2w = useCallback((e: React.MouseEvent|MouseEvent): [number,number] => {
    const c = canvasRef.current; if (!c) return [0,0];
    return screenToWorldMusic(
      e.clientX, e.clientY, c.getBoundingClientRect(),
      zoomPan.zoomRef.current, zoomPan.panXRef.current, zoomPan.panYRef.current,
    );
  }, [zoomPan.zoomRef, zoomPan.panXRef, zoomPan.panYRef]);

  // ── Apply brush effect ────────────────────────────────────────────────────
  const applyBrush = useCallback((wx:number, wy:number, tool:'excite'|'freeze') => {
    const st = stateRef.current; if (!st) return;
    const r2 = brushRadius*brushRadius;
    for (const q of st.quanta) {
      const dx=q.x-wx,dy=q.y-wy;
      if (dx*dx+dy*dy>r2) continue;
      if (tool==='excite') {
        q.charge = Math.min(1, q.charge+0.06);
        const spd=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
        if (spd>0.001){q.vx*=1.10;q.vy*=1.10;}
      } else {
        q.vx*=0.82;q.vy*=0.82;
        q.charge=Math.max(0,q.charge-0.04);
      }
    }
  }, [brushRadius]);

  // ── Spawn quantum ─────────────────────────────────────────────────────────
  const spawnQuantum = useCallback((wx:number, wy:number, role?:VoiceRole, ivx=0, ivy=0) => {
    const st=stateRef.current,p=presetRef.current; if(!st) return;
    const r = role ?? spawnRole;
    const newId = Date.now()%100000+st.quanta.length;
    const hasInitialVel = ivx !== 0 || ivy !== 0;
    for (let c=0;c<spawnCount;c++) {
      const ox=(Math.random()-.5)*.06*c, oy=(Math.random()-.5)*.06*c;
      const q = makeQuantum(newId+c, p, r, wx+ox, wy+oy);
      q.vx = hasInitialVel ? ivx + (Math.random()-.5)*.005 : (Math.random()-.5)*.025;
      q.vy = hasInitialVel ? ivy + (Math.random()-.5)*.005 : (Math.random()-.5)*.025;
      q.charge=0.5+Math.random()*.3;
      st.quanta.push(q);st.count++;
      spawnRipple(st,{pitch:q.pitch,velocity:.65,role:r,x:wx+ox,y:wy+oy,duration:.3,timbre:.6},ROLE_COLORS[r]);
      if (audioEngine.ready) {
        const cfg = p.roles[r] ?? ROLE_DEFAULTS[r];
        if (cfg) audioEngine.fire({pitch:q.pitch,velocity:.65,role:r,x:wx+ox,y:wy+oy,
          duration:cfg.envelope.attack+cfg.envelope.decay+cfg.envelope.release,timbre:.6},cfg);
      }
    }
    setQuantaCount(st.count);
  }, [spawnRole, spawnCount]);

  // ── Select nearest ────────────────────────────────────────────────────────
  const selectNearest = useCallback((wx:number,wy:number): number|null => {
    const st=stateRef.current; if(!st) return null;
    let best=-1,bestD=0.08;
    for (let i=0;i<st.count;i++) {
      const q=st.quanta[i];
      const d=Math.sqrt((q.x-wx)**2+(q.y-wy)**2);
      if (d<bestD){bestD=d;best=i;}
    }
    // Clear old selection
    for (const q of st.quanta) q.selected=false;
    if (best>=0) st.quanta[best].selected=true;
    selectedIdRef.current=best>=0?st.quanta[best].id:null;
    forceRender(n=>n+1);
    return best>=0?best:null;
  }, []);

  // ── Mutate at cursor ──────────────────────────────────────────────────────
  const mutateAtCursor = useCallback((wx:number,wy:number) => {
    const st=stateRef.current; if(!st) return;
    let best=-1,bestD=0.08;
    for (let i=0;i<st.count;i++) {
      const q=st.quanta[i];
      const d=Math.sqrt((q.x-wx)**2+(q.y-wy)**2);
      if (d<bestD){bestD=d;best=i;}
    }
    if (best<0) return;
    const q=st.quanta[best];
    const idx=VOICE_ROLES.indexOf(q.role);
    q.role=VOICE_ROLES[(idx+1)%VOICE_ROLES.length];
    q.mutations++;q.roleLockTimer=1.5;
    st.emergent.push({type:'mutation',x:q.x,y:q.y,r:.04,alpha:1,color:'#ffffff'});
    forceRender(n=>n+1);
  }, []);

  // ── Erase at cursor ───────────────────────────────────────────────────────
  const eraseAtCursor = useCallback((wx:number,wy:number) => {
    const st=stateRef.current; if(!st) return;
    // Gates
    for (let i=st.gates.length-1;i>=0;i--) {
      const g=st.gates[i];
      const dx=g.x2-g.x1,dy=g.y2-g.y1,len2=dx*dx+dy*dy;
      if (len2<.0001) continue;
      const t=Math.max(0,Math.min(1,((wx-g.x1)*dx+(wy-g.y1)*dy)/len2));
      const px=g.x1+t*dx,py=g.y1+t*dy;
      if ((wx-px)**2+(wy-py)**2<.03){st.gates.splice(i,1);return;}
    }
    // Attractors
    for (let i=st.attractors.length-1;i>=0;i--) {
      const a=st.attractors[i];
      if ((a.x-wx)**2+(a.y-wy)**2<.025){st.attractors.splice(i,1);return;}
    }
    // Quanta
    let best=-1,bestD=0.07;
    for (let i=0;i<st.count;i++) {
      const q=st.quanta[i],d=Math.sqrt((q.x-wx)**2+(q.y-wy)**2);
      if (d<bestD){bestD=d;best=i;}
    }
    if (best>=0){st.quanta.splice(best,1);st.count--;}
    setQuantaCount(st.count);
    forceRender(n=>n+1);
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { zoomPan.handlePanStart(e); return; }
    if (e.button!==0) return;
    const [wx,wy]=s2w(e);
    cursorRef.current.active=true;
    const st=stateRef.current,p=presetRef.current;
    switch (activeTool) {
      case 'gate': case 'mirror': case 'absorber': case 'membrane':
        isDrawingRef.current=true;
        drawingRef.current={x1:wx,y1:wy,x2:wx,y2:wy};
        break;
      case 'spawn':
        if (composeMode) {
          // Start velocity-drag; spawn happens on mouseUp
          composeDragRef.current = { x1:wx, y1:wy, x2:wx, y2:wy };
        } else {
          spawnQuantum(wx,wy);
        }
        break;
      case 'attractor':
        st?.attractors.push({x:wx,y:wy,strength:attStrength,vortexStr:0,radius:.55,type:'attractor'});
        break;
      case 'repulsor':
        st?.attractors.push({x:wx,y:wy,strength:-attStrength,vortexStr:0,radius:.45,type:'repulsor'});
        break;
      case 'vortex':
        st?.attractors.push({x:wx,y:wy,strength:0,vortexStr:attStrength*.8,radius:.6,type:'vortex'});
        break;
      case 'metro':
        st?.attractors.push({x:wx,y:wy,strength:metroStrength,vortexStr:0,radius:.50,type:'metro'});
        break;
      case 'excite': case 'freeze':
        isDrawingRef.current=true; applyBrush(wx,wy,activeTool); break;
      case 'select': {
        const idx=selectNearest(wx,wy);
        if (idx!==null) {
          isDraggingRef.current=true;
        } else {
          // Start lasso if no quantum found at cursor
          isLassoingRef.current = true;
          lassoStartRef.current = {x:wx, y:wy};
          lassoRectRef.current  = {x1:wx,y1:wy,x2:wx,y2:wy};
          // Clear old selection
          if (st) for (const q of st.quanta) q.selected=false;
        }
        break;
      }
      case 'mutate': mutateAtCursor(wx,wy); break;
      case 'erase':  eraseAtCursor(wx,wy);  break;
      // ── Quantum tools ──────────────────────────────────────────────────
      case 'channel':
        isPaintingChanRef.current=true;
        channelPtsRef.current=[];
        lastChanPosRef.current=[wx,wy];
        break;
      case 'rail':
        isDrawingRef.current=true;
        railDrawingRef.current={x1:wx,y1:wy,x2:wx,y2:wy};
        setRailDrawing({x1:wx,y1:wy,x2:wx,y2:wy});
        break;
      // ── Patch 01.1 ────────────────────────────────────────────────────
      case 'cage':
        isCageDrawRef.current=true;
        cageDrawingRef.current={x1:wx,y1:wy,x2:wx,y2:wy};
        break;
      case 'string':
        isStringDrawRef.current=true;
        stringDrawRef.current={x1:wx,y1:wy,x2:wx,y2:wy};
        break;
      case 'zone':
        isPaintZoneRef.current=true;
        zonePointsRef.current=[[wx,wy]];
        setZonePreviewPts([[wx,wy]]);
        break;
      case 'tunnel':
        if (!tunnelFirst) {
          setTunnelFirst({x:wx,y:wy});
        } else {
          if (st) {
            const cols=['#cc66ff','#aa44ee','#ee88ff'];
            st.tunnels.push({
              id:Date.now()%100000,
              ax:tunnelFirst.x,ay:tunnelFirst.y,bx:wx,by:wy,
              radius:0.06,color:cols[st.tunnels.length%cols.length],cd:0,
            });
          }
          setTunnelFirst(null);
          forceRender(n=>n+1);
        }
        break;
    }
    forceRender(n=>n+1);
  }, [activeTool, composeMode, attStrength, metroStrength, applyBrush, spawnQuantum, selectNearest, mutateAtCursor, eraseAtCursor, s2w, tunnelFirst]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (zoomPan.handlePanMove(e)) return;
    const [wx,wy]=s2w(e);
    cursorRef.current={...cursorRef.current,wx,wy};
    // Update compose velocity-drag
    if (composeDragRef.current) composeDragRef.current = { ...composeDragRef.current, x2:wx, y2:wy };
    if ((activeTool==='gate'||activeTool==='mirror'||activeTool==='absorber'||activeTool==='membrane')&&isDrawingRef.current&&drawingRef.current)
      drawingRef.current={...drawingRef.current,x2:wx,y2:wy};
    if ((activeTool==='excite'||activeTool==='freeze')&&isDrawingRef.current)
      applyBrush(wx,wy,activeTool);
    if (activeTool==='select'&&isDraggingRef.current&&stateRef.current) {
      for (const q of stateRef.current.quanta) {
        if (q.selected){q.x=wx;q.y=wy;q.vx=0;q.vy=0;break;}
      }
    }
    // ── Hover highlight: find nearest quantum within 0.08 world units ─────
    if (activeTool==='select'&&stateRef.current&&!isDraggingRef.current) {
      const st=stateRef.current;
      let best=-1,bestD=0.08;
      for (let i=0;i<st.count;i++) {
        const q=st.quanta[i];
        const d=Math.sqrt((q.x-wx)**2+(q.y-wy)**2);
        if (d<bestD){bestD=d;best=i;}
      }
      hoverIdxRef.current=best;
    } else if (activeTool!=='select') {
      hoverIdxRef.current=-1;
    }
    // ── Lasso: update rect ───────────────────────────────────────────────
    if (isLassoingRef.current&&lassoStartRef.current) {
      const s=lassoStartRef.current;
      lassoRectRef.current={
        x1:Math.min(s.x,wx), y1:Math.min(s.y,wy),
        x2:Math.max(s.x,wx), y2:Math.max(s.y,wy),
      };
    }
    // Channel painting: accumulate points with direction
    if (activeTool==='channel'&&isPaintingChanRef.current&&lastChanPosRef.current) {
      const [lx,ly]=lastChanPosRef.current;
      const ddx=wx-lx, ddy=wy-ly;
      const dlen=Math.sqrt(ddx*ddx+ddy*ddy);
      if (dlen>0.008) {
        channelPtsRef.current.push([wx,wy,ddx/dlen,ddy/dlen]);
        lastChanPosRef.current=[wx,wy];
        setChannelPreview([...channelPtsRef.current]);
      }
    }
    // Rail preview
    if (activeTool==='rail'&&isDrawingRef.current&&railDrawingRef.current) {
      const upd={...railDrawingRef.current,x2:wx,y2:wy};
      railDrawingRef.current=upd;
      setRailDrawing(upd);
    }
    // Patch 01.1 previews
    if (activeTool==='cage'&&isCageDrawRef.current&&cageDrawingRef.current) {
      cageDrawingRef.current={...cageDrawingRef.current,x2:wx,y2:wy};
    }
    if (activeTool==='string'&&isStringDrawRef.current&&stringDrawRef.current) {
      stringDrawRef.current={...stringDrawRef.current,x2:wx,y2:wy};
    }
    if (activeTool==='zone'&&isPaintZoneRef.current) {
      const last=zonePointsRef.current[zonePointsRef.current.length-1];
      if (!last||Math.sqrt((wx-last[0])**2+(wy-last[1])**2)>0.018) {
        zonePointsRef.current.push([wx,wy]);
        setZonePreviewPts([...zonePointsRef.current]);
      }
    }
  }, [activeTool, applyBrush, s2w]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    zoomPan.handlePanEnd(e);
    cursorRef.current.active=false;
    isDraggingRef.current=false;
    // Compose-mode velocity drag release → spawn with velocity
    if (composeDragRef.current && activeTool === 'spawn') {
      const d = composeDragRef.current;
      const VEL_SCALE = 0.28;
      const ivx = (d.x2 - d.x1) * VEL_SCALE;
      const ivy = (d.y2 - d.y1) * VEL_SCALE;
      spawnQuantum(d.x1, d.y1, undefined, ivx, ivy);
      composeDragRef.current = null;
      forceRender(n=>n+1);
    }
    if ((activeTool==='gate'||activeTool==='mirror'||activeTool==='absorber'||activeTool==='membrane')
        &&isDrawingRef.current&&drawingRef.current&&stateRef.current) {
      const d=drawingRef.current;
      if ((d.x2-d.x1)**2+(d.y2-d.y1)**2>.004) {
        const p=presetRef.current;
        const colsByType: Record<string,string[]> = {
          gate:     [p.primary,p.secondary,p.accent,'#ffffff'],
          mirror:   ['#c8e8ff','#d8f0ff','#a8d8ef'],
          absorber: ['#dd3333','#cc1111','#ff4444'],
          membrane: ['#dd66ff','#cc44ff','#aa22ee'],
        };
        const cols = colsByType[activeTool] ?? [p.primary];
        stateRef.current.gates.push({
          x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,
          cooldown:0,
          color:cols[stateRef.current.gates.length%cols.length],
          type: activeTool as GateType,
        });
      }
    }
    // Finalize channel
    if (activeTool==='channel'&&isPaintingChanRef.current) {
      isPaintingChanRef.current=false;
      if (channelPtsRef.current.length>3&&stateRef.current) {
        const p=presetRef.current;
        const cols=[p.primary,p.secondary,p.accent,'#c0c8d0','#88ffcc'];
        stateRef.current.channels.push({
          id:Date.now()%100000,pts:[...channelPtsRef.current],
          strength:0.6,radius:0.12,
          color:cols[stateRef.current.channels.length%cols.length],
        });
      }
      channelPtsRef.current=[]; setChannelPreview(null);
    }
    // Finalize rail
    if (activeTool==='rail'&&isDrawingRef.current&&railDrawingRef.current&&stateRef.current) {
      const d=railDrawingRef.current;
      if ((d.x2-d.x1)**2+(d.y2-d.y1)**2>.004) {
        const p=presetRef.current;
        stateRef.current.rails.push({
          x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,strength:0.5,color:p.accent||'#c8960a',
        });
      }
      railDrawingRef.current=null; setRailDrawing(null);
    }
    isDrawingRef.current=false; drawingRef.current=null;
    // ── Finalize lasso selection ───────────────────────────────────────────
    if (isLassoingRef.current && lassoRectRef.current && stateRef.current) {
      const r=lassoRectRef.current;
      for (const q of stateRef.current.quanta) {
        q.selected = (q.x>=r.x1 && q.x<=r.x2 && q.y>=r.y1 && q.y<=r.y2);
      }
    }
    isLassoingRef.current=false;
    lassoStartRef.current=null;
    lassoRectRef.current=null;

    // ── Patch 01.1 finalize ──────────────────────────────────────────────
    if (activeTool==='cage'&&isCageDrawRef.current&&cageDrawingRef.current&&stateRef.current) {
      const d=cageDrawingRef.current;
      const cw=Math.abs(d.x2-d.x1), ch=Math.abs(d.y2-d.y1);
      if (cw>0.04||ch>0.04) {
        const cols=['#00ffcc','#00ccff','#88ffaa','#ffcc44'];
        stateRef.current.cages.push({
          id:Date.now()%100000, shape:'rect',
          x:(d.x1+d.x2)/2, y:(d.y1+d.y2)/2, w:cw, h:ch, r:Math.max(cw,ch)/2,
          elasticity:0.85,
          color:cols[stateRef.current.cages.length%cols.length],
        });
      }
      isCageDrawRef.current=false; cageDrawingRef.current=null;
    }
    if (activeTool==='string'&&isStringDrawRef.current&&stringDrawRef.current&&stateRef.current) {
      const d=stringDrawRef.current;
      if ((d.x2-d.x1)**2+(d.y2-d.y1)**2>0.003) {
        const cols=['#ffd700','#ffaa44','#ffcc88'];
        stateRef.current.strings.push({
          id:Date.now()%100000,
          x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,
          tension:0.5, vibAmp:0, vibPhase:0, decay:0.8,
          color:cols[stateRef.current.strings.length%cols.length], lastHit:0,
        });
      }
      isStringDrawRef.current=false; stringDrawRef.current=null;
    }
    if (activeTool==='zone'&&isPaintZoneRef.current&&stateRef.current) {
      const pts=zonePointsRef.current;
      if (pts.length>=3) {
        const effCols:Record<string,string>={
          slow:'#0066ff',fast:'#ff4400',mute:'#444488',excite_zone:'#ff8800',
          pitch_up:'#00ff88',pitch_down:'#ff0088',reverse:'#ff00ff',freeze_zone:'#88ccff',
          vortex_zone:'#cc44ff',gravity_down:'#ff8844',gravity_up:'#44ccff',
          transpose:'#ffdd00',harmonize_zone:'#88ff44',bounce:'#ff4444',
          compress_zone:'#4488ff',scatter_zone:'#ff88cc',
        };
        stateRef.current.fxZones.push({
          id:Date.now()%100000, pts:[...pts], effect:zoneEffect,
          strength:zoneStrength, param:zoneParam,
          color:effCols[zoneEffect]??'#ffffff',
        });
      }
      isPaintZoneRef.current=false; zonePointsRef.current=[];
      setZonePreviewPts(null);
    }

    forceRender(n=>n+1);
  }, [activeTool, spawnQuantum, composeMode, zoneEffect]);

  const handleMouseLeave = useCallback(()=>{
    cursorRef.current.active=false;
    isDrawingRef.current=false;
    isDraggingRef.current=false;
    isLassoingRef.current=false;
    lassoRectRef.current=null;
    composeDragRef.current=null;
    drawingRef.current=null;
    hoverIdxRef.current=-1;
    isCageDrawRef.current=false; cageDrawingRef.current=null;
    isStringDrawRef.current=false; stringDrawRef.current=null;
    isPaintZoneRef.current=false; zonePointsRef.current=[]; setZonePreviewPts(null);
    zoomPan.handlePanEnd();
  },[zoomPan.handlePanEnd]);

  // ── Right-click context menu ──────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const [wx,wy]=s2w(e);
    const st=stateRef.current; if(!st) return;
    let best=-1,bestD=0.10;
    for (let i=0;i<st.count;i++) {
      const q=st.quanta[i];
      const d=Math.sqrt((q.x-wx)**2+(q.y-wy)**2);
      if (d<bestD){bestD=d;best=i;}
    }
    if (best>=0) {
      for (const q of st.quanta) q.selected=false;
      st.quanta[best].selected=true;
      setContextMenu({sx:e.clientX,sy:e.clientY,qIdx:best});
    } else {
      setContextMenu(null);
    }
    forceRender(n=>n+1);
  }, [s2w]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onKey=(e:KeyboardEvent)=>{
      if (e.target!==document.body&&(e.target as HTMLElement).tagName!=='CANVAS') return;
      const map: Record<string,MusicalTool> = {
        q:'select',w:'spawn',e:'gate',a:'attractor',t:'repulsor',
        y:'vortex',u:'excite',i:'freeze',o:'mutate',p:'erase',
        '1':'channel','2':'rail','3':'tunnel',
        '4':'mirror','5':'absorber','6':'membrane',
        '7':'cage','8':'string','9':'zone','0':'metro',
      };
      // H → toggle full HUD (cinematic)  V → toggle canvas overlays  R → reset/restore composition
      if (e.key==='h'||e.key==='H') {
        e.preventDefault();
        setCinematic(v => {
          // When restoring HUD (cinematic was true → false), also re-open left panel
          if (v) { setLeftOpen(true); }
          return !v;
        });
      }
      if (e.key==='v'||e.key==='V') { e.preventDefault(); setShowOverlays(v=>!v); }
      if (e.key==='r'||e.key==='R') { e.preventDefault(); handleResetRef.current(); }
      const tool=map[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);
      if (e.key===' '){e.preventDefault(); const next=!runningRef.current; runningRef.current=next; setRunning(next); if(!next){audioEngine.cutAll();}else{const p=presetRef.current;audioEngine.restoreGains(p.reverbAmt*fxRef.current,p.delayAmt*fxRef.current,p.delayTime,p.masterGain*masterVolRef.current);}}
      if (e.ctrlKey||e.metaKey) {
        if (e.key==='='||e.key==='+'){e.preventDefault();zoomPan.zoomIn();}
        if (e.key==='-'){e.preventDefault();zoomPan.zoomOut();}
        if (e.key==='0'){e.preventDefault();zoomPan.resetView();}
      }
      if (e.key==='Delete'||e.key==='Backspace') {
        const st=stateRef.current;
        if (st) for (let i=st.quanta.length-1;i>=0;i--) {
          if (st.quanta[i].selected){st.quanta.splice(i,1);st.count--;break;}
        }
        setQuantaCount(st?.count??0);
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, [active]);

  // ── Macro controls ────────────────────────────────────────────────────────
  const macroExciteAll = () => {
    stateRef.current?.quanta.forEach(q=>{q.charge=Math.min(1,q.charge+.3);});
  };
  const macroFreezeAll = () => {
    stateRef.current?.quanta.forEach(q=>{q.vx*=.1;q.vy*=.1;q.charge=Math.max(.05,q.charge-.25);});
  };
  const macroReseed = () => {
    stateRef.current?.quanta.forEach(q=>{
      q.x=(Math.random()-.5)*1.6;q.y=(Math.random()-.5)*1.6;
      q.vx=(Math.random()-.5)*.02;q.vy=(Math.random()-.5)*.02;
      q.phase=Math.random();
    });
  };
  const macroClearAll = () => {
    audioEngine.cutAll();
    // Restore engine gains so newly placed quanta can be heard immediately
    const p = presetRef.current;
    audioEngine.restoreGains(p.reverbAmt * fxRef.current, p.delayAmt * fxRef.current, p.delayTime, p.masterGain * masterVolRef.current);
    if(stateRef.current){stateRef.current.quanta=[];stateRef.current.count=0;}
    setQuantaCount(0);
  };
  const macroAddTen = () => {
    const st=stateRef.current,p=presetRef.current;if(!st)return;
    for(let i=0;i<10;i++) {
      const roles=Object.keys(p.roles) as VoiceRole[];
      const role=roles[i%roles.length];
      const q=makeQuantum(Date.now()%100000+i,p,role);
      st.quanta.push(q);st.count++;
    }
    setQuantaCount(st.count);
  };
  const macroRemoveTen = () => {
    const st=stateRef.current;if(!st)return;
    st.quanta.splice(Math.max(0,st.count-10));
    st.count=st.quanta.length;setQuantaCount(st.count);
  };
  const macroClearGates   =()=>{if(stateRef.current)stateRef.current.gates=[];forceRender(n=>n+1);};
  const macroClearAttr    =()=>{if(stateRef.current)stateRef.current.attractors=[];forceRender(n=>n+1);};
  const macroClearFields  =()=>{
    if(stateRef.current){
      stateRef.current.channels=[];stateRef.current.rails=[];stateRef.current.tunnels=[];
    }
    forceRender(n=>n+1);
  };
  const macroClearNew = ()=>{
    if(stateRef.current){ stateRef.current.cages=[]; stateRef.current.strings=[]; stateRef.current.fxZones=[]; }
    forceRender(n=>n+1);
  };
  // ── Patch 01.1 macro powers ────────────────────────────────────────────────
  const macroScatter    = ()=>{ stateRef.current?.quanta.forEach(q=>{ q.x=(Math.random()-.5)*1.7;q.y=(Math.random()-.5)*1.7;q.vx=(Math.random()-.5)*.04;q.vy=(Math.random()-.5)*.04; }); };
  const macroCompress   = ()=>{ stateRef.current?.quanta.forEach(q=>{ q.vx+=-q.x*.12;q.vy+=-q.y*.12; }); };
  const macroExplode    = ()=>{ stateRef.current?.quanta.forEach(q=>{ const d=Math.sqrt(q.x*q.x+q.y*q.y)+0.01;q.vx+=q.x/d*.25;q.vy+=q.y/d*.25; }); };
  const macroHarmonize  = ()=>{ const st=stateRef.current,p=presetRef.current;if(!st)return;st.quanta.forEach(q=>{q.pitch=quantizeToScale(q.pitch,p.root,p.scale);}); };
  const macroResetMatrix = ()=>{ if(stateRef.current)stateRef.current.userMatrix=defaultUserMatrix();forceRender(n=>n+1); };
  const macroRandomMatrix = ()=>{
    const roles: VoiceRole[]=['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
    const m=defaultUserMatrix();
    for (const a of roles) for (const b of roles) {
      if (Math.random()<0.38) m[a][b]=parseFloat(((Math.random()*2-1)*0.6).toFixed(1));
    }
    if(stateRef.current)stateRef.current.userMatrix=m;
    forceRender(n=>n+1);
  };

  // ── Clear Everything (canvas full reset) ────���─────────────────────────────
  const macroClearCanvas = useCallback(() => {
    audioEngine.cutAll();
    // Restore engine gains so newly placed quanta can be heard immediately
    const p = presetRef.current;
    audioEngine.restoreGains(p.reverbAmt * fxRef.current, p.delayAmt * fxRef.current, p.delayTime, p.masterGain * masterVolRef.current);
    const st = stateRef.current; if (!st) return;
    st.quanta = []; st.count = 0;
    st.gates = []; st.attractors = [];
    st.channels = []; st.rails = []; st.tunnels = [];
    st.cages = []; st.strings = []; st.fxZones = [];
    st.ripples = []; st.emergent = [];
    st.userMatrix = defaultUserMatrix();
    st.sequencer.active = false; setSeqActive(false);
    setQuantaCount(0);
    forceRender(n => n + 1);
  }, []);

  // ── Composition Reset / Restore [R] ─────────────────────────────────────
  const handleResetCompose = useCallback(() => {
    const snap = compositionSnapshotRef.current;
    const st   = stateRef.current;
    if (snap && st) {
      // ── Restore saved composition ──────────────────────────────────────
      audioEngine.cutAll();
      st.quanta     = snap.quanta.map((q: any) => ({ ...q, trailX: [], trailY: [] }));
      st.count      = st.quanta.length;
      st.gates      = snap.gates.map((g: any) => ({ ...g }));
      st.attractors = snap.attractors.map((a: any) => ({ ...a }));
      st.channels   = snap.channels.map((c: any) => ({ ...c, pts: [...c.pts] }));
      st.rails      = snap.rails.map((r: any) => ({ ...r }));
      st.tunnels    = snap.tunnels.map((t: any) => ({ ...t }));
      st.cages      = snap.cages.map((c: any) => ({ ...c }));
      st.strings    = snap.strings.map((s: any) => ({ ...s }));
      st.fxZones    = snap.fxZones.map((f: any) => ({ ...f, pts: [...f.pts] }));
      // Return to compose mode so user can refine and Release again
      runningRef.current = false;
      setRunning(false);
      composeDragRef.current = null;
      setComposeMode(true);
      setActiveTool('spawn');
      setQuantaCount(st.count);
      forceRender(n => n + 1);
    } else {
      // No snapshot → full preset reset (preserves current cinematic/HUD state)
      const p = getPreset(presetId);
      if (p) {
        presetRef.current    = p;
        stateRef.current     = createMusicState(p);
        stateRef.current.bpm = p.bpm;
        roleOverRef.current  = {};
        setBpm(p.bpm); setLens(p.lens); setQuantaCount(p.quantaCount);
        setLiveRoot(p.root); setLiveScale(p.scale);
        setLiveHarmonyMode((p as any).harmonyMode ?? 'any');
        setLiveEventRate((p as any).eventRate ?? 1.0);
        audioEngine.cutAll();
        runningRef.current = false; setRunning(false);
        setComposeMode(false);
        setHasSnapshot(false);
        forceRender(n => n + 1);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);
  const handleResetRef = useRef<() => void>(() => {});
  useEffect(() => { handleResetRef.current = handleResetCompose; }, [handleResetCompose]);

  // ── Physics Sandbox toggle ────────────────────────────────────────────────
  const togglePhysicsMode = useCallback(() => {
    setPhysicsMode(prev => {
      const next = !prev;
      if (next) {
        // Open right panel on Physics tab for immediate parameter access
        setRightOpen(true);
        setRightTab('physics');
        // Ballistic: ONLY gravity. No life, no flocking. Bounce parametrizable.
        const ballistic: PhysicsParams = {
          ...DEFAULT_PHYSICS,
          motionStyle:    'ballistic',
          bounceWalls:    true,
          physicsOnly:    true,
          gravityX:       0,
          gravityY:       0.327,  // 🌍 Earth gravity (a = 0.327×30 = 9.81 wu/s² ≈ real Earth)
          damping:        0.9992, // nearly zero air resistance
          turbulence:     0,
          cohesion:       0,
          separation:     0,
          alignment:      0,
          predatorPrey:   false,
          mutationRate:   0,
          energyTransfer: 0,
          entainment:     0,
          maxSpeed:       2.50,   // allow realistic terminal velocity (vy≈0.327×∞×dt with damping)
          restitution:    0.72,   // bouncy but not perfect
        };
        physRef.current = ballistic;
        setPhys({ ...ballistic });
        // Zero out swarm velocities so balls start from rest under gravity
        if (stateRef.current) {
          for (const q of stateRef.current.quanta) {
            q.vx = 0; q.vy = 0;
            q.charge = 0.5;
          }
        }
      } else {
        // Restore preset physics
        const p = presetRef.current;
        const restored: PhysicsParams = {
          ...DEFAULT_PHYSICS,
          motionStyle:    p.motionStyle ?? 'swarm',
          bounceWalls:    false,
          physicsOnly:    false,
        };
        physRef.current = restored;
        setPhys({ ...restored });
      }
      return next;
    });
  }, []);

  // ── Compose Mode toggle ───────────────────────────────────────────────────
  const toggleComposeMode = useCallback(() => {
    setComposeMode(prev => {
      const next = !prev;
      if (next) {
        // ── Save "pre-compose" snapshot the moment user enters compose mode ──
        // This ensures Reset always has a valid restore point, even if Release
        // is never pressed. Release will overwrite with the final drawn state.
        const st = stateRef.current;
        if (st) {
          compositionSnapshotRef.current = {
            quanta:     st.quanta.map(q => ({ ...q, trailX: [], trailY: [] })),
            gates:      st.gates.map(g => ({ ...g })),
            attractors: st.attractors.map(a => ({ ...a })),
            channels:   st.channels.map(c => ({ ...c, pts: [...c.pts] })),
            rails:      st.rails.map(r => ({ ...r })),
            tunnels:    st.tunnels.map(t => ({ ...t })),
            cages:      st.cages.map(c => ({ ...c })),
            strings:    st.strings.map(s => ({ ...s })),
            fxZones:    st.fxZones.map(f => ({ ...f, pts: [...f.pts] })),
          };
          setHasSnapshot(true);
        }
        // Pause simulation and switch to spawn tool
        runningRef.current = false;
        setRunning(false);
        audioEngine.cutAll();
        setActiveTool('spawn');
      }
      composeDragRef.current = null;
      return next;
    });
  }, []);

  // ── FULL GENERATIVE RANDOMIZE — 100% algorithmic, zero preset dependency ──
  const macroRandom = useCallback(() => {
    audioEngine.cutAll(); // kill previous composition immediately
    const r = Math.random;

    // A. Color palette — single random hue → triadic
    const hslHex = (h:number,s:number,l:number)=>{
      h=((h%360)+360)%360;s/=100;l/=100;
      const a=s*Math.min(l,1-l);
      const f=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1))).toString(16).padStart(2,'0');};
      return '#'+f(0)+f(8)+f(4);
    };
    const hue=Math.floor(r()*360), sat=50+r()*32;
    const primary   = hslHex(hue,            sat,    62);
    const secondary = hslHex((hue+125)%360,  sat*.9, 55);
    const accent    = hslHex((hue+245)%360,  sat*1.1,68);

    // B. BPM — musical tempos only
    const BPM_POOL=[60,70,72,75,80,84,85,88,90,95,100,104,108,110,114,120,124,128,130,135,140,144,150,160,170];
    const bpm=BPM_POOL[Math.floor(r()*BPM_POOL.length)];

    // C. Harmonic field
    const ALL_SCALES:Scale[]=['major','minor','pentatonic','blues','dorian','phrygian','lydian','mixolydian','whole_tone','harmonic_minor'];
    const root=Math.floor(r()*12);
    const scale=ALL_SCALES[Math.floor(r()*ALL_SCALES.length)];
    const HMODES:Array<MusicPreset['harmonyMode']>=['free','free','free','consonant','dissonant'];
    const harmonyMode=HMODES[Math.floor(r()*HMODES.length)];
    const liveHM:'consonant'|'any'|'dissonant'=harmonyMode==='consonant'?'consonant':harmonyMode==='dissonant'?'dissonant':'any';
    const eventRate=0.30+r()*2.8;

    // D. FX — reverb always > 0
    const reverbAmt=0.10+r()*0.72;
    const DELAY_TIMES=[0.125,0.250,0.333,0.375,0.500,0.666,0.750];
    const delayTime=DELAY_TIMES[Math.floor(r()*DELAY_TIMES.length)];
    const delayAmt=r()*0.55;
    const masterGain=0.70+r()*0.25;

    // E. Visual
    const quantaCount=15+Math.floor(r()*58);
    const trailLen=Math.floor(r()*14);
    const particleGlow=1.0+r()*2.0;

    // F. Physics
    const rndBehavior=BEHAVIOR_PRESETS[Math.floor(r()*BEHAVIOR_PRESETS.length)];
    const newPhys:PhysicsParams={
      ...DEFAULT_PHYSICS,
      damping:       0.918+r()*0.068, cohesion:      0.15+r()*2.50,
      separation:    0.25+r()*2.00,  maxSpeed:      0.05+r()*0.50,
      gravityX:      (r()-.5)*.34,   gravityY:      (r()-.5)*.34,
      turbulence:    r()*.92,        mutationRate:  r()*.45,
      energyTransfer:0.08+r()*.74,   entainment:    0.06+r()*.84,
      predatorPrey:  r()<.22,        motionStyle:   rndBehavior.motionStyle,
      alignment:     r()*2.4,        zoneRadius:    0.04+r()*.50,
      vortexForce:   r()*.44,        burstRate:     r()*.94,
      migrationX:    (r()-.5)*2,     migrationY:    (r()-.5)*2,
      clusterTarget: 2+Math.floor(r()*22), polarize: r(),
    };

    // G. Role configs — curated template pools per role + ADSR variation
    // idx: 0=SubBass 1=Acid303 2=HardKick 3=FMBell 4=SawLead
    //      5=Square  6=WarmPad 7=Choir    8=Shimmer 9=Snare 10=HiHat 11=Glitch
    const rolePools:Record<VoiceRole,number[]>={
      KICK:[2,2,2], BASS:[0,0,1,0], PERC:[9,10,11,9,10],
      PAD:[6,6,7,8,6], LEAD:[4,4,5,3,4], ARP:[3,8,5,3,3],
      STRINGS:[6,6,7,0], CHOIR:[7,7,6,7],
    };
    type ARng=[number,number];
    type ARL={A:ARng;D:ARng;S:ARng;R:ARng};
    const adsrR:Record<VoiceRole,ARL>={
      KICK:   {A:[.001,.003],D:[.055,.120],S:[.00,.02],R:[.04,.10]},
      BASS:   {A:[.005,.085],D:[.08, .35 ],S:[.55,.90],R:[.15,.70]},
      PERC:   {A:[.001,.006],D:[.04, .14 ],S:[.00,.18],R:[.03,.12]},
      PAD:    {A:[.30,1.70 ],D:[.18, .62 ],S:[.62,.94],R:[.80,3.20]},
      LEAD:   {A:[.004,.028],D:[.07, .24 ],S:[.32,.72],R:[.10,.45]},
      ARP:    {A:[.001,.010],D:[.07, .30 ],S:[.04,.32],R:[.12,.75]},
      STRINGS:{A:[.22,1.30 ],D:[.14, .48 ],S:[.58,.92],R:[.48,2.20]},
      CHOIR:  {A:[.75,2.40 ],D:[.22, .75 ],S:[.68,.96],R:[1.00,3.80]},
    };
    const pitchR:Record<VoiceRole,[number,number]>={
      KICK:[33,48],BASS:[28,52],PERC:[42,82],PAD:[48,84],
      LEAD:[52,88],ARP:[60,96],STRINGS:[45,76],CHOIR:[48,80],
    };
    const lp=(a:number,b:number,t:number)=>a+(b-a)*t;
    const roles:Partial<Record<VoiceRole,RoleConfig>>={};
    for (const role of ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'] as VoiceRole[]) {
      const pool=rolePools[role];
      const t=TIMBRE_TEMPLATES[pool[Math.floor(r()*pool.length)]];
      const ar=adsrR[role];
      roles[role]={
        proportion:role==='KICK'?(r()<.45?1:2):1+Math.floor(r()*3),
        pitchRange:pitchR[role],
        waveform:t.wave, filterType:t.fType,
        filterFreq:Math.max(40,t.fFreq*lp(.60,1.55,r())),
        filterQ:Math.max(.3,t.fQ*lp(.50,1.90,r())),
        envelope:{attack:lp(ar.A[0],ar.A[1],r()),decay:lp(ar.D[0],ar.D[1],r()),sustain:lp(ar.S[0],ar.S[1],r()),release:lp(ar.R[0],ar.R[1],r())},
        gainScale:Math.max(.1,t.gain*lp(.60,1.40,r())),
        detune:t.det+(r()-.5)*26,
        panSpread:.28+r()*.72, maxVoices:2+Math.floor(r()*5),
        cooldownMin:Math.max(.05,t.cd*lp(.45,1.65,r())),
      };
    }

    // H. Pseudo-preset → apply to refs
    const rndPreset:MusicPreset={
      id:`rnd_${Date.now()}`,name:'Random',description:'Generative',vibe:'∞',
      tags:['random'],intensity:r(),
      bpm,root,scale,harmonyMode,eventRate,
      quantaCount,trailLen,particleGlow,roles,
      syncThreshold:.24+r()*.58, encounterR:.05+r()*.15,
      entainment:newPhys.entainment,
      reverbAmt,delayAmt,delayTime,masterGain,
      lens:'Off',bgPulse:false,cinematic:false,
      primary,secondary,accent,gateCount:0,attractorCount:0,
      motionStyle:rndBehavior.motionStyle,
    };
    presetRef.current=rndPreset;
    stateRef.current=createMusicState(rndPreset);
    stateRef.current.bpm=bpm;
    roleOverRef.current={};
    setBpm(bpm); setQuantaCount(quantaCount);
    setLiveRoot(root); setLiveScale(scale);
    setLiveHarmonyMode(liveHM); setLiveEventRate(eventRate);
    setPhys(newPhys); physRef.current=newPhys;
    setBehaviorId(rndBehavior.id);
    if (audioEngine.ready) {
      audioEngine.restoreGains(reverbAmt * fxAmount, delayAmt * fxAmount, delayTime, masterGain * masterVol);
    }
    const st=stateRef.current;

    // I. Scatter quanta + per-particle timbre (from curated pool for coherence)
    for (const q of st.quanta) {
      q.x=(r()-.5)*1.55; q.y=(r()-.5)*1.55;
      q.vx=(r()-.5)*.06; q.vy=(r()-.5)*.06;
      q.phase=r(); q.charge=.12+r()*.60;
      q.cooldown=r()*.5; q.trailX=[]; q.trailY=[];
      q.timbreIdx=r()<.38?-1:rolePools[q.role][Math.floor(r()*rolePools[q.role].length)];
      q.pitch=quantizeToScale(q.pitch,root,scale);
    }

    // J. Sequencer
    const stepCount=[8,12,16][Math.floor(r()*3)];
    const tempoMult=[.5,1,2,4][Math.floor(r()*4)];
    const density=.22+r()*.55;
    const ROLES_LIST:VoiceRole[]=['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
    st.sequencer={...st.sequencer,
      steps:Array.from({length:stepCount},()=>({armed:r()<density,pitchOff:Math.floor((r()-.5)*14),vel:.35+r()*.65,role:r()<.55?null:ROLES_LIST[Math.floor(r()*8)]})),
      stepCd:new Array(stepCount).fill(0),tempoMult,
      x:(r()-.5)*.8,y:(r()-.5)*.8,ringR:.18+r()*.34,active:r()<.60,
    };
    setSeqSteps(stepCount); setSeqTempoMult(tempoMult); setSeqActive(st.sequencer.active);

    // K. Attractors
    st.attractors=[];
    for (let i=0,nAtt=Math.floor(r()*5);i<nAtt;i++){
      const type=['attractor','repulsor','vortex'][Math.floor(r()*3)] as 'attractor'|'repulsor'|'vortex';
      const str=.04+r()*.20;
      st.attractors.push({x:(r()-.5)*1.3,y:(r()-.5)*1.3,
        strength:type==='repulsor'?-str:type==='vortex'?0:str,
        vortexStr:type==='vortex'?str*.8:0,radius:.22+r()*.52,type});
    }

    // L. Gates/barriers
    st.gates=[];
    const gatePool:GateType[]=['gate','gate','mirror','mirror','absorber','membrane','membrane'];
    const colsMap:Record<GateType,string[]>={
      gate:[primary,secondary,accent,'#fff'],mirror:['#c8e8ff','#a8d8ef','#d8f0ff'],
      absorber:['#dd3333','#cc1111','#ff4444'],membrane:['#dd66ff','#cc44ff','#aa22ee'],
    };
    for (let i=0,n=1+Math.floor(r()*7);i<n;i++){
      const gt=gatePool[Math.floor(r()*gatePool.length)];
      const cx=(r()-.5)*1.3,cy=(r()-.5)*1.3,ang=r()*Math.PI,len=.10+r()*.52;
      st.gates.push({x1:cx-Math.cos(ang)*len,y1:cy-Math.sin(ang)*len,
        x2:cx+Math.cos(ang)*len,y2:cy+Math.sin(ang)*len,
        cooldown:0,color:colsMap[gt][i%colsMap[gt].length],type:gt});
    }

    setQuantaCount(st.count);
    forceRender(n=>n+1);
  }, [fxAmount, masterVol]);

  // ── Studio Sequencer handlers ─────────────────────────────────────────────
  const toggleStudio = useCallback(() => {
    const next = !studioActiveRef.current;
    studioActiveRef.current = next;
    if (!next) { studioTimerRef.current = 0; studioCursorRef.current = -1; setStudioCursorUI(-1); }
    setStudioActive(next);
  }, []);

  const toggleStudioStep = useCallback((ri: number, si: number) => {
    setStudioRows(prev => prev.map((row, r) =>
      r !== ri ? row : {
        ...row,
        steps: row.steps.map((s, i) => i !== si ? s : { ...s, on: !s.on }),
      }
    ));
  }, []);

  const setStudioStepCountFn = useCallback((n: 8 | 16) => {
    setStudioRows(prev => prev.map(row => {
      const steps = [...row.steps];
      while (steps.length < n) steps.push({ on: false, vel: 0.8 });
      while (steps.length > n) steps.pop();
      return { ...row, steps };
    }));
    setStudioStepCount(n);
    studioCursorRef.current = -1;
    studioTimerRef.current  = 0;
  }, []);

  const toggleStudioMute = useCallback((ri: number) => {
    setStudioRows(prev => prev.map((row, r) => r !== ri ? row : { ...row, muted: !row.muted }));
  }, []);

  const toggleStudioSolo = useCallback((ri: number) => {
    setStudioRows(prev => prev.map((row, r) => r !== ri ? row : { ...row, solo: !row.solo }));
  }, []);

  const setStudioVel = useCallback((ri: number, vel: number) => {
    setStudioRows(prev => prev.map((row, r) =>
      r !== ri ? row : { ...row, steps: row.steps.map(s => ({ ...s, vel })) }
    ));
  }, []);

  const clearStudioRow = useCallback((ri: number) => {
    setStudioRows(prev => prev.map((row, r) =>
      r !== ri ? row : { ...row, steps: row.steps.map(s => ({ ...s, on: false })) }
    ));
  }, []);

  const loadStudioPattern = useCallback((pat: PatternDef) => {
    setStudioRows(prev => prev.map(row => {
      const beats = pat.steps[row.role];
      const steps = row.steps.map((s, i) => ({ ...s, on: beats ? beats.includes(i) : false }));
      return { ...row, steps };
    }));
  }, []);

  const clearStudioAll = useCallback(() => {
    setStudioRows(prev => prev.map(row => ({
      ...row, steps: row.steps.map(s => ({ ...s, on: false })),
    })));
  }, []);

  // ── Recording handlers ────────────────────────────────────────────────────
  const handleRecStart = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    // Get audio stream — requires audio to be on; falls back to video-only
    let audioStream: MediaStream | undefined;
    try {
      if (audioEngine.ready) audioStream = audioEngine.createAudioStream();
    } catch { /* audio not ready, record video only */ }

    rec.start(
      () => [canvasRef.current],
      () => {
        const p = presetRef.current;
        return {
          labName: `Music Lab — ${p.name}`,
          lines: [
            `Preset: ${p.name}  ·  ${p.bpm} BPM`,
            `Scale: ${p.root} ${p.scale}  ·  ${p.motionStyle}`,
            audioStream ? '♪ áudio + vídeo' : '▶ apenas vídeo',
          ],
        };
      },
      30,
      audioStream,
    );
  }, []);

  const handleRecStop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // ── Sequencer helpers ──────────────────────────────────────────────────────
  const toggleSeq=useCallback(()=>{
    const st=stateRef.current; if(!st) return;
    const active=!st.sequencer.active;
    st.sequencer.active=active; setSeqActive(active);
  },[]);
  const toggleSeqStep=useCallback((idx:number)=>{
    const st=stateRef.current; if(!st||!st.sequencer.steps[idx]) return;
    st.sequencer.steps[idx].armed=!st.sequencer.steps[idx].armed;
    forceRender(n=>n+1);
  },[]);
  const setSeqTempoMultFn=useCallback((m:number)=>{
    const st=stateRef.current; if(!st) return;
    st.sequencer.tempoMult=m; setSeqTempoMult(m);
  },[]);
  const setSeqStepsFn=useCallback((n:number)=>{
    const st=stateRef.current; if(!st) return;
    while(st.sequencer.steps.length<n)
      st.sequencer.steps.push({armed:false,pitchOff:0,vel:0.65,role:null});
    while(st.sequencer.steps.length>n) st.sequencer.steps.pop();
    st.sequencer.stepCd=new Array(n).fill(0);
    setSeqSteps(n); forceRender(n2=>n2+1);
  },[]);

  // ── Role override helpers ─────────────────────────────────────────────────
  const setRoleParam = (role:VoiceRole, key:keyof RoleConfig, val:unknown) => {
    roleOverRef.current = {
      ...roleOverRef.current,
      [role]: { ...(roleOverRef.current[role]??{}), [key]: val },
    };
    forceRender(n=>n+1);
  };
  // Apply multiple role params at once (for timbre templates)
  const setRoleParams = (role:VoiceRole, vals:Partial<RoleConfig>) => {
    roleOverRef.current = {
      ...roleOverRef.current,
      [role]: { ...(roleOverRef.current[role]??{}), ...vals },
    };
    forceRender(n=>n+1);
  };
  const getRoleVal = (role:VoiceRole, key:keyof RoleConfig): any => {
    const over=(roleOverRef.current[role] as any)?.[key];
    if (over!==undefined) return over;
    return (presetRef.current.roles[role] as any)?.[key];
  };

  // ── Get selected quantum info ─────────────────────────────────────────────
  const selectedQ = stateRef.current?.quanta.find(q=>q.selected);

  const currentPreset = presetRef.current;
  const cursorStyle = ['excite','freeze','spawn','attractor','repulsor','vortex','mutate','erase','channel'].includes(activeTool)
    ? 'none'
    : activeTool==='gate'||activeTool==='rail' ? 'crosshair'
    : activeTool==='tunnel' ? 'cell'
    : 'default';

  // ── Waveform options ──────────────────────────────────────────────────────
  const WAVES: {id:RoleConfig['waveform'];label:string}[] = [
    {id:'sine',label:'∿'},
    {id:'triangle',label:'△'},
    {id:'sawtooth',label:'⊿'},
    {id:'square',label:'□'},
    {id:'noise',label:'⌇'},
    {id:'kick',label:'K'},
    {id:'snare',label:'S'},
    {id:'hihat',label:'H'},
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{display:active?'block':'none'}} className="fixed inset-0 z-0">
      {/* ── CANVAS (2D) ───────────────────────────────────────────────────── */}
      <canvas ref={canvasRef}
        className="w-full h-full block"
        style={{background:'#000',cursor:cursorStyle,display:view3D?'none':'block'}}
        onMouseDown={(e) => { if(contextMenu) setContextMenu(null); handleMouseDown(e); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />

      {/* ── 3D RENDERER (Patch 01.3) ──────────────────────────────────────── */}
      {view3D && stateRef.current && (
        <>
          <div className="w-full h-full absolute top-0 left-0">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-[#37b2da] text-[9px] uppercase tracking-[0.2em] animate-pulse" style={{fontFamily:MONO}}>LOADING 3D ENGINE...</div>
              </div>
            }>
              <Music3DRenderer
                state={stateRef.current}
                width={window.innerWidth}
                height={window.innerHeight}
                cameraMode={camera3D}
                paused={!running}
                showGrid={show3DGrid}
                showAxes={show3DAxes}
                showTrails={show3DTrails}
                colorMode={color3DMode}
              />
            </Suspense>
          </div>
          {/* 3D Controls Overlay */}
          <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-1.5 pointer-events-auto" style={{fontFamily:MONO}}>
            {/* Color mode */}
            <div className="px-2.5 py-1.5" style={{background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:6,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(55,178,218,0.40)',marginBottom:3}}>COLOR</div>
              <div className="flex gap-1">
                {(['role','charge','velocity'] as const).map(m=>(
                  <button key={m} onClick={()=>setColor3DMode(m)}
                    className="transition-all"
                    style={{
                      fontSize:6,letterSpacing:'0.08em',textTransform:'uppercase',padding:'2px 6px',
                      color:color3DMode===m?ACCENT:'rgba(255,255,255,0.22)',
                      background:color3DMode===m?'rgba(55,178,218,0.06)':'transparent',
                      border:color3DMode===m?`1px dashed ${ACCENT}30`:'1px dashed rgba(255,255,255,0.05)',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {/* Overlays */}
            <div className="px-2.5 py-1.5" style={{background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:6,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(55,178,218,0.40)',marginBottom:3}}>OVERLAYS</div>
              <div className="flex gap-1 flex-wrap">
                {[
                  {label:'Grid',   v:show3DGrid,   fn:()=>setShow3DGrid(x=>!x)},
                  {label:'Axes',   v:show3DAxes,   fn:()=>setShow3DAxes(x=>!x)},
                  {label:'Trails', v:show3DTrails, fn:()=>setShow3DTrails(x=>!x)},
                ].map(({label,v,fn})=>(
                  <button key={label} onClick={fn}
                    className="transition-all"
                    style={{
                      fontSize:6,letterSpacing:'0.08em',textTransform:'uppercase',padding:'2px 6px',
                      color:v?ACCENT:'rgba(255,255,255,0.22)',
                      background:v?'rgba(55,178,218,0.06)':'transparent',
                      border:v?`1px dashed ${ACCENT}30`:'1px dashed rgba(255,255,255,0.05)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Status */}
            <div className="px-2.5 py-1.5" style={{background:'rgba(0,0,0,0.94)',border:`1px dashed ${ACCENT}18`}}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 animate-pulse" style={{background:ACCENT}}/>
                <span style={{fontSize:7,letterSpacing:'0.12em',textTransform:'uppercase',color:ACCENT}}>3D ACTIVE</span>
              </div>
              <div style={{fontSize:6,color:'rgba(255,255,255,0.25)'}}>
                <div>{stateRef.current.count} parts · {camera3D.replace('3d-','').toUpperCase()}</div>
                <div style={{fontSize:5,color:'rgba(255,255,255,0.15)',marginTop:2}}>Drag orbit · Scroll zoom</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Controller overlays (fixed, positioned over canvas) ── */}
      {ctrlFrame.connected && (
        <>
          {/* Crosshair cursor: position updated directly in RAF via ref */}
          <div ref={ctrlCursorElRef} style={{
            position:'fixed', pointerEvents:'none', display:'none',
            transform:'translate(-50%,-50%)', zIndex:50,
          }}>
            <div style={{ position:'absolute', width:28, height:28, left:-14, top:-14,
              borderRadius:'50%', border:'1px solid rgba(0,200,255,0.7)', opacity:0.6 }} />
            <div style={{ position:'absolute', left:-10, top:-0.5, width:20, height:1, background:'rgba(0,200,255,0.85)' }} />
            <div style={{ position:'absolute', top:-10, left:-0.5, height:20, width:1, background:'rgba(0,200,255,0.85)' }} />
            <div style={{ position:'absolute', width:4, height:4, left:-2, top:-2, borderRadius:'50%', background:'rgba(0,200,255,0.9)' }} />
          </div>
          <ControllerHUD
            ctrl={ctrlFrame}
            toolName={spawnRole}
            presetName={presetId}
            radius={brushRadius}
            intensity={ctrlFrame.triggers.rt}
            showHUD={ctrlHUDVis && ctrlFrame.connected} />
          <div style={{ position:'fixed', top:50, left:8, pointerEvents:'none',
            display:'flex', alignItems:'center', gap:4, zIndex:30 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(0,200,255,0.7)' }} />
            <span style={{ fontSize:7, color:'rgba(0,200,255,0.5)', letterSpacing:'0.08em' }}>CTRL</span>
          </div>
        </>
      )}

      {/* Controller Quick Menu — full-screen overlay, navigable with D-pad */}
      <QuickMenu<MusicPreset, string>
        open={musicQuickMenuOpen}
        onClose={() => setMusicQuickMenuOpen(false)}
        ctrl={ctrlFrame}
        presetsSection={{
          label: 'Presets',
          items: MUSIC_PRESETS,
          getLabel: (p) => p.name,
          onSelect: (p) => applyPreset(p.id),
        }}
        toolsSection={{
          label: 'Spawn Role',
          items: ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'],
          getLabel: (r) => r,
          onSelect: (r) => setSpawnRole(r as VoiceRole),
        }}
      />

      {/* ── TOP HUD ─────────────────────────────────────────────────────────── */}
      {!cinematic && (
        <div className="fixed top-9 left-0 right-0 z-20 pointer-events-none"
          style={{fontFamily:MONO}}>
          <div className="flex items-center gap-0 pointer-events-auto"
            style={{background:'rgba(0,0,0,0.94)',borderBottom:'1px dashed rgba(255,255,255,0.06)'}}>

            {/* Audio — primary action */}
            <button onClick={handleAudioToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={{
                color:audioOn&&running?'#37b2da':'rgba(55,178,218,0.55)',
                background:audioOn&&running?'rgba(55,178,218,0.06)':'transparent',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
                fontSize:8,letterSpacing:'0.12em',textTransform:'uppercase',
              }}>
              {audioOn&&running?<><Pause size={9}/> Pause</>:<><Volume2 size={9}/>{audioOn?' Resume':' Start Audio'}</>}
            </button>

            {/* Divider */}
            <div style={{width:1,height:16,borderLeft:'1px dashed rgba(255,255,255,0.06)'}}/>

            {/* Preset */}
            <button onClick={()=>setShowGrid(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={{fontSize:8,borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <Music size={9} style={{color:currentPreset.primary+'88'}}/>
              <span style={{color:currentPreset.primary+'bb',letterSpacing:'0.06em'}}>{currentPreset.name}</span>
            </button>

            {/* BPM */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <span style={{fontSize:7,color:'rgba(255,255,255,0.22)',letterSpacing:'0.1em',textTransform:'uppercase'}}>BPM</span>
              <input type="range" min={30} max={180} step={1} value={bpm}
                onChange={e=>setBpm(parseInt(e.target.value))}
                className="w-14 h-px appearance-none cursor-pointer" style={{background:'rgba(255,255,255,.08)',accentColor:'#37b2da'}}/>
              <span style={{fontSize:8,color:'rgba(255,255,255,0.35)',width:22,textAlign:'right'}}>{bpm}</span>
            </div>

            {/* FX */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <span style={{fontSize:7,color:'rgba(255,255,255,0.22)',letterSpacing:'0.1em',textTransform:'uppercase'}}>FX</span>
              <input type="range" min={0} max={1} step={0.01} value={fxAmount}
                onChange={e=>setFxAmount(parseFloat(e.target.value))}
                className="w-12 h-px appearance-none cursor-pointer" style={{background:'rgba(255,255,255,.08)',accentColor:'#37b2da'}}/>
              <span style={{fontSize:7,color:'rgba(255,255,255,0.25)'}}>{Math.round(fxAmount*100)}%</span>
            </div>

            {/* Lens */}
            <div className="flex items-center gap-0" style={{borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              {(['Off','Notes','Harmony','Rhythm','Tension','Events'] as MusicLens[]).map(l=>(
                <button key={l} onClick={()=>setLens(l)}
                  className="px-2 py-1.5 transition-all"
                  style={{
                    fontSize:7,letterSpacing:'0.08em',textTransform:'uppercase',
                    color:lens===l?'#37b2da':'rgba(255,255,255,0.20)',
                    background:lens===l?'rgba(55,178,218,0.05)':'transparent',
                    borderBottom:lens===l?'1px solid #37b2da':'1px solid transparent',
                  }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Vol */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <Volume2 size={9} style={{color:'rgba(255,255,255,0.20)'}}/>
              <input type="range" min={0} max={1} step={0.01} value={masterVol}
                onChange={e=>setMasterVol(parseFloat(e.target.value))}
                className="w-10 h-px appearance-none cursor-pointer" style={{background:'rgba(255,255,255,.08)',accentColor:'#37b2da'}}/>
            </div>

            {/* View toggles */}
            <button onClick={()=>setCinematic(v=>!v)}
              className="p-1.5 transition-all"
              style={{color:cinematic?'#37b2da':'rgba(255,255,255,0.20)',background:cinematic?'rgba(55,178,218,0.05)':'transparent',borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <Film size={10}/>
            </button>
            <button onClick={()=>setView3D(v=>!v)} title="3D Visualization Mode"
              className="flex items-center gap-1 px-2.5 py-1.5 transition-all"
              style={{
                fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',
                color:view3D?'#37b2da':'rgba(255,255,255,0.22)',
                background:view3D?'rgba(55,178,218,0.05)':'transparent',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
              }}>
              <span style={{fontSize:10}}>◎</span> 3D
            </button>
            {view3D && (
              <div className="flex items-center gap-0" style={{borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
                {(['3d-orbital','3d-top','3d-side','3d-fpp'] as const).map((cam) => (
                  <button key={cam} onClick={() => setCamera3D(cam)}
                    className="px-2 py-1.5 transition-all"
                    style={{
                      fontSize:7,letterSpacing:'0.08em',textTransform:'uppercase',
                      color:camera3D===cam?'#37b2da':'rgba(255,255,255,0.20)',
                      background:camera3D===cam?'rgba(55,178,218,0.05)':'transparent',
                      borderBottom:camera3D===cam?'1px solid #37b2da':'1px solid transparent',
                    }}>
                    {cam === '3d-orbital' ? 'ORB' : cam === '3d-top' ? 'TOP' : cam === '3d-side' ? 'SIDE' : 'FPP'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={()=>setShowVel(v=>!v)}
              className="p-1.5 transition-all"
              style={{fontSize:7,color:showVel?'#37b2da':'rgba(255,255,255,0.20)',background:showVel?'rgba(55,178,218,0.05)':'transparent'}}>
              V
            </button>

            {/* Divider */}
            <div style={{width:1,height:16,borderLeft:'1px dashed rgba(255,255,255,0.06)'}}/>

            {/* Physics */}
            <button onClick={togglePhysicsMode} title="Physics Sandbox"
              className="flex items-center gap-1 px-2.5 py-1.5 transition-all"
              style={{
                fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',
                color:physicsMode?'#ff9944':'rgba(255,255,255,0.22)',
                background:physicsMode?'rgba(255,153,68,0.06)':'transparent',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
              }}>
              ⚛ {physicsMode ? 'Ballistic' : 'Physics'}
            </button>

            {/* Compose */}
            <button onClick={toggleComposeMode} title="Compose Mode"
              className="flex items-center gap-1 px-2.5 py-1.5 transition-all"
              style={{
                fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',
                color:composeMode?'#fbbf24':'rgba(255,255,255,0.22)',
                background:composeMode?'rgba(251,191,36,0.06)':'transparent',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
              }}>
              {composeMode
                ? <><span className="w-1.5 h-1.5 inline-block animate-pulse" style={{background:'#fbbf24'}}/><span>Composing</span></>
                : <><span>✏</span><span>Compose</span></>
              }
            </button>
            {composeMode && !running && (
              <button
                onClick={() => {
                  const st = stateRef.current;
                  if (st) {
                    compositionSnapshotRef.current = {
                      quanta:     st.quanta.map(q => ({ ...q, trailX: [], trailY: [] })),
                      gates:      st.gates.map(g => ({ ...g })),
                      attractors: st.attractors.map(a => ({ ...a })),
                      channels:   st.channels.map(c => ({ ...c, pts: [...c.pts] })),
                      rails:      st.rails.map(r => ({ ...r })),
                      tunnels:    st.tunnels.map(t => ({ ...t })),
                      cages:      st.cages.map(c => ({ ...c })),
                      strings:    st.strings.map(s => ({ ...s })),
                      fxZones:    st.fxZones.map(f => ({ ...f, pts: [...f.pts] })),
                    };
                    setHasSnapshot(true);
                  }
                  setComposeMode(false);
                  composeDragRef.current = null;
                  runningRef.current = true;
                  setRunning(true);
                  const p = presetRef.current;
                  if (audioEngine.ready)
                    audioEngine.restoreGains(p.reverbAmt * fxRef.current, p.delayAmt * fxRef.current, p.delayTime, p.masterGain * masterVolRef.current);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 animate-pulse transition-all"
                style={{fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',color:'#4ade80',background:'rgba(74,222,128,0.06)',borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
                ▶ Release
              </button>
            )}

            {/* Reset */}
            <button onClick={handleResetCompose} title={hasSnapshot ? 'Restore [R]' : 'Reset [R]'}
              className="flex items-center gap-1 px-2 py-1.5 transition-all"
              style={{
                fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',
                color:hasSnapshot?'rgba(251,191,36,0.65)':'rgba(255,255,255,0.22)',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
              }}>
              <RotateCcw size={9}/><span>{hasSnapshot ? 'Restore' : 'Reset'}</span>
            </button>

            {/* Random */}
            <button onClick={macroRandom} title="Preset aleatório"
              className="flex items-center gap-1 px-2 py-1.5 transition-all"
              style={{fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.22)',borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <Dice5 size={9}/>
            </button>

            {/* Export cover to Meta-Gen-Art */}
            <button onClick={() => { exportSnapshotToMetaArt(); }} title="Exportar capa → Meta-Gen-Art"
              className="flex items-center gap-1 px-2 py-1.5 transition-all"
              style={{
                fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',
                color: lastCoverExport > 0 && Date.now() - lastCoverExport < 3000 ? '#4ade80' : 'rgba(255,255,255,0.22)',
                borderRight:'1px dashed rgba(255,255,255,0.06)',
              }}>
              <Image size={9}/>
              <span>{lastCoverExport > 0 && Date.now() - lastCoverExport < 3000 ? '✓' : 'Capa'}</span>
            </button>

            {/* Guia */}
            <button onClick={() => setShowGuide(true)} title="Guia"
              className="flex items-center gap-1 px-2 py-1.5 transition-all"
              style={{fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(55,178,218,0.45)',borderRight:'1px dashed rgba(255,255,255,0.06)'}}>
              <HelpCircle size={9}/>
            </button>

            {/* Overlays toggle */}
            <button onClick={()=>setShowOverlays(v=>!v)} title="Overlays [V]"
              className="px-2 py-1.5 transition-all"
              style={{fontSize:8,color:showOverlays?'rgba(255,255,255,0.22)':'#fbbf24',background:showOverlays?'transparent':'rgba(251,191,36,0.06)'}}>
              {showOverlays ? '◉' : '○'}
            </button>

            {/* Clear */}
            <button onClick={macroClearCanvas} title="Limpar tudo"
              className="flex items-center gap-1 px-2 py-1.5 transition-all"
              style={{fontSize:8,color:'rgba(255,255,255,0.18)'}}>
              <Trash2 size={9}/>
              <span>Clear</span>
            </button>

            {/* Quanta count */}
            <div className="flex items-center gap-1 px-2.5 py-1.5" style={{borderLeft:'1px dashed rgba(255,255,255,0.06)'}}>
              <span style={{fontSize:7,color:'rgba(255,255,255,0.20)',letterSpacing:'0.1em',textTransform:'uppercase'}}>Q</span>
              <span style={{fontSize:8,color:'rgba(255,255,255,0.35)'}}>{quantaCount}</span>
            </div>

            {/* Zoom controls */}
            <ZoomControls
              zoom={zoomPan.zoom}
              onZoomIn={zoomPan.zoomIn}
              onZoomOut={zoomPan.zoomOut}
              onReset={zoomPan.resetView}
              accentColor={currentPreset.primary}
            />
          </div>
        </div>
      )}

      {/* ── LEFT TOOLBAR ────────────────────────────────────────────────────── */}
      {!cinematic && (
        <div className="fixed top-[68px] left-0 z-20 flex" style={{bottom: showStudioSeq ? 258 : 32}}>
          {/* Collapse toggle */}
          <button onClick={()=>setLeftOpen(v=>!v)}
            className="absolute -right-4 top-4 z-30 w-4 h-8 flex items-center justify-center transition-all"
            style={{background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,255,255,0.06)',borderLeft:'none',color:'rgba(255,255,255,0.22)'}}>
            {leftOpen?<ChevronLeft size={9}/>:<ChevronRight size={9}/>}
          </button>

          {leftOpen && (
            <div className="w-[148px] flex flex-col overflow-y-auto"
              style={{scrollbarWidth:'none',fontFamily:MONO,background:'rgba(0,0,0,0.94)',borderRight:'1px dashed rgba(255,255,255,0.06)'}}>

              {/* Tools */}
              <div className="p-2" style={{borderBottom:'1px dashed rgba(255,255,255,0.05)'}}>
                <div style={{fontFamily:DOTO,fontSize:8,color:'rgba(55,178,218,0.45)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:5,paddingLeft:2}}>TOOLS</div>
                <div className="grid grid-cols-2 gap-1">
                  {TOOLS.map(t=>(
                    <button key={t.id} onClick={()=>setActiveTool(t.id)}
                      title={`${t.label} [${t.key}]`}
                      className="flex items-center gap-1.5 px-1.5 py-1.5 transition-all"
                      style={{
                        fontSize:7,
                        color:activeTool===t.id?t.color:'rgba(255,255,255,.28)',
                        background:activeTool===t.id?'rgba(255,255,255,0.06)':'transparent',
                        border:activeTool===t.id?`1px dashed ${t.color}30`:'1px dashed transparent',
                      }}>
                      {t.icon}
                      <span style={{fontSize:6,opacity:.4}}>[{t.key}]</span>
                    </button>
                  ))}
                </div>
                {/* Active tool label */}
                <div className="mt-1.5 text-center"
                  style={{fontFamily:MONO,fontSize:8,color:TOOLS.find(t=>t.id===activeTool)?.color??'#aaa'}}>
                  {TOOLS.find(t=>t.id===activeTool)?.label}
                </div>
              </div>

              {/* Tool params */}
              <div className="p-2.5 border-b border-dashed border-white/[0.06] flex flex-col gap-2">
                {(activeTool==='excite'||activeTool==='freeze') && (
                  <S label="Brush R" value={brushRadius} min={0.04} max={0.4} step={0.01}
                    display={v=>`${(v*100).toFixed(0)}%`}
                    color={activeTool==='excite'?'#ff8800':'#88ddff'}
                    onChange={setBrushRadius}/>
                )}
                {(activeTool==='attractor'||activeTool==='repulsor'||activeTool==='vortex') && (
                  <S label="Strength" value={attStrength} min={0.02} max={0.5} step={0.01}
                    display={v=>v.toFixed(2)}
                    color={activeTool==='repulsor'?'#ff4400':activeTool==='vortex'?'#cc44ff':'#00aaff'}
                    onChange={setAttStr}/>
                )}
                {activeTool==='metro' && (
                  <S label="Beat Str" value={metroStrength} min={0.02} max={0.5} step={0.01}
                    display={v=>v.toFixed(2)} color="#ffcc00" onChange={setMetroStrength}/>
                )}
                {activeTool==='zone' && (
                  <>
                    <div className="text-[6px] font-mono uppercase tracking-widest text-white/20 mb-0.5">FX Effect</div>
                    <div className="grid grid-cols-2 gap-0.5" style={{maxHeight:112,overflowY:'auto'}}>
                      {([
                        {id:'slow',          icon:'🐌', label:'Slow'},
                        {id:'fast',          icon:'⚡', label:'Fast'},
                        {id:'mute',          icon:'🔇', label:'Mute'},
                        {id:'excite_zone',   icon:'🔥', label:'Excite'},
                        {id:'freeze_zone',   icon:'❄',  label:'Freeze'},
                        {id:'reverse',       icon:'↩',  label:'Reverse'},
                        {id:'bounce',        icon:'💥', label:'Bounce'},
                        {id:'scatter_zone',  icon:'💫', label:'Scatter'},
                        {id:'compress_zone', icon:'◎',  label:'Compress'},
                        {id:'vortex_zone',   icon:'🌀', label:'Vortex'},
                        {id:'gravity_down',  icon:'↓g', label:'Grav↓'},
                        {id:'gravity_up',    icon:'↑g', label:'Grav↑'},
                        {id:'pitch_up',      icon:'♪↑', label:'Pitch↑'},
                        {id:'pitch_down',    icon:'♪↓', label:'Pitch↓'},
                        {id:'transpose',     icon:'♭♯', label:'Transpose'},
                        {id:'harmonize_zone',icon:'🎼', label:'Harmonize'},
                        {id:'glitch',        icon:'⊞',  label:'Glitch'},
                        {id:'tremolo',       icon:'〜', label:'Tremolo'},
                        {id:'pulse_beat',    icon:'♩',  label:'Pulse Beat'},
                        {id:'warp',          icon:'∿',  label:'Warp Field'},
                        {id:'phase_lock',    icon:'⌛', label:'Phase Lock'},
                        {id:'role_shift',    icon:'⇄',  label:'Role Shift'},
                        {id:'density_wave',  icon:'◌',  label:'Density Wave'},
                      ] as {id:FxZoneEffect;icon:string;label:string}[]).map(ef=>(
                        <button key={ef.id} onClick={()=>setZoneEffect(ef.id)}
                          className={`text-[5px] py-0.5 px-0.5 transition-all
                            ${zoneEffect===ef.id?'bg-white/10 text-pink-200 border border-pink-400/35':'text-white/30 hover:text-white/60 border border-transparent hover:bg-white/5'}`}
                          style={{borderRadius:0}}>
                          <span style={{fontSize:8,lineHeight:1}}>{ef.icon}</span>{ef.label}
                        </button>
                      ))}
                    </div>
                    <S label="Zone Strength" value={zoneStrength} min={0} max={1} step={0.01}
                      display={v=>`${(v*100).toFixed(0)}%`} color="#ff44cc" onChange={setZoneStrength}/>
                    <S label={
                        zoneEffect==='transpose'?'Semitones':
                        zoneEffect==='vortex_zone'?'Spin Force':
                        zoneEffect==='compress_zone'?'Pull Force':
                        zoneEffect==='bounce'||zoneEffect==='scatter_zone'?'Impulse':
                        zoneEffect==='gravity_down'||zoneEffect==='gravity_up'?'G-Force':
                        zoneEffect==='tremolo'?'Depth':
                        zoneEffect==='warp'?'Wave Freq':
                        zoneEffect==='pulse_beat'?'Sync Strength':
                        zoneEffect==='phase_lock'?'Target Phase':
                        zoneEffect==='role_shift'?'Target Role':
                        zoneEffect==='density_wave'?'Wave Scale':
                        zoneEffect==='glitch'?'Chaos Radius':'Param'}
                      value={zoneParam} min={0} max={1} step={0.01}
                      display={v=>
                        zoneEffect==='transpose'?`${Math.round((v-0.5)*24)}st`:
                        zoneEffect==='role_shift'?(['KCK','BAS','PRC','PAD','LED','ARP','STR','CHO'][Math.min(Math.floor(v*8),7)]):
                        zoneEffect==='phase_lock'?`${(v*360).toFixed(0)}°`:
                        `${(v*100).toFixed(0)}%`
                      }
                      color="#cc88ff" onChange={setZoneParam}/>
                  </>
                )}
                {activeTool==='cage' && (
                  <div className="text-[5.5px] font-mono text-white/25 leading-snug">Arraste → gaiola rect. Bolinhas dentro ficam presas.</div>
                )}
                {activeTool==='string' && (
                  <div className="text-[5.5px] font-mono text-white/25 leading-snug">Arraste → corda harmônica. Colisão vibra e gera notas STRINGS.</div>
                )}
                {activeTool==='spawn' && (
                  <>
                    <div className="text-[6.5px] font-mono uppercase tracking-widest text-white/25 mb-0.5">Role</div>
                    <div className="grid grid-cols-4 gap-0.5">
                      {VOICE_ROLES.map(r=>(
                        <button key={r} onClick={()=>setSpawnRole(r)}
                          className={`text-[5.5px] uppercase py-0.5 transition-all
                            ${spawnRole===r?'bg-white/10':'hover:bg-white/6'}`}
                          style={{color:spawnRole===r?ROLE_COLORS[r]:'rgba(255,255,255,.35)',
                            borderBottom:`1px solid ${spawnRole===r?ROLE_COLORS[r]:'transparent'}`,borderRadius:0}}>
                          {r.slice(0,3)}
                        </button>
                      ))}
                    </div>
                    <S label="Count" value={spawnCount} min={1} max={10} step={1}
                      display={v=>String(v)} color="#aaffaa" onChange={setSpawnCount}/>
                  </>
                )}
                {activeTool==='select'&&selectedQ && (
                  <div className="flex flex-col gap-1 text-[7px] font-mono">
                    {/* Stats row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span style={{color:ROLE_COLORS[selectedQ.role]}} className="font-mono">{selectedQ.role}</span>
                      <span className="text-white/30">p:{selectedQ.pitch}</span>
                      <span className="text-white/30">c:{selectedQ.charge.toFixed(2)}</span>
                      <span className="text-white/30">m:{selectedQ.mutations}</span>
                    </div>
                    {/* Per-particle timbre picker */}
                    <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/20 mt-0.5">Timbre individual</div>
                    <div className="grid grid-cols-4 gap-0.5">
                      {/* "Role default" slot */}
                      <button
                        onClick={()=>{ selectedQ.timbreIdx=-1; forceRender(n=>n+1); }}
                        className="text-[5px] px-0.5 py-0.5 border transition-all text-center"
                        style={{
                          borderColor: selectedQ.timbreIdx===-1?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.08)',
                          color: selectedQ.timbreIdx===-1?'#ffffff':'rgba(255,255,255,0.28)',
                          background: selectedQ.timbreIdx===-1?'rgba(255,255,255,0.08)':'transparent',
                          borderRadius:0,
                        }}
                        title="Role default">
                        Role
                      </button>
                      {TIMBRE_TEMPLATES.map((tmpl,idx)=>(
                        <button key={idx}
                          onClick={()=>{ selectedQ.timbreIdx=idx; forceRender(n=>n+1); }}
                          className="text-[5px] px-0.5 py-0.5 border transition-all text-center"
                          style={{
                            borderColor: selectedQ.timbreIdx===idx?tmpl.color+'aa':'rgba(255,255,255,0.06)',
                            color: selectedQ.timbreIdx===idx?tmpl.color:'rgba(255,255,255,0.25)',
                            background: selectedQ.timbreIdx===idx?tmpl.color+'18':'transparent',
                            borderRadius:0,
                          }}
                          title={tmpl.name}>
                          {tmpl.icon}
                        </button>
                      ))}
                    </div>
                    {/* Current timbre name */}
                    <div className="text-[5.5px] text-white/25 text-center mt-0.5">
                      {selectedQ.timbreIdx>=0 ? TIMBRE_TEMPLATES[selectedQ.timbreIdx]?.name : 'Role default'}
                    </div>
                  </div>
                )}
              </div>

              {/* Macros */}
              <div className="p-2.5 border-b border-dashed border-white/[0.06]">
                <div className="text-[6px] uppercase tracking-[0.16em] text-[#37b2da]/60 mb-1.5">POWERS</div>
                <div className="flex flex-col gap-1">
                  {[
                    {label:'⚡ Excite All',fn:macroExciteAll,color:'#ff8800'},
                    {label:'❄ Freeze All', fn:macroFreezeAll,color:'#88ddff'},
                    {label:'💥 Explode',   fn:macroExplode,  color:'#ff4444'},
                    {label:'◎ Compress',  fn:macroCompress, color:'#aa88ff'},
                    {label:'✦ Scatter',   fn:macroScatter,  color:'#aaffaa'},
                    {label:'♫ Harmonize', fn:macroHarmonize,color:'#ffd700'},
                    {label:'◎ Reseed',    fn:macroReseed,   color:'#88ffaa'},
                    {label:'+10 Quanta',  fn:macroAddTen,   color:'#88aaff'},
                    {label:'−10 Quanta',  fn:macroRemoveTen,color:'#ff8866'},
                    {label:'✕ Clear All', fn:macroClearAll, color:'#ff4466'},
                    {label:'✕ Gates',     fn:macroClearGates,  color:'#ffaaff'},
                    {label:'✕ Attr',      fn:macroClearAttr,   color:'#ffccaa'},
                    {label:'✕ Fields',    fn:macroClearFields, color:'#c0c8d0'},
                    {label:'✕ Cage/Str/Z',fn:macroClearNew,    color:'#00ffcc'},
                    {label:'↺ Matrix',    fn:macroResetMatrix, color:'#88ccff'},
                  ].map(m=>(
                    <button key={m.label} onClick={m.fn}
                      className="text-left text-[7px] px-1.5 py-1 hover:bg-white/5 transition-all"
                      style={{borderRadius:0, color:m.color+'aa'}}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── QUANTUM SEQUENCER ──────────────────────────────────────── */}
              <div className="p-2.5 border-b border-dashed border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[6px] uppercase tracking-[0.16em] text-[#37b2da]/60">Q·SEQ</div>
                  <button onClick={toggleSeq}
                    className={`text-[6px] px-1.5 py-0.5 border transition-all
                      ${seqActive?'border-[#37b2da]/50 text-[#37b2da] bg-[#37b2da]/10':'border-white/[0.06] text-white/25 hover:border-[#37b2da]/30'}`}
                    style={{borderRadius:0}}>
                    {seqActive?'◉ ON':'○ OFF'}
                  </button>
                </div>

                {/* Description */}
                <div className="mb-2 text-[5.5px] text-white/22 leading-snug bg-white/[0.02] px-1.5 py-1 border border-dashed border-white/[0.06]" style={{borderRadius:0}}>
                  Um anel gira no canvas. Quando passa por um step armado, dispara a nota da bolinha mais próxima. Sem bolinha perto = silêncio (incerteza quântica).
                </div>

                {/* Steps count */}
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-[5.5px] font-mono text-white/18 uppercase">Steps</span>
                  {[8,12,16].map(n=>(
                    <button key={n} onClick={()=>setSeqStepsFn(n)}
                      className={`text-[5.5px] px-1.5 py-0.5 border transition-all
                        ${seqSteps===n?'border-[#37b2da]/40 text-[#37b2da] bg-[#37b2da]/10':'border-white/[0.06] text-white/18 hover:text-white/40'}`}
                      style={{borderRadius:0}}>
                      {n}
                    </button>
                  ))}
                  <span className="text-[5.5px] font-mono text-white/18 uppercase ml-0.5">Speed</span>
                  {[0.5,1,2,4].map(m=>(
                    <button key={m} onClick={()=>setSeqTempoMultFn(m)}
                      className={`text-[5.5px] px-1 py-0.5 border transition-all
                        ${seqTempoMult===m?'border-[#37b2da]/40 text-[#37b2da] bg-[#37b2da]/10':'border-white/[0.06] text-white/18 hover:text-white/40'}`}
                      style={{borderRadius:0}}>
                      {m}×
                    </button>
                  ))}
                </div>

                {/* Step grid — tap to arm/disarm beats */}
                <div className="text-[5px] font-mono text-white/18 mb-1 uppercase tracking-widest">Beats (toque para armar)</div>
                <div className="grid gap-0.5" style={{gridTemplateColumns:`repeat(${Math.min(seqSteps,8)},1fr)`}}>
                  {Array.from({length:seqSteps}).map((_,i)=>{
                    const armed=stateRef.current?.sequencer.steps[i]?.armed??false;
                    const isCurrent = seqActive && Math.floor((stateRef.current?.sequencer.cursor??0)*seqSteps) === i;
                    return (
                      <button key={i} onClick={()=>toggleSeqStep(i)}
                        title={armed?`Beat ${i+1} — ARMADO`:`Beat ${i+1} — desarmado`}
                        className={`h-5 text-[5px] transition-all relative
                          ${isCurrent?'ring-1 ring-white/60':''}
                          ${armed
                            ?'bg-[#37b2da]/20 border border-[#37b2da]/50 text-[#37b2da]'
                            :'bg-white/[0.03] border border-white/[0.06] text-white/18 hover:bg-white/8 hover:text-white/40'}`}
                        style={{borderRadius:0}}>
                        {i+1}
                        {isCurrent && <span className="absolute top-0 right-0 w-1 h-1 bg-white/70" style={{borderRadius:0}}/>}
                      </button>
                    );
                  })}
                </div>

                {seqActive&&(
                  <div className="mt-1.5 flex items-center gap-1 text-[5.5px] text-[#37b2da]/50">
                    <span className="w-1.5 h-1.5 bg-[#37b2da]/60 animate-pulse" style={{borderRadius:0}}/>
                    Anel ativo · {seqSteps} steps · {seqTempoMult}× bar
                  </div>
                )}
                {!seqActive&&(
                  <div className="mt-1.5 text-[5.5px] font-mono text-white/18 text-center">
                    Clique ON para iniciar o anel
                  </div>
                )}
                {tunnelFirst&&(
                  <div className="mt-1 text-[5.5px] text-purple-400/60 text-center leading-tight bg-purple-900/15 px-1 py-0.5 border border-dashed border-purple-400/15" style={{borderRadius:0}}>
                    Portal A colocado · clique para Portal B
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      {!cinematic && (
        <div className="fixed top-[68px] right-0 z-20 flex flex-row-reverse" style={{bottom: showStudioSeq ? 258 : 32}}>
          <button onClick={()=>setRightOpen(v=>!v)}
            className="absolute -left-4 top-4 z-30 w-4 h-8 flex items-center justify-center transition-all"
            style={{background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,255,255,0.06)',borderRight:'none',color:'rgba(255,255,255,0.22)'}}>
            {rightOpen?<ChevronRight size={9}/>:<ChevronLeft size={9}/>}
          </button>

          {rightOpen && (
            <div className="w-[220px] flex flex-col overflow-y-auto"
              style={{scrollbarWidth:'thin',scrollbarColor:'rgba(55,178,218,.08) transparent',fontFamily:MONO,background:'rgba(0,0,0,0.94)',borderLeft:'1px dashed rgba(255,255,255,0.06)'}}>

              {/* Tabs */}
              <div className="flex" style={{flexWrap:'wrap',borderBottom:'1px dashed rgba(255,255,255,0.05)'}}>
                {([
                  {id:'timbre',  label:'Timbre',  icon:<Sliders  size={7} className="inline mr-0.5"/>},
                  {id:'harmony', label:'Harmony', icon:<Music    size={7} className="inline mr-0.5"/>},
                  {id:'physics', label:'Physics', icon:<Settings size={7} className="inline mr-0.5"/>},
                  {id:'matrix',  label:'Matrix',  icon:<span style={{fontSize:7,marginRight:2}}>⊞</span>},
                  {id:'palette', label:'Palette', icon:<span style={{fontSize:7,marginRight:2}}>◈</span>},
                  {id:'aesthetic', label:'Look',  icon:<span style={{fontSize:7,marginRight:2}}>✦</span>},
                ] as const).map(tab=>(
                  <button key={tab.id} onClick={()=>setRightTab(tab.id)}
                    className="flex-1 py-1.5 transition-all min-w-[38px]"
                    style={{
                      fontSize:6,letterSpacing:'0.12em',textTransform:'uppercase',
                      color:rightTab===tab.id?ACCENT:'rgba(255,255,255,0.22)',
                      background:rightTab===tab.id?'rgba(55,178,218,0.04)':'transparent',
                      borderBottom:rightTab===tab.id?`1px solid ${ACCENT}`:'1px solid transparent',
                    }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {rightTab==='timbre' && (
                <div className="flex flex-col gap-3 p-3">

                  {/* ── Timbre Templates ──────────────────────────────── */}
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>
                      TIMBRE TEMPLATES
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                      {TIMBRE_TEMPLATES.map(tpl => (
                        <button key={tpl.name}
                          onClick={() => setRoleParams(editRole, {
                            waveform:    tpl.wave,
                            filterType:  tpl.fType,
                            filterFreq:  tpl.fFreq,
                            filterQ:     tpl.fQ,
                            envelope:    tpl.env,
                            gainScale:   tpl.gain,
                            detune:      tpl.det,
                            cooldownMin: tpl.cd,
                          })}
                          className="flex flex-col items-center gap-0.5 p-1 transition-all"
                          style={{ color: tpl.color, border:'1px dashed rgba(255,255,255,0.05)', background:'transparent' }}
                          title={tpl.name}>
                          <span className="text-[10px] leading-none">{tpl.icon}</span>
                          <span className="text-[5px] font-mono uppercase tracking-wider text-white/45 leading-none text-center">{tpl.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 text-[5.5px] font-mono text-white/18 text-center">
                      aplica timbre à role selecionada ↓
                    </div>
                  </div>

                  {/* Role selector + per-role random */}
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>EDIT ROLE</div>
                    <div className="grid grid-cols-4 gap-0.5">
                      {VOICE_ROLES.map(r=>(
                        <button key={r} onClick={()=>setEditRole(r)}
                          className={`text-[6px] uppercase py-1 transition-all
                            ${editRole===r?'bg-white/10':'hover:bg-white/5'}`}
                          style={{color:editRole===r?ROLE_COLORS[r]:'rgba(255,255,255,.3)',
                            borderBottom:`1px solid ${editRole===r?ROLE_COLORS[r]:'transparent'}`,borderRadius:0}}>
                          {r.slice(0,3)}
                        </button>
                      ))}
                    </div>
                    {/* Active count + per-role actions */}
                    <div className="mt-1 flex items-center justify-between px-0.5">
                      <span className="text-[6px] font-mono text-white/20">
                        {stateRef.current?.quanta.filter(q=>q.role===editRole).length??0} quanta
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => randomizeRole(editRole)}
                          title="Random timbre para este role"
                          className="text-[5.5px] uppercase px-1.5 py-0.5 border border-white/[0.06] text-white/30 hover:text-[#37b2da] hover:border-[#37b2da]/30 bg-black transition-all flex items-center gap-0.5"
                          style={{borderRadius:0}}>
                          <RotateCcw size={6}/> Rand
                        </button>
                        <button
                          onClick={() => { roleOverRef.current[editRole] = {}; forceRender(n=>n+1); }}
                          title="Reset role ao padrão do preset"
                          className="text-[5.5px] uppercase px-1.5 py-0.5 border border-white/[0.06] text-white/20 hover:text-white/55 hover:border-white/15 bg-black transition-all"
                          style={{borderRadius:0}}>
                          Reset
                        </button>
                      </div>
                    </div>
                    {/* Which template is active for this role (heuristic match) */}
                    <div className="mt-0.5 text-[5px] font-mono text-white/18 px-0.5">
                      {(() => {
                        const wave = getRoleVal(editRole,'waveform') as string;
                        const fFreq = getRoleVal(editRole,'filterFreq') as number ?? 800;
                        const match = TIMBRE_TEMPLATES.find(t => t.wave === wave && Math.abs(t.fFreq - fFreq) < 200);
                        return match ? <span style={{color:match.color}}>{match.icon} {match.name}</span> : <span className="text-white/18">Custom / {wave}</span>;
                      })()}
                    </div>
                  </div>

                  {/* Waveform */}
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:4}}>WAVEFORM</div>
                    <div className="grid grid-cols-4 gap-0.5">
                      {WAVES.map(w=>(
                        <button key={w.id} onClick={()=>setRoleParam(editRole,'waveform',w.id)}
                          className={`text-[10px] py-1 transition-all
                            ${getRoleVal(editRole,'waveform')===w.id?'bg-white/12 text-white/90':'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                          style={{borderRadius:0}}
                          title={String(w.id)}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="flex flex-col gap-1.5">
                    <S label="Filter Freq" value={getRoleVal(editRole,'filterFreq')??800} min={40} max={8000} step={10}
                      display={v=>`${v}Hz`} color={ROLE_COLORS[editRole]}
                      onChange={v=>setRoleParam(editRole,'filterFreq',v)}/>
                    <S label="Filter Q" value={getRoleVal(editRole,'filterQ')??1} min={0.1} max={20} step={0.1}
                      display={v=>v.toFixed(1)} color={ROLE_COLORS[editRole]}
                      onChange={v=>setRoleParam(editRole,'filterQ',v)}/>
                  </div>

                  {/* ADSR */}
                  <div className="flex flex-col gap-1.5">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)'}}>ENVELOPE</div>
                    {(['attack','decay','sustain','release'] as const).map(k=>{
                      const isS=k==='sustain';
                      const envVal=(getRoleVal(editRole,'envelope') as any)?.[k];
                      return (
                        <S key={k} label={k[0].toUpperCase()+k.slice(1)}
                          value={envVal??isS?.6:.3} min={0} max={isS?1:3} step={isS?.01:.01}
                          display={v=>isS?v.toFixed(2):`${v.toFixed(2)}s`}
                          color={ROLE_COLORS[editRole]}
                          onChange={v=>setRoleParam(editRole,'envelope',{
                            ...(getRoleVal(editRole,'envelope')??{attack:.01,decay:.2,sustain:.6,release:.3}),
                            [k]:v,
                          })}/>
                      );
                    })}
                  </div>

                  {/* Gain + Detune */}
                  <div className="flex flex-col gap-1.5">
                    <S label="Gain" value={getRoleVal(editRole,'gainScale')??0.6} min={0} max={1} step={0.01}
                      display={v=>v.toFixed(2)} color={ROLE_COLORS[editRole]}
                      onChange={v=>setRoleParam(editRole,'gainScale',v)}/>
                    <S label="Detune" value={getRoleVal(editRole,'detune')??0} min={-100} max={100} step={1}
                      display={v=>`${v}¢`} color={ROLE_COLORS[editRole]}
                      onChange={v=>setRoleParam(editRole,'detune',v)}/>
                    <S label="Cooldown" value={getRoleVal(editRole,'cooldownMin')??0.25} min={0.05} max={3} step={0.05}
                      display={v=>`${v.toFixed(2)}s`} color={ROLE_COLORS[editRole]}
                      onChange={v=>setRoleParam(editRole,'cooldownMin',v)}/>
                  </div>
                </div>
              )}

              {/* ── HARMONY TAB ──────────────────────────────────────────── */}
              {rightTab==='harmony' && (
                <div className="flex flex-col gap-3 p-3">
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>
                      NOTA RAIZ — <span style={{color:'#88ffcc'}}>{NOTE_NAMES[liveRoot % 12]}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-0.5">
                      {NOTE_NAMES.map((n,i) => (
                        <button key={n} onClick={() => applyRoot(i)}
                          className={`text-[6px] py-1.5 transition-all text-center
                            ${liveRoot===i?'bg-[#37b2da]/15 border border-[#37b2da]/50 text-[#37b2da]'
                              :(n.includes('#')||n.includes('b'))?'bg-white/[0.02] border border-white/[0.06] text-white/30 hover:bg-white/6 hover:text-white/55'
                              :'bg-white/[0.04] border border-white/[0.08] text-white/45 hover:bg-white/10 hover:text-white/70'}`}
                          style={{borderRadius:0}}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>
                      ESCALA — <span style={{color:'#88ffcc'}}>{SCALE_LABELS[liveScale]}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                      {(Object.keys(SCALE_LABELS) as Scale[]).map(s => (
                        <button key={s} onClick={() => applyScale(s)}
                          className={`text-[5.5px] uppercase py-1.5 text-center transition-all
                            ${liveScale===s?'bg-[#37b2da]/15 border border-[#37b2da]/50 text-[#37b2da]'
                              :'border border-dashed border-white/[0.04] text-white/30 hover:border-white/12 hover:text-white/55'}`}
                          style={{background:'transparent'}}>
                          {SCALE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>MODO HARMÔNICO</div>
                    <div className="flex gap-1">
                      {(['consonant','any','dissonant'] as const).map(m => (
                        <button key={m} onClick={() => applyHarmonyMode(m)}
                          className={`flex-1 text-[5.5px] uppercase py-1.5 transition-all
                            ${liveHarmonyMode===m?'bg-[#37b2da]/15 border border-[#37b2da]/50 text-[#37b2da]'
                              :'border border-dashed border-white/[0.04] text-white/25 hover:border-white/12 hover:text-white/50'}`}
                          style={{background:'transparent'}}>
                          {m==='consonant'?'Tonal':m==='dissonant'?'Clash':'Free'}
                        </button>
                      ))}
                    </div>
                    <div className="mt-0.5 text-[5px] font-mono text-white/18 text-center leading-snug">
                      {liveHarmonyMode==='consonant'?'Só acorda notas consonantes':liveHarmonyMode==='dissonant'?'Prioriza dissonâncias':'Toca qualquer intervalo'}
                    </div>
                  </div>
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>MAPEAMENTO</div>
                    <div className="flex gap-1">
                      <button onClick={() => setPitchMapMode('preset')}
                        className={`flex-1 text-[5.5px] uppercase py-1.5 transition-all
                          ${pitchMapMode==='preset'?'bg-[#37b2da]/15 border border-[#37b2da]/50 text-[#37b2da]'
                            :'border border-dashed border-white/[0.04] text-white/25 hover:border-white/12 hover:text-white/50'}`}
                        style={{background:'transparent'}}>
                        Preset
                      </button>
                      <button onClick={() => setPitchMapMode('canvas')}
                        className={`flex-1 text-[5.5px] uppercase py-1.5 transition-all
                          ${pitchMapMode==='canvas'?'bg-[#37b2da]/15 border border-[#37b2da]/50 text-[#37b2da]'
                            :'border border-dashed border-white/[0.04] text-white/25 hover:border-white/12 hover:text-white/50'}`}
                        style={{background:'transparent'}}>
                        Canvas
                      </button>
                    </div>
                    <div className="mt-0.5 text-[5px] font-mono text-white/18 text-center leading-snug">
                      {pitchMapMode==='preset'
                        ? 'Pitch vive nos quanta (tool zones ainda modulam)'
                        : 'X → grau da escala · Y → oitava (respeita pitchRange da role)'}
                    </div>
                  </div>
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>LIVE PAD — QUANTIZE</div>
                    <div className="grid grid-cols-6 gap-0.5">
                      {SCALE_INTERVALS[liveScale].map((iv,idx) => {
                        const nn = NOTE_NAMES[(liveRoot + iv) % 12];
                        return (
                          <button key={`${iv}_${idx}`} onClick={() => padQuantizeDegree(iv)}
                            className="text-[6px] py-1.5 transition-all text-center bg-white/[0.04] border border-white/[0.08] text-white/55 hover:bg-white/10 hover:text-white/75"
                            style={{borderRadius:0}}>
                            {nn}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1 text-[5px] font-mono text-white/18 text-center leading-snug">
                      Aplica na seleção (ou no quanta mais perto do cursor) sem mudar a raiz global.
                    </div>
                  </div>
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <S label="Event Rate" value={liveEventRate} min={0.1} max={4.0} step={0.05}
                      display={v=>`${v.toFixed(2)}×`} color="#88ffcc" onChange={applyEventRate}/>
                    <div className="mt-0.5 text-[5px] font-mono text-white/18">Frequência de disparo de notas</div>
                  </div>
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>NOTAS ATIVAS</div>
                    <div className="flex flex-wrap gap-0.5">
                      {SCALE_INTERVALS[liveScale].map(iv => {
                        const nn = NOTE_NAMES[(liveRoot + iv) % 12];
                        return (
                          <button key={iv} onClick={() => applyRoot((liveRoot + iv) % 12)}
                            title={`Raiz → ${nn}`}
                            className="text-[6px] px-1.5 py-0.5 bg-[#37b2da]/8 border border-[#37b2da]/20 text-[#37b2da]/70 hover:bg-[#37b2da]/15 hover:text-[#37b2da] transition-all"
                            style={{borderRadius:0}}>
                            {nn}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1 text-[5px] font-mono text-white/18">Clique numa nota para definir como raiz</div>
                  </div>
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <button
                      onClick={() => {
                        const sc:Scale[]=['major','minor','pentatonic','blues','dorian','phrygian','lydian','mixolydian','whole_tone','harmonic_minor'];
                        const hm=['consonant','any','any','dissonant'] as const;
                        applyRoot(Math.floor(Math.random()*12));
                        applyScale(sc[Math.floor(Math.random()*sc.length)]);
                        applyHarmonyMode(hm[Math.floor(Math.random()*hm.length)]);
                        applyEventRate(0.4+Math.random()*2.5);
                      }}
                      className="w-full py-1.5 transition-all flex items-center justify-center gap-1"
                      style={{fontSize:7,letterSpacing:'0.10em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',border:'1px dashed rgba(255,255,255,0.05)',background:'transparent'}}>
                      <RotateCcw size={8}/> Campo Harmônico Aleatório
                    </button>
                  </div>
                </div>
              )}

              {rightTab==='physics' && (
                <div className="flex flex-col gap-2.5 p-3">

                  {/* ── BALLISTIC PHYSICS PANEL ─────────────────────────── */}
                  {physicsMode && (
                    <div className="border border-dashed border-orange-400/15 bg-orange-500/[0.02] p-2 flex flex-col gap-2" style={{borderRadius:0}}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[6px] uppercase tracking-[0.16em] text-orange-300/70">⚛ BALLISTIC PHYSICS</span>
                        <span className="text-[5px] font-mono text-white/20 ml-auto">gravity only</span>
                      </div>

                      {/* Gravity Y — wide range for ballistic mode */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[6px] font-mono text-white/35 w-14">↓ Gravity Y</span>
                          <input type="range"
                            min={-2} max={2} step={0.005}
                            value={phys.gravityY}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              physRef.current = { ...physRef.current, gravityY: v };
                              setPhys(p => ({ ...p, gravityY: v }));
                            }}
                            className="flex-1 h-px appearance-none cursor-pointer"
                            style={{ background: 'rgba(255,200,100,.25)' }}/>
                          <span className="text-[6px] font-mono text-orange-300/60 w-8 text-right">{phys.gravityY.toFixed(3)}</span>
                        </div>
                        {physicsMode && (
                          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
                            <div className="text-[5px] font-mono text-white/18 w-full mb-0.5">
                              a = g×30 wu/s² — Earth≈0.327 cai 2wu em ~0.7s
                            </div>
                            {([
                              {label:'🌍 Earth',   g:0.327},
                              {label:'🌙 Moon',    g:0.054},
                              {label:'♦ Mars',    g:0.126},
                              {label:'♃ Jupiter', g:0.822},
                              {label:'☉ Zero',    g:0},
                              {label:'↑ Anti',    g:-0.327},
                            ]).map(planet=>(
                              <button key={planet.label}
                                onClick={()=>{ physRef.current={...physRef.current,gravityY:planet.g}; setPhys(p=>({...p,gravityY:planet.g})); }}
                                className={`text-[5px] px-1 py-0.5 border transition-all
                                  ${Math.abs(phys.gravityY-planet.g)<0.004
                                    ?'text-yellow-300 border-yellow-400/40 bg-yellow-400/10'
                                    :'text-white/40 border-white/[0.06] hover:text-orange-300 hover:border-orange-400/30'}`}
                                style={{borderRadius:0}}>
                                {planet.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Gravity X */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[6px] font-mono text-white/35 w-14">→ Gravity X</span>
                        <input type="range"
                          min={-2} max={2} step={0.005}
                          value={phys.gravityX}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            physRef.current = { ...physRef.current, gravityX: v };
                            setPhys(p => ({ ...p, gravityX: v }));
                          }}
                          className="flex-1 h-px appearance-none cursor-pointer"
                          style={{ background: 'rgba(255,200,100,.25)' }}/>
                        <span className="text-[6px] font-mono text-orange-300/60 w-8 text-right">{phys.gravityX.toFixed(physicsMode ? 1 : 2)}</span>
                      </div>

                      {/* Restitution (bounce) */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[6px] font-mono text-white/35 w-14">◎ Bounce</span>
                        <input type="range" min={0} max={1} step={0.01}
                          value={phys.restitution ?? 0.75}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            physRef.current = { ...physRef.current, restitution: v };
                            setPhys(p => ({ ...p, restitution: v }));
                          }}
                          className="flex-1 h-px appearance-none cursor-pointer"
                          style={{ background: 'rgba(255,200,100,.25)' }}/>
                        <span className="text-[6px] font-mono text-orange-300/60 w-8 text-right">{((phys.restitution ?? 0.75) * 100).toFixed(0)}%</span>
                      </div>

                      {/* Damping / Air resistance */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[6px] font-mono text-white/35 w-14">~ Air Drag</span>
                        <input type="range" min={0.96} max={1.0} step={0.001}
                          value={phys.damping}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            physRef.current = { ...physRef.current, damping: v };
                            setPhys(p => ({ ...p, damping: v }));
                          }}
                          className="flex-1 h-px appearance-none cursor-pointer"
                          style={{ background: 'rgba(255,200,100,.25)' }}/>
                        <span className="text-[6px] font-mono text-orange-300/60 w-8 text-right">{(1 - phys.damping).toFixed(3)}</span>
                      </div>

                      {/* Max Speed */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[6px] font-mono text-white/35 w-14">⚡ Max Spd</span>
                        <input type="range" min={0.1} max={2.0} step={0.05}
                          value={phys.maxSpeed}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            physRef.current = { ...physRef.current, maxSpeed: v };
                            setPhys(p => ({ ...p, maxSpeed: v }));
                          }}
                          className="flex-1 h-px appearance-none cursor-pointer"
                          style={{ background: 'rgba(255,200,100,.25)' }}/>
                        <span className="text-[6px] font-mono text-orange-300/60 w-8 text-right">{phys.maxSpeed.toFixed(2)}</span>
                      </div>

                      {/* Wall bounce toggle */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => {
                            const v = !physRef.current.bounceWalls;
                            physRef.current = { ...physRef.current, bounceWalls: v };
                            setPhys(p => ({ ...p, bounceWalls: v }));
                          }}
                          className={`flex-1 text-[6px] uppercase py-1 border transition-all
                            ${phys.bounceWalls
                              ? 'border-orange-400/40 text-orange-300/80 bg-orange-500/10'
                              : 'border-white/[0.06] text-white/30 hover:border-white/15'}`}
                          style={{borderRadius:0}}>
                          {phys.bounceWalls ? '◎ Wall Bounce ON' : '○ Wall Bounce OFF'}
                        </button>
                        <button
                          onClick={() => {
                            const v = !physRef.current.physicsOnly;
                            physRef.current = { ...physRef.current, physicsOnly: v };
                            setPhys(p => ({ ...p, physicsOnly: v }));
                          }}
                          className={`flex-1 text-[6px] uppercase py-1 border transition-all
                            ${phys.physicsOnly
                              ? 'border-orange-400/40 text-orange-300/80 bg-orange-500/10'
                              : 'border-[#37b2da]/25 text-[#37b2da]/60 hover:border-[#37b2da]/40'}`}
                          style={{borderRadius:0}}>
                          {phys.physicsOnly ? '⚛ Gate Only' : '♫ All Notes'}
                        </button>
                      </div>

                      <div className="text-[5.5px] font-mono text-white/18 mt-1 leading-relaxed">
                        Spawn bolas com ✏ Compose (drag = velocity) então ▶ Release
                      </div>
                    </div>
                  )}

                  {/* ── Behavior Preset Picker ──────────────────────────── */}
                  <div>
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>BEHAVIOR PRESETS</div>
                    <div className="grid grid-cols-4 gap-0.5">
                      {BEHAVIOR_PRESETS.map(b => (
                        <button key={b.id}
                          onClick={() => {
                            setBehaviorId(b.id);
                            const newPhys = applyBehaviorToPhysics(b, phys);
                            setPhys(newPhys);
                            physRef.current = newPhys;
                          }}
                          title={`${b.name} — ${b.description}`}
                          className="flex flex-col items-center gap-0.5 py-1 px-0.5 transition-all"
                          style={{
                            color: behaviorId===b.id ? b.color : 'rgba(255,255,255,0.30)',
                            background: behaviorId===b.id ? b.color+'08' : 'transparent',
                            border: behaviorId===b.id ? `1px dashed ${b.color}40` : '1px dashed rgba(255,255,255,0.04)',
                          }}>
                          <span className="text-[10px] leading-none">{b.icon}</span>
                          <span className="text-[4.5px] font-mono uppercase tracking-wide leading-none text-center opacity-80">{b.name}</span>
                        </button>
                      ))}
                    </div>
                    {behaviorId && (() => {
                      const b = BEHAVIOR_BY_ID[behaviorId];
                      return b ? (
                        <div className="mt-1.5 text-[5.5px] font-mono text-white/28 leading-snug px-0.5">
                          <span style={{color: b.color+'bb'}}>{b.name}</span> — {b.description}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* ── Motion + Forces ─────────────────────────────────── */}
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:6}}>MOTION + FORCES</div>
                    <div className="flex flex-col gap-2">
                      <S label="Damping" value={phys.damping} min={0.90} max={0.999} step={0.001}
                        display={v=>v.toFixed(3)} color="#88aaff"
                        onChange={v=>setPhys(p=>({...p,damping:v}))}/>
                      <S label="Cohesion" value={phys.cohesion} min={0} max={3} step={0.05}
                        display={v=>v.toFixed(2)} color="#aaffbb"
                        onChange={v=>setPhys(p=>({...p,cohesion:v}))}/>
                      <S label="Separation" value={phys.separation} min={0} max={3} step={0.05}
                        display={v=>v.toFixed(2)} color="#ffbbaa"
                        onChange={v=>setPhys(p=>({...p,separation:v}))}/>
                      <S label="Max Speed" value={phys.maxSpeed} min={0.02} max={0.70} step={0.01}
                        display={v=>v.toFixed(2)} color="#ffddaa"
                        onChange={v=>setPhys(p=>({...p,maxSpeed:v}))}/>
                      <S label="Turbulence" value={phys.turbulence} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#aaff88"
                        onChange={v=>setPhys(p=>({...p,turbulence:v}))}/>
                      <S label="Gravity X"
                        value={phys.gravityX}
                        min={phys.motionStyle==='ballistic'?-2:-0.4}
                        max={phys.motionStyle==='ballistic'? 2: 0.4}
                        step={0.005}
                        display={v=>v.toFixed(3)} color="#ccaaff"
                        onChange={v=>setPhys(p=>({...p,gravityX:v}))}/>
                      <S label="Gravity Y"
                        value={phys.gravityY}
                        min={phys.motionStyle==='ballistic'?-2:-0.4}
                        max={phys.motionStyle==='ballistic'? 2: 0.4}
                        step={0.005}
                        display={v=>v.toFixed(3)} color="#ccaaff"
                        onChange={v=>setPhys(p=>({...p,gravityY:v}))}/>
                      {phys.motionStyle==='ballistic' && (
                        <>
                          <div className="text-[5px] font-mono text-white/20 mt-0.5 mb-1">
                            Preset: efetivo a = g×30 wu/s² · Earth=0.327 cai ~2wu/0.7s
                          </div>
                          <div className="flex gap-0.5 flex-wrap">
                            {([
                              {label:'🌙 Moon',   g:0.054},
                              {label:'🪐 Mars',   g:0.126},
                              {label:'🌍 Earth',  g:0.327},
                              {label:'♃ Jupiter', g:0.822},
                              {label:'Zero',      g:0},
                            ]).map(({label,g})=>(
                              <button key={label}
                                onClick={()=>setPhys(p=>({...p,gravityY:g}))}
                                className={`text-[5px] px-1 py-0.5 border transition-all
                                  ${Math.abs(phys.gravityY-g)<0.004
                                    ?'text-yellow-300 border-yellow-400/40 bg-yellow-400/10'
                                    :'text-white/35 border-white/[0.06] hover:text-white/65 hover:border-white/20'}`}
                                style={{borderRadius:0}}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Behavior Physics (novos params) ─────────────────── */}
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:6}}>BEHAVIOR PHYSICS</div>
                    <div className="flex flex-col gap-2">
                      <S label="Alignment" value={phys.alignment} min={0} max={2} step={0.05}
                        display={v=>v.toFixed(2)} color="#aaeeff"
                        onChange={v=>setPhys(p=>({...p,alignment:v}))}/>
                      <S label="Zone Radius" value={phys.zoneRadius} min={0.03} max={0.50} step={0.01}
                        display={v=>v.toFixed(2)} color="#88ffdd"
                        onChange={v=>setPhys(p=>({...p,zoneRadius:v}))}/>
                      <S label="Vortex Force" value={phys.vortexForce} min={0} max={0.40} step={0.005}
                        display={v=>v.toFixed(3)} color="#cc88ff"
                        onChange={v=>setPhys(p=>({...p,vortexForce:v}))}/>
                      <S label="Burst Rate" value={phys.burstRate} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#ff9944"
                        onChange={v=>setPhys(p=>({...p,burstRate:v}))}/>
                      <S label="Migration X" value={phys.migrationX} min={-1} max={1} step={0.05}
                        display={v=>v.toFixed(2)} color="#ffee88"
                        onChange={v=>setPhys(p=>({...p,migrationX:v}))}/>
                      <S label="Migration Y" value={phys.migrationY} min={-1} max={1} step={0.05}
                        display={v=>v.toFixed(2)} color="#ffee88"
                        onChange={v=>setPhys(p=>({...p,migrationY:v}))}/>
                      <S label="Cluster Target" value={phys.clusterTarget} min={2} max={20} step={1}
                        display={v=>`${Math.round(v)}`} color="#88ffaa"
                        onChange={v=>setPhys(p=>({...p,clusterTarget:Math.round(v)}))}/>
                      <S label="Polarize" value={phys.polarize} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#ff6688"
                        onChange={v=>setPhys(p=>({...p,polarize:v}))}/>
                    </div>
                  </div>

                  {/* ── Emergent ─────────────────────────────────────────── */}
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:6}}>EMERGENT</div>
                    <div className="flex flex-col gap-2">
                      <S label="Mutation Rate" value={phys.mutationRate} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#ff88ff"
                        onChange={v=>setPhys(p=>({...p,mutationRate:v}))}/>
                      <S label="Energy Transfer" value={phys.energyTransfer} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#ffcc88"
                        onChange={v=>setPhys(p=>({...p,energyTransfer:v}))}/>
                      <S label="Entrainment" value={phys.entainment} min={0} max={1} step={0.01}
                        display={v=>v.toFixed(2)} color="#88ffcc"
                        onChange={v=>setPhys(p=>({...p,entainment:v}))}/>
                      <Tog label="Predator/Prey" on={phys.predatorPrey} color="#ff8888"
                        onToggle={()=>setPhys(p=>({...p,predatorPrey:!p.predatorPrey}))}/>
                    </div>
                  </div>

                  {/* ── Sync info ────────────────────────────────────────── */}
                  <div className="border-t border-dashed border-white/[0.06] pt-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)',marginBottom:5}}>SYNC</div>
                    <div className="flex flex-col gap-0.5 text-[7px] font-mono text-white/35">
                      <div>Alignment: {((stateRef.current?.syncIntensity??0)*100).toFixed(0)}%</div>
                      <div>Beat: {((stateRef.current?.beatPhase??0)*100).toFixed(0)}%</div>
                      <div>Quanta: {quantaCount}</div>
                      <div className="text-[5.5px] text-white/20 mt-0.5 uppercase tracking-wider">
                        {phys.motionStyle}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MATRIX TAB ──────────────────────────────────────────────── */}
              {rightTab === 'matrix' && stateRef.current && (() => {
                const roles: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
                const short = ['KCK','BAS','PRC','PAD','LED','ARP','STR','CHO'];
                const mat = stateRef.current.userMatrix;
                return (
                  <div className="p-2 flex flex-col gap-2">
                    <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)'}}>INTERACTION MATRIX</div>
                    <div className="text-[5.5px] text-white/18 leading-snug bg-white/[0.02] px-1.5 py-1 border border-dashed border-white/[0.06] mb-1" style={{borderRadius:0}}>
                      Click +0.1 · Shift -0.1 · Ctrl reset<br/>
                      Azul=atração · Vermelho=repulsão
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <div style={{display:'grid',gridTemplateColumns:`18px repeat(8,1fr)`,gap:1.5,marginBottom:2}}>
                        <div/>
                        {short.map((s,i)=>(
                          <div key={i} style={{fontSize:4.5,textAlign:'center',color:ROLE_COLORS[roles[i]],fontFamily:'monospace',overflow:'hidden'}}>{s}</div>
                        ))}
                      </div>
                      {roles.map((rowRole,ri)=>(
                        <div key={rowRole} style={{display:'grid',gridTemplateColumns:`18px repeat(8,1fr)`,gap:1.5,marginBottom:1.5}}>
                          <div style={{fontSize:4.5,color:ROLE_COLORS[rowRole],fontFamily:'monospace',display:'flex',alignItems:'center'}}>{short[ri]}</div>
                          {roles.map((colRole)=>{
                            const val = mat[rowRole]?.[colRole] ?? 0;
                            const r2 = val < 0 ? Math.round(Math.abs(val)*220) : 0;
                            const b2 = val > 0 ? Math.round(val*220) : 0;
                            const isDiag = rowRole === colRole;
                            return (
                              <button key={colRole}
                                title={`${rowRole}→${colRole}: ${val.toFixed(1)}`}
                                onClick={e=>{
                                  const delta = e.shiftKey ? -0.1 : (e.ctrlKey||e.metaKey) ? -(mat[rowRole][colRole]??0) : 0.1;
                                  stateRef.current!.userMatrix[rowRole][colRole] = parseFloat(Math.max(-1,Math.min(1,(mat[rowRole][colRole]??0)+delta)).toFixed(1));
                                  forceRender(n=>n+1);
                                }}
                                style={{
                                  background:isDiag?`rgba(255,255,255,${0.04+Math.abs(val)*0.1})`:`rgba(${r2},0,${b2},${0.12+Math.abs(val)*0.65})`,
                                  border:`1px solid rgba(255,255,255,${0.04+Math.abs(val)*0.08})`,
                                  borderRadius:2, height:13, cursor:'pointer',
                                  display:'flex',alignItems:'center',justifyContent:'center',
                                }}>
                                {Math.abs(val)>0.05&&<span style={{fontSize:4,color:val<0?'#ff9999':'#99aaff',fontFamily:'monospace'}}>{val.toFixed(1)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={macroResetMatrix}
                        className="flex-1 text-[6px] text-white/25 hover:text-white/50 transition-all py-1 border border-dashed border-white/[0.06]"
                        style={{borderRadius:0}}>
                        ↺ Reset
                      </button>
                      <button onClick={macroRandomMatrix}
                        className="flex-1 text-[6px] text-[#37b2da]/45 hover:text-[#37b2da] transition-all py-1 border border-dashed border-[#37b2da]/20 hover:border-[#37b2da]/40"
                        style={{borderRadius:0}}>
                        ⚄ Random
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── PALETTE TAB ─────────────────────────────────────────────── */}
              {rightTab === 'palette' && (
                <div className="p-2 flex flex-col gap-3">
                  <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)'}}>CANVAS PALETTE</div>

                  <div>
                    <div className="text-[5.5px] uppercase text-white/18 tracking-[0.14em] mb-1.5">MODO DE COR</div>
                    <div className="grid grid-cols-3 gap-1">
                      {([
                        {id:'role',  label:'Role',   c:'#00d4ff'},
                        {id:'mono',  label:'Mono',   c:'#ffffff'},
                        {id:'neon',  label:'Neon',   c:'#ff00ff'},
                        {id:'heat',  label:'Heat',   c:'#ff4400'},
                        {id:'earth', label:'Earth',  c:'#c8960a'},
                        {id:'plasma',label:'Plasma', c:'#cc44ff'},
                      ] as {id:PaletteMode;label:string;c:string}[]).map(m=>(
                        <button key={m.id}
                          onClick={()=>setPalette(prev=>({...prev,mode:m.id}))}
                          className="py-1.5 px-1 border transition-all text-[6.5px]"
                          style={{
                            borderColor:palette.mode===m.id?m.c+'88':'rgba(255,255,255,0.06)',
                            background:palette.mode===m.id?m.c+'12':'transparent',
                            color:palette.mode===m.id?m.c:'rgba(255,255,255,0.4)',
                            borderRadius:0,
                          }}>{m.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* ── Per-role color overrides ─────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[5.5px] uppercase text-white/18 tracking-[0.14em]">CORES POR ROLE</div>
                      {Object.keys(palette.roleColorOverrides ?? {}).length > 0 && (
                        <button onClick={()=>setPalette(p=>({...p,roleColorOverrides:{}}))}
                          className="text-[5px] font-mono text-white/20 hover:text-white/55 transition-all">↺ reset</button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {(['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'] as VoiceRole[]).map(role=>{
                        const defColor = ROLE_COLORS[role];
                        const curColor = palette.roleColorOverrides?.[role] ?? defColor;
                        const isOverridden = !!palette.roleColorOverrides?.[role];
                        return (
                          <div key={role} className="flex items-center gap-1">
                            {/* Color swatch dot */}
                            <div className="w-2 h-2 flex-shrink-0 border border-white/[0.06]"
                              style={{background:curColor,borderRadius:0}}/>
                            <span className="text-[5.5px] font-mono w-11 flex-shrink-0"
                              style={{color:curColor}}>{role}</span>
                            {/* Native color picker */}
                            <input type="color" value={curColor}
                              onChange={e=>setPalette(p=>({...p,roleColorOverrides:{...p.roleColorOverrides,[role]:e.target.value}}))}
                              className="w-6 h-4 cursor-pointer flex-shrink-0 border-0 p-0"
                              style={{background:'transparent',borderRadius:0}}/>
                            {/* Hex text input */}
                            <input type="text" value={curColor}
                              onChange={e=>{
                                const v=e.target.value.trim();
                                if (/^#[0-9a-fA-F]{6}$/.test(v))
                                  setPalette(p=>({...p,roleColorOverrides:{...p.roleColorOverrides,[role]:v}}));
                              }}
                              className="flex-1 min-w-0 bg-white/[0.03] border border-dashed border-white/[0.06] text-[5px] px-1 py-0.5"
                              style={{color:curColor,borderRadius:0}}/>
                            {/* Reset to default */}
                            {isOverridden && (
                              <button
                                onClick={()=>{
                                  const next:Partial<Record<VoiceRole,string>>={...palette.roleColorOverrides};
                                  delete next[role];
                                  setPalette(p=>({...p,roleColorOverrides:next}));
                                }}
                                className="text-[7px] text-white/20 hover:text-white/55 flex-shrink-0 transition-all">×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Background presets + custom hex ──────────────────── */}
                  <div>
                    <div className="text-[5.5px] uppercase text-white/18 tracking-[0.14em] mb-1.5">BACKGROUND</div>
                    <div className="grid grid-cols-4 gap-1 mb-1.5">
                      {([
                        {label:'Void',  color:'#050810'},
                        {label:'Night', color:'#05050a'},
                        {label:'Pitch', color:'#020202'},
                        {label:'Navy',  color:'#050818'},
                        {label:'Forest',color:'#030804'},
                        {label:'Ember', color:'#0a0402'},
                        {label:'Cosmic',color:'#08050f'},
                        {label:'Slate', color:'#060809'},
                      ]).map(bg=>(
                        <button key={bg.label}
                          onClick={()=>setPalette(prev=>({...prev,bgColor:bg.color}))}
                          className="flex flex-col items-center py-1.5 border transition-all"
                          style={{
                            borderColor:palette.bgColor===bg.color?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.06)',
                            background:bg.color,
                            borderRadius:0,
                          }}>
                          <span className="text-[5px] font-mono text-white/50">{bg.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Custom BG color */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[5px] font-mono text-white/20">Custom</span>
                      <input type="color" value={palette.bgColor}
                        onChange={e=>setPalette(p=>({...p,bgColor:e.target.value}))}
                        className="w-6 h-4 cursor-pointer border-0 p-0 flex-shrink-0"
                        style={{borderRadius:0}}/>
                      <input type="text" value={palette.bgColor}
                        onChange={e=>{
                          const v=e.target.value.trim();
                          if (/^#[0-9a-fA-F]{6}$/.test(v))
                            setPalette(p=>({...p,bgColor:v}));
                        }}
                        className="flex-1 bg-white/[0.03] border border-dashed border-white/[0.06] text-[5px] px-1 py-0.5 text-white/50"
                        style={{borderRadius:0}}/>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AESTHETIC TAB ───────────────────────────────────────────── */}
              {rightTab === 'aesthetic' && (
                <div className="p-2 flex flex-col gap-3">
                  <div className="uppercase" style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.10em',color:'rgba(55,178,218,0.35)'}}>AESTHETIC</div>

                  {/* Visual presets */}
                  <div>
                    <div className="text-[5.5px] uppercase text-white/18 tracking-[0.14em] mb-1.5">VISUAL PRESETS</div>
                    <div className="grid grid-cols-2 gap-1">
                      {MUSIC_VISUAL_PRESETS.map(vp => {
                        const active = visualPresetId === vp.id;
                        return (
                          <button key={vp.id}
                            onClick={() => applyVisualPreset(vp.id)}
                            className="p-2 border transition-all text-left"
                            style={{
                              borderRadius: 0,
                              borderColor: active ? `${ACCENT}66` : 'rgba(255,255,255,0.06)',
                              background: active ? `${ACCENT}10` : 'rgba(255,255,255,0.02)',
                            }}>
                            <div className="text-[7px] uppercase tracking-widest"
                              style={{ color: active ? ACCENT : 'rgba(255,255,255,0.45)' }}>
                              {vp.name}
                            </div>
                            <div className="text-[5.5px] font-mono leading-snug mt-0.5"
                              style={{ color: 'rgba(255,255,255,0.22)' }}>
                              {vp.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Macro knobs */}
                  <div className="border-t border-dashed border-white/[0.06] pt-2 flex flex-col gap-2.5">
                    <S label="Grain" value={aesthetic.canvas.grain} min={0} max={1} step={0.01}
                      display={v=>`${Math.round(v*100)}%`} color="#88ccff"
                      onChange={v=>setAesthetic(p=>({...p,canvas:{...p.canvas,grain:v}}))}/>
                    <S label="Vignette" value={aesthetic.canvas.vignette} min={0} max={1} step={0.01}
                      display={v=>`${Math.round(v*100)}%`} color="#88aaff"
                      onChange={v=>setAesthetic(p=>({...p,canvas:{...p.canvas,vignette:v}}))}/>
                    <S label="Glow" value={aesthetic.quanta.glow} min={0} max={1} step={0.01}
                      display={v=>`${Math.round(v*100)}%`} color="#ff88cc"
                      onChange={v=>setAesthetic(p=>({...p,quanta:{...p.quanta,glow:v}}))}/>
                    <S label="Trail Memory" value={aesthetic.trails.persistence} min={0} max={1} step={0.01}
                      display={v=>`${Math.round(v*100)}%`} color="#cc88ff"
                      onChange={v=>setAesthetic(p=>({...p,trails:{...p.trails,persistence:v}}))}/>
                    <S label="Connections" value={aesthetic.connections.alpha} min={0} max={1} step={0.01}
                      display={v=>`${Math.round(v*100)}%`} color="#00d4ff"
                      onChange={v=>setAesthetic(p=>({...p,connections:{...p.connections,alpha:v}}))}/>
                    <S label="Tools Intensity" value={aesthetic.tools.intensity} min={0} max={1.5} step={0.01}
                      display={v=>v.toFixed(2)} color="#ffcc44"
                      onChange={v=>setAesthetic(p=>({...p,tools:{...p.tools,intensity:v}}))}/>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[5.5px] uppercase tracking-[0.14em] text-white/18">3D overlays</span>
                      <button
                        onClick={()=>setAesthetic(p=>({...p,threeD:{...p.threeD,overlays:!p.threeD.overlays}}))}
                        className="text-[6px] uppercase px-2 py-1 border transition-all"
                        style={{
                          borderRadius:0,
                          borderColor: aesthetic.threeD.overlays ? `${ACCENT}55` : 'rgba(255,255,255,0.06)',
                          background: aesthetic.threeD.overlays ? `${ACCENT}12` : 'transparent',
                          color: aesthetic.threeD.overlays ? ACCENT : 'rgba(255,255,255,0.28)',
                        }}>
                        {aesthetic.threeD.overlays ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="text-[5px] font-mono text-white/18 leading-snug text-center">
                      (em breve) estes knobs vão controlar camadas do canvas/3D — base já pronta.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── QUANTUM CONTEXT MENU ─────────────────────────────────────────────── */}
      {contextMenu && stateRef.current?.quanta[contextMenu.qIdx] && (() => {
        const q = stateRef.current!.quanta[contextMenu.qIdx];
        return (
          <div
            className="fixed z-[100] min-w-[148px] overflow-hidden"
            style={{ left: contextMenu.sx + 4, top: contextMenu.sy + 4, fontFamily:MONO, background:'rgba(0,0,0,0.96)', border:'1px dashed rgba(255,255,255,0.06)' }}
            onMouseLeave={() => setContextMenu(null)}>
            {/* Header */}
            <div className="px-2.5 py-1.5 border-b border-dashed border-white/[0.06] flex items-center justify-between">
              <span className="text-[6px] font-mono uppercase tracking-widest"
                style={{ color: ROLE_COLORS[q.role] }}>
                {q.role} · pitch {q.pitch}
              </span>
              <button onClick={() => setContextMenu(null)}
                className="text-white/25 hover:text-white/60 text-[8px]">×</button>
            </div>
            {/* Change Role */}
            <div className="p-1.5 border-b border-dashed border-white/[0.06]">
              <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/22 mb-1 px-1">Change Role</div>
              <div className="grid grid-cols-4 gap-0.5">
                {(['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'] as VoiceRole[]).map(r => (
                  <button key={r}
                    onClick={() => {
                      q.role = r; q.mutations++; q.roleLockTimer = 1.5;
                      q.hue = ROLE_HUES[r];
                      stateRef.current?.emergent.push({type:'mutation',x:q.x,y:q.y,r:.04,alpha:1,color:ROLE_COLORS[r]});
                      forceRender(n=>n+1); setContextMenu(null);
                    }}
                    className={`text-[5.5px] uppercase py-1 px-0.5 transition-all
                      ${q.role===r?'bg-white/10':'hover:bg-white/6'}`}
                    style={{ color: q.role===r ? ROLE_COLORS[r] : 'rgba(255,255,255,0.4)', borderRadius:0 }}>
                    {r.slice(0,3)}
                  </button>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div className="p-1.5 flex flex-col gap-0.5">
              {/* Timbre template picker for this particle */}
              <div className="p-1.5 border-b border-dashed border-white/[0.06]">
                <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/22 mb-1 px-1">
                  Timbre — {q.timbreIdx >= 0 ? TIMBRE_TEMPLATES[q.timbreIdx]?.name : 'Role default'}
                </div>
                <div className="flex flex-wrap gap-0.5 max-h-16 overflow-y-auto" style={{scrollbarWidth:'none'}}>
                  <button
                    onClick={() => { q.timbreIdx=-1; forceRender(n=>n+1); setContextMenu(null); }}
                    className={`text-[5px] px-1 py-0.5 border transition-all ${q.timbreIdx===-1?'border-white/30 text-white/70 bg-white/10':'border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/15'}`}
                    style={{borderRadius:0}}>
                    Role
                  </button>
                  {TIMBRE_TEMPLATES.map((t,idx)=>(
                    <button key={idx}
                      onClick={() => { q.timbreIdx=idx; forceRender(n=>n+1); setContextMenu(null); }}
                      title={t.name}
                      className={`text-[8px] py-0.5 px-0.5 border transition-all ${q.timbreIdx===idx?'border-current bg-current/15':'border-white/[0.06] hover:border-white/15'}`}
                      style={{color: q.timbreIdx===idx ? t.color : 'rgba(255,255,255,0.4)', borderRadius:0}}>
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: 'Rand Timbre', action: () => randomizeParticleTmb(contextMenu.qIdx) },
                { label: 'Excite', action: () => { q.charge=1.0; q.recentlyFired=1.0; } },
                { label: 'Freeze', action: () => { q.vx=0; q.vy=0; q.charge=0.05; } },
                { label: 'Lock Phase', action: () => { (q as any).phaseLocked = (q as any).phaseLocked>=0?-1:q.id; } },
                { label: 'Pitch +1', action: () => { q.pitch=Math.min(108,q.pitch+1); } },
                { label: 'Pitch -1', action: () => { q.pitch=Math.max(24,q.pitch-1); } },
                { label: 'Delete', action: () => {
                  const st=stateRef.current; if(!st) return;
                  const i=st.quanta.indexOf(q);
                  if(i>=0){st.quanta.splice(i,1);st.count--;}
                  setQuantaCount(st.count);
                }},
              ].map(({label,action}) => (
                <button key={label}
                  onClick={() => { action(); forceRender(n=>n+1); setContextMenu(null); }}
                  className={`text-left text-[6.5px] uppercase tracking-wider px-2 py-1 transition-all
                    ${label==='Delete'?'text-red-400/70 hover:bg-red-900/20':'text-white/45 hover:text-white/80 hover:bg-white/[0.06]'}`}
                  style={{borderRadius:0}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── CINEMATIC MODE — H restores HUD ─────────────────────────────────── */}
      {cinematic && (
        <button onClick={()=>setCinematic(false)}
          title="Press H to restore HUD"
          className="fixed top-3 right-3 z-40 px-2.5 py-1 transition-all"
          style={{fontFamily:MONO,fontSize:7,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.20)',background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,255,255,0.06)'}}>
          H · Show HUD
        </button>
      )}

      {/* ── PRESET GRID ─────────────────────────────────────────────────────── */}
      {showGrid && (
        <PresetGrid currentId={presetId} onSelect={applyPreset} onClose={()=>setShowGrid(false)}/>
      )}

      {/* ── COMPOSE MODE HINT ──────────────────────────────────────────────── */}
      {composeMode && !running && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[6] pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2" style={{fontFamily:MONO,background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(251,191,36,0.15)'}}>
            <span style={{fontSize:7,color:'rgba(251,191,36,0.60)',letterSpacing:'0.12em',textTransform:'uppercase'}}>✏ COMPOSE</span>
            <span style={{fontSize:7,color:'rgba(255,255,255,0.20)'}}>Click to place · Drag = velocity · ▶ Release to run · R to restore</span>
          </div>
        </div>
      )}

      {/* ── PHYSICS MODE BADGE ─────────────────────────────────────────────── */}
      {physicsMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[6] pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1" style={{fontFamily:MONO,background:'rgba(0,0,0,0.94)',border:'1px dashed rgba(255,153,68,0.15)'}}>
            <span style={{fontSize:7,color:'rgba(255,153,68,0.55)',letterSpacing:'0.12em',textTransform:'uppercase'}}>⚛ BALLISTIC · WALL BOUNCE · GATE NOTES ONLY</span>
          </div>
        </div>
      )}

      {/* Audio overlay removed — audio starts from toolbar button */}

      {/* ── STUDIO SEQUENCER BOTTOM PANEL ────────────────────────────────────── */}
      {!cinematic && (
        <div className="fixed left-0 right-0 z-[25] border-t border-dashed border-white/[0.06]"
          style={{ bottom: 0, background: '#000', fontFamily:MONO }}>
          {/* Collapse bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none transition-colors"
            onClick={() => setShowStudioSeq(v => !v)}
            style={{borderBottom:showStudioSeq?'1px dashed rgba(255,255,255,0.04)':'none'}}>
            <span style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.12em',textTransform:'uppercase',color: studioActive ? ACCENT : 'rgba(255,255,255,0.22)'}}>
              STUDIO SEQ
            </span>
            {studioActive && (
              <span className="w-1.5 h-1.5 animate-pulse flex-shrink-0" style={{background:ACCENT}} />
            )}
            <span style={{fontFamily:MONO,fontSize:6,color:'rgba(255,255,255,0.12)',marginLeft:'auto'}}>
              {showStudioSeq ? '▼' : '▲'}
            </span>
          </div>

          {showStudioSeq && (
            <StudioSequencer
              rows={studioRows}
              active={studioActive}
              stepCount={studioStepCount}
              cursor={studioCursorUI}
              bpm={bpm}
              onToggleActive={toggleStudio}
              onToggleStep={toggleStudioStep}
              onSetStepCount={setStudioStepCountFn}
              onToggleMute={toggleStudioMute}
              onToggleSolo={toggleStudioSolo}
              onSetVel={setStudioVel}
              onClearRow={clearStudioRow}
              onLoadPattern={loadStudioPattern}
              onClearAll={clearStudioAll}
            />
          )}
        </div>
      )}

      {/* ── RECORDING BUTTON ─────────────────────────────────────────────────── */}
      <div className="fixed left-4 z-40" style={{ bottom: showStudioSeq && !cinematic ? 264 : 16 }}>
        <RecordingButton
          state={recState}
          elapsed={recElapsed}
          onStart={handleRecStart}
          onStop={handleRecStop}
        />
      </div>

      {/* ── GUIDE OVERLAY ────────────────────────────────────────────────────── */}
      {showGuide && <MusicGuide onClose={() => setShowGuide(false)} />}

      {/* ── WHAT'S NEW BANNER (Patch 01.3) ───────────────────────────────────── */}
      <WhatsNewBanner />
    </div>
  );
};

export default MusicLab;