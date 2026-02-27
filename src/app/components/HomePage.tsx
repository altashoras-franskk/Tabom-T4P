import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LabId } from '../../ui/TopHUD';
import logoDevicesForIntuition from '../../assets/devices-for-intuition-logo-transparent.png';

const MONO = "'IBM Plex Mono', monospace";
const DOTO = "'Doto', monospace";

// ── Lab Data ──────────────────────────────────────────────────────────────────
interface LabEntry {
  id: LabId; num: string; symbol: string; name: string;
  tag: string; tagColor: string; statusLabel: string;
  description: string; enabled: boolean;
}

const LABS: LabEntry[] = [
  { id: 'complexityLife', num: '01.', symbol: '\u{1F71B}', name: 'Complexity Lab', tag: 'FOUNDATION', tagColor: '#ffd400', statusLabel: 'ALPHA V0', description: 'APRENDA A OPERAR COM O ALGORITMO DA VIDA ARTIFICIAL ATRAVÉS DE EXPERIMENTOS, PRESETS E PARÂMETROS VARIÁVEIS INTERATIVOS.', enabled: true },
  { id: 'metaArtLab', num: '02.', symbol: '\u{1F762}', name: 'Meta-Gen-Art', tag: 'GENERATIVE ART', tagColor: '#ff0084', statusLabel: 'EXPERIMENTAL BUILD', description: 'LABORATÓRIO DE CRIAÇÃO VIVA. EXPERIMENTE FAZER ARTE GENERATIVA ATRAVÉS DE "TINTA" COM VIDA PRÓPRIA.', enabled: true },
  { id: 'psycheLab', num: '03.', symbol: '\u25C8', name: 'Psyche Lab', tag: 'NEURAL FIELDS', tagColor: '#8b5cf6', statusLabel: 'ALPHA V0', description: 'CAMPOS NEURAIS E DINÂMICAS DE CONSCIÊNCIA. EXPERIMENTE FLUXOS PSÍQUICOS EMERGENTES ATRAVÉS DE AGENTES ARQUETÍPICOS.', enabled: true },
  { id: 'musicLab', num: '04.', symbol: '\u{1F770}', name: 'Complex Music Lab', tag: 'INSTRUMENT', tagColor: '#37b2da', statusLabel: 'ALPHA V0', description: 'INSTRUMENTO MUSICAL DIGITAL COMPLEXO. USE PARTÍCULAS COM VIDA PRÓPRIA PRA FAZER MÚSICA EXPERIMENTAL.', enabled: true },
  { id: 'rhizomeLab', num: '05.', symbol: '\u{1F709}', name: 'Rhizome Search', tag: 'EPISTEMIC SEARCH', tagColor: '#10d45b', statusLabel: 'ALPHA V0', description: 'FERRAMENTA PARA PESQUISAS EPISTEMOLÓGICAS NÃO-LINEARES. VEJA CONCEITOS/NOMES/BIBLIOGRAFIAS ATRAVÉS DE RIZOMAS EXPANSÍVEIS.', enabled: true },
  { id: 'alchemyLab', num: '06.', symbol: '\u{1F701}', name: 'Alchemy Table', tag: 'ALCHEMY + CHEMISTRY', tagColor: '#d6552d', statusLabel: 'ALPHA V0', description: 'APRENDA O CONCEITO BÁSICO DE EMERGÊNCIA, TRANSMUTAÇÃO E COMPLEXIDADE DE ELEMENTOS QUÍMICOS E METAFÓRICOS.', enabled: true },
  { id: 'treeOfLife', num: '07.', symbol: '\u{1F739}', name: 'Tree of Life', tag: 'HERMETIC QABALAH', tagColor: '#601480', statusLabel: 'ALPHA V0', description: 'HERMETIC QABALAH SIMULATOR. EXPLORE THE 10 SEPHIROTH, 22 PATHS, TAROT ARCANA, RITUAL TOOLS AND THE GREAT WORK. GOLDEN DAWN TRADITION.', enabled: true },
  { id: 'sociogenesis', num: '08.', symbol: '\u{1F755}', name: 'Sociogenesis', tag: 'SOCIOLOGIA', tagColor: '#9f1111', statusLabel: 'EXPERIMENTAL BUILD', description: 'DESCUBRA A EMERGÊNCIA DE SÍMBOLOS, INSTITUIÇÕES, MITOS, TOTENS E TABUS ENTRE AGENTES E COMO ISSO ALTERA O CAMPO.', enabled: true },
  { id: 'milPlatos', num: '09.', symbol: '\u22C6', name: 'Mil Platôs', tag: 'CsO LENS', tagColor: '#6366f1', statusLabel: 'EXPERIMENTAL BUILD', description: 'LENTE OPERACIONAL DELEUZE & GUATTARI. SIMULE ESTRATIFICAÇÃO ↔ CORPO SEM ÓRGÃOS, PLATÔS, RIZOMA E LINHAS DE FUGA.', enabled: true },
  { id: 'languageLab', num: '10.', symbol: '\u{1F714}', name: 'Recursive Language', tag: '', tagColor: '#191919', statusLabel: '', description: 'EM BREVE', enabled: false },
  { id: 'asimovTheater', num: '11.', symbol: '\u{1F733}', name: 'Psico-history Theater', tag: '', tagColor: '#191919', statusLabel: '', description: 'EM BREVE', enabled: false },
  { id: 'physicsSandbox', num: '12.', symbol: '\u{1F719}', name: 'Physics Sandbox', tag: '', tagColor: '#141414', statusLabel: '', description: 'EM BREVE', enabled: false },
];

// ── T4P Intro ─────────────────────────────────────────────────────────────────
const T4P_DOTS = {
  t: [[0,1],[1,1],[2,1],[1,0],[1,2],[1,3],[1,4]],
  four: [[0,0],[0,1],[0,2],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4]],
  p: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,0],[2,1],[2,2]],
};

function T4PAnimation({ onComplete }: { onComplete: () => void }) {
  const fired = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!fired.current) { fired.current = true; onComplete(); } }, 4200);
    return () => clearTimeout(t);
  }, [onComplete]);

  const dv = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1, opacity: 1,
      transition: { delay: 0.3 + i * 0.07, type: 'spring', stiffness: 120, damping: 18, mass: 1.2 },
    }),
    exit: (i: number) => ({
      scale: 0, opacity: 0,
      y: -8 + Math.random() * -16,
      x: (Math.random() - 0.5) * 20,
      transition: { delay: i * 0.025, duration: 0.9, ease: [0.4, 0, 0.2, 1] },
    }),
  };

  const rc = (dots: number[][], ox: number) => (
    <div className="relative" style={{ width: 60, height: 100 }}>
      {dots.map(([x, y], i) => (
        <motion.div key={`${ox}-${i}`} custom={i + ox * 5} variants={dv} initial="hidden" animate="visible" exit="exit"
          className="absolute rounded-full bg-white"
          style={{ width: 10, height: 10, left: x * 20 + 1, top: y * 20 + 1, boxShadow: '0 0 6px rgba(255,255,255,0.3)' }} />
      ))}
    </div>
  );

  return (
    <motion.div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] } }}>
      <div className="flex gap-8">{rc(T4P_DOTS.t, 0)}{rc(T4P_DOTS.four, 1)}{rc(T4P_DOTS.p, 2)}</div>
    </motion.div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }

function mixHex(a: string, b: string, t: number) {
  const p = clamp01(t);
  const parse = (s: string) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  const [ar, ag, ab] = parse(a.replace('#', ''));
  const [br, bg, bb] = parse(b.replace('#', ''));
  return `rgb(${Math.round(ar + (br - ar) * p)},${Math.round(ag + (bg - ag) * p)},${Math.round(ab + (bb - ab) * p)})`;
}

/*
  Inscribed geometry (viewBox 0 0 100 100, center 50,50):
  Outer circle:          r = 46
  Square in circle:      side = 46√2 ≈ 65.05  →  rect(17.5, 17.5, 65, 65)
  Eq. triangle in square: apex (50, 26.2), base (17.5, 82.5)–(82.5, 82.5)
  Inner circle in triangle: r = 65/(2√3) ≈ 18.8, center (50, 63.7)
*/

// ── Scroll-driven Logo ────────────────────────────────────────────────────────
type LK = { at: number; x: number; y: number; s: number; o: number; cr: number; sr: number; tr: number; cp: number; dec: number };

const LOGO_KEYS: LK[] = [
  { at: 0.00, x: 50, y: 28, s: 1.0,  o: 1,    cr: 0,   sr: 0,    tr: 0,   cp: 0, dec: 0 },
  { at: 0.12, x: 50, y: 28, s: 1.0,  o: 1,    cr: 0,   sr: 0,    tr: 0,   cp: 0, dec: 0 },
  { at: 0.22, x: 38, y: 40, s: 0.82, o: 0.60, cr: 14,  sr: -16,  tr: 10,  cp: 0, dec: 0 },
  { at: 0.30, x: 38, y: 40, s: 0.78, o: 0.50, cr: 24,  sr: -22,  tr: 16,  cp: 0.4, dec: 0 },
  { at: 0.38, x: 50, y: 48, s: 0.36, o: 0.50, cr: 0,   sr: 0,    tr: 0,   cp: 1, dec: 0 },
  { at: 0.44, x: 50, y: 48, s: 0.38, o: 0.40, cr: 0,   sr: 0,    tr: 0,   cp: 1, dec: 0.3 },
  { at: 0.52, x: 50, y: 46, s: 0.45, o: 0.18, cr: 40,  sr: -55,  tr: 80,  cp: 1, dec: 0.8 },
  { at: 0.58, x: 50, y: 44, s: 0.55, o: 0,    cr: 80,  sr: -110, tr: 160, cp: 1, dec: 1 },
];

function lerpKeys(p: number): LK {
  const K = LOGO_KEYS;
  if (p <= K[0].at) return K[0];
  if (p >= K[K.length - 1].at) return K[K.length - 1];
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i], b = K[i + 1];
    if (p >= a.at && p <= b.at) {
      const t = (p - a.at) / (b.at - a.at);
      const e = t * t * (3 - 2 * t);
      const m = (k: keyof LK) => (a[k] as number) + ((b[k] as number) - (a[k] as number)) * e;
      return { at: p, x: m('x'), y: m('y'), s: m('s'), o: m('o'), cr: m('cr'), sr: m('sr'), tr: m('tr'), cp: m('cp'), dec: m('dec') };
    }
  }
  return K[K.length - 1];
}

function ScrollLogo({ scrollTarget }: { scrollTarget: { current: number } }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const lerpedScroll = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    let raf: number;
    startTime.current = performance.now();

    const tick = (now: number) => {
      lerpedScroll.current += (scrollTarget.current - lerpedScroll.current) * 0.09;
      const f = lerpKeys(lerpedScroll.current);

      if (!outerRef.current || !wrapRef.current || !svgRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (f.o < 0.005) {
        outerRef.current.style.display = 'none';
        raf = requestAnimationFrame(tick);
        return;
      }
      outerRef.current.style.display = '';
      outerRef.current.style.opacity = String(f.o);

      wrapRef.current.style.left = `${f.x}%`;
      wrapRef.current.style.top = `${f.y}%`;
      wrapRef.current.style.transform = `translate(-50%,-50%) scale(${f.s})`;

      const t = (now - startTime.current) / 1000;
      const d = f.dec;

      const spd = 1 + d * 3;

      // Continuous rotation — alive from the start, intensifies on deconstruction
      const cRot = f.cr + Math.sin(t * 0.3 * spd) * (12 + d * 35) + t * 4 * spd;
      const sRot = f.sr + Math.cos(t * 0.22 * spd) * (10 + d * 30) - t * 3 * spd;
      const tRot = f.tr + Math.sin(t * 0.28 * spd + 1.2) * (14 + d * 45) + t * 3.5 * spd;
      const iRot = Math.sin(t * 0.18 * spd + 2.4) * (8 + d * 22) - t * 2.5 * spd;

      // Gentle breathing float (always), expanding drift on deconstruction
      const breathe = 1.5;
      const driftAmp = d * d;
      const cTx = Math.sin(t * 0.23 + 0.5) * (breathe + driftAmp * 20) - driftAmp * 12;
      const cTy = Math.cos(t * 0.19 + 1.0) * (breathe * 0.8 + driftAmp * 14) - driftAmp * 10;
      const sTx = Math.cos(t * 0.26 + 2.0) * (breathe + driftAmp * 18) + driftAmp * 14;
      const sTy = Math.sin(t * 0.21 + 0.3) * (breathe * 0.7 + driftAmp * 16) + driftAmp * 8;
      const tTx = Math.sin(t * 0.30 + 3.0) * (breathe * 1.2 + driftAmp * 20) + driftAmp * 6;
      const tTy = Math.cos(t * 0.17 + 1.5) * (breathe + driftAmp * 22) + driftAmp * 16;
      const iTx = Math.cos(t * 0.24 + 0.8) * (breathe * 0.9 + driftAmp * 15) - driftAmp * 8;
      const iTy = Math.sin(t * 0.20 + 2.5) * (breathe * 0.6 + driftAmp * 18) - driftAmp * 14;

      const sw = 0.55 + f.cp * 0.55;
      const cc = mixHex('#888888', '#37B2DA', f.cp);
      const sc = mixHex('#888888', '#FF0084', f.cp);
      const tc = mixHex('#888888', '#FFD500', f.cp);
      const ic = mixHex('#888888', '#14801A', f.cp);

      const svg = svgRef.current;
      const gs = svg.querySelectorAll<SVGGElement>(':scope > g');

      gs[0].setAttribute('transform', `rotate(${cRot} 50 50) translate(${cTx} ${cTy})`);
      const c1 = gs[0].firstElementChild as SVGElement;
      c1.setAttribute('stroke', cc);
      c1.setAttribute('stroke-width', String(sw));
      c1.style.opacity = String(1 - d * 0.35);

      gs[1].setAttribute('transform', `rotate(${sRot} 50 50) translate(${sTx} ${sTy})`);
      const r1 = gs[1].firstElementChild as SVGElement;
      r1.setAttribute('stroke', sc);
      r1.setAttribute('stroke-width', String(sw));
      r1.style.opacity = String(1 - d * 0.35);

      gs[2].setAttribute('transform', `rotate(${tRot} 50 50) translate(${tTx} ${tTy})`);
      const p1 = gs[2].firstElementChild as SVGElement;
      p1.setAttribute('stroke', tc);
      p1.setAttribute('stroke-width', String(sw));
      p1.style.opacity = String(1 - d * 0.35);

      gs[3].setAttribute('transform', `rotate(${iRot} 50 50) translate(${iTx} ${iTy})`);
      const c2 = gs[3].firstElementChild as SVGElement;
      c2.setAttribute('stroke', ic);
      c2.setAttribute('stroke-width', String(sw));
      c2.style.opacity = String(1 - d * 0.45);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollTarget]);

  return (
    <div ref={outerRef} className="fixed inset-0 z-[1] pointer-events-none">
      <div
        ref={wrapRef}
        className="absolute"
        style={{ width: 400, height: 400, left: '50%', top: '28%', transform: 'translate(-50%,-50%)' }}
      >
        <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full">
          <g><circle cx="50" cy="50" r="46" fill="none" stroke="#888" strokeWidth="0.55" /></g>
          <g><rect x="17.5" y="17.5" width="65" height="65" fill="none" stroke="#888" strokeWidth="0.55" /></g>
          <g><path d="M50 26.2 L82.5 82.5 L17.5 82.5 Z" fill="none" stroke="#888" strokeWidth="0.55" /></g>
          <g><circle cx="50" cy="63.7" r="18.8" fill="none" stroke="#888" strokeWidth="0.55" /></g>
        </svg>
      </div>
    </div>
  );
}

// ── Particle-life-ish Background (homepage) ───────────────────────────────────
type Boid = {
  x: number; y: number; vx: number; vy: number;
  z: number; ph: number;
  t: number; // type 0..3
};

function BoidsBackground({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number; has: boolean; down: boolean }>({ x: 0, y: 0, has: false, down: false });
  const matRef = useRef<{ a: number[][]; r: number[][] }>({ a: [], r: [] });
  const gridRef = useRef<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const p = canvas.parentElement;
      const ww = p?.clientWidth ?? innerWidth;
      const hh = p?.clientHeight ?? innerHeight;
      canvas.width = Math.floor(ww * devicePixelRatio);
      canvas.height = Math.floor(hh * devicePixelRatio);
      canvas.style.width = `${ww}px`;
      canvas.style.height = `${hh}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const init = () => {
      resize();
      const ww = canvas.clientWidth, hh = canvas.clientHeight;
      const types = 4;
      const a: number[][] = Array.from({ length: types }, () => Array(types).fill(0));
      const r: number[][] = Array.from({ length: types }, () => Array(types).fill(0));
      for (let i = 0; i < types; i++) {
        for (let j = 0; j < types; j++) {
          const v = (Math.random() * 2 - 1) * (0.55 + Math.random() * 0.35);
          a[i][j] = Math.max(-1, Math.min(1, v));
          r[i][j] = 80 + Math.random() * 120;
        }
      }
      matRef.current = { a, r };

      const cellSize = 120;
      const cols = Math.max(6, Math.floor(ww / cellSize));
      const rows = Math.max(6, Math.floor(hh / cellSize));
      gridRef.current = Array.from({ length: cols * rows }, () => []);

      const N = Math.max(180, Math.min(420, Math.floor((ww * hh) / 4800)));
      const boids: Boid[] = [];
      for (let i = 0; i < N; i++) {
        const t = i % 4;
        const x = Math.random() * ww;
        const y = Math.random() * hh;
        const ang = Math.random() * Math.PI * 2;
        const sp = 0.3 + Math.random() * 0.9;
        boids.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, z: 0.4 + Math.random() * 1.2, ph: Math.random() * Math.PI * 2, t });
      }
      boidsRef.current = boids;
      startRef.current = null;
    };

    const clampSpd = (b: Boid, mx: number) => {
      const s = Math.hypot(b.vx, b.vy) || 0.001;
      if (s > mx) { b.vx = (b.vx / s) * mx; b.vy = (b.vy / s) * mx; }
    };

    const gridIndex = (x: number, y: number, cols: number, rows: number, cellSize: number) => {
      const gx = Math.max(0, Math.min(cols - 1, Math.floor(x / cellSize)));
      const gy = Math.max(0, Math.min(rows - 1, Math.floor(y / cellSize)));
      return gy * cols + gx;
    };

    const step = (time: number) => {
      if (!startRef.current) startRef.current = time;
      const ww = canvas.clientWidth, hh = canvas.clientHeight;
      const boids = boidsRef.current;
      const mat = matRef.current;

      ctx.clearRect(0, 0, ww, hh);

      const cellSize = 120;
      const cols = Math.max(6, Math.floor(ww / cellSize));
      const rows = Math.max(6, Math.floor(hh / cellSize));
      const grid = gridRef.current;
      if (grid.length !== cols * rows) {
        gridRef.current = Array.from({ length: cols * rows }, () => []);
      } else {
        for (let i = 0; i < grid.length; i++) grid[i].length = 0;
      }

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        const gi = gridIndex(b.x, b.y, cols, rows, cellSize);
        gridRef.current[gi].push(i);
      }

      const mouse = mouseRef.current;
      const beta = 0.30;
      const coreRepel = 1.0;
      const dt = 1;

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        const gi = gridIndex(b.x, b.y, cols, rows, cellSize);
        const gx = gi % cols;
        const gy = Math.floor(gi / cols);

        let fx = 0;
        let fy = 0;

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = gx + ox;
            const ny = gy + oy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const cell = gridRef.current[ny * cols + nx];
            for (let k = 0; k < cell.length; k++) {
              const j = cell[k];
              if (j === i) continue;
              const o = boids[j];
              const dx = o.x - b.x;
              const dy = o.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 1e-6) continue;
              const dist = Math.sqrt(d2);
              const rr = mat.r[b.t][o.t];
              if (dist >= rr) continue;
              const nrm = dist / rr;

              let forceMag = 0;
              if (nrm < beta) {
                forceMag = (nrm / beta - 1.0) * coreRepel;
              } else {
                forceMag = mat.a[b.t][o.t] * (1.0 - Math.abs(1.0 + beta - 2.0 * nrm) / (1.0 - beta));
              }

              const inv = 1.0 / (dist + 0.001);
              fx += dx * inv * forceMag;
              fy += dy * inv * forceMag;
            }
          }
        }

        if (mouse.has) {
          const mx = mouse.x - b.x;
          const my = mouse.y - b.y;
          const md = Math.hypot(mx, my) || 0.001;
          const mr = 520;
          const tn = Math.max(0, 1 - md / mr);
          const desired = mouse.down ? 60 : 95;
          const radialK = (mouse.down ? 0.008 : 0.004) * tn;
          const radial = (md - desired) * radialK;
          fx += (mx / md) * radial;
          fy += (my / md) * radial;
          const orbit = (mouse.down ? 0.30 : 0.18) * tn * tn;
          fx += (-my / md) * orbit;
          fy += (mx / md) * orbit;
        }

        const t = (time * 0.001);
        b.z = 0.45 + 1.1 * (0.5 + 0.5 * Math.sin(t * 0.7 + b.ph));
        fx += Math.sin(t * 1.7 + b.ph * 1.3) * 0.04;
        fy += Math.cos(t * 1.4 + b.ph * 1.1) * 0.04;

        const zSp = 0.55 + b.z * 0.55;
        b.vx = (b.vx + fx * 0.75 * zSp) * 0.984;
        b.vy = (b.vy + fy * 0.75 * zSp) * 0.984;
        if (mouse.has) {
          const mx = mouse.x - b.x;
          const my = mouse.y - b.y;
          const md = Math.hypot(mx, my) || 0.001;
          const tn = Math.max(0, 1 - md / 420);
          const damp = 1 - tn * 0.045;
          b.vx *= damp;
          b.vy *= damp;
        }
        clampSpd(b, 3.2 * zSp);
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < -40) b.x += ww + 80; if (b.x > ww + 40) b.x -= ww + 80;
        if (b.y < -40) b.y += hh + 80; if (b.y > hh + 40) b.y -= hh + 80;
      }

      const order = boids.map((_, i) => i).sort((ia, ib) => boids[ia].z - boids[ib].z);

      for (let ii = 0; ii < order.length; ii++) {
        const b = boids[order[ii]];
        const zs = b.z;
        const r0 = 1.2 + zs * 1.6;
        const a0 = clamp01(0.06 + zs * 0.14);
        if (a0 <= 0.001) continue;

        const gr = r0 * 5;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, gr);
        g.addColorStop(0, `rgba(255,255,255,${0.04 * a0})`);
        g.addColorStop(0.4, `rgba(255,255,255,${0.012 * a0})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, gr, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${a0})`;
        ctx.beginPath(); ctx.arc(b.x, b.y, r0, 0, Math.PI * 2); ctx.fill();
      }

      if (active) frameRef.current = requestAnimationFrame(step);
    };

    if (active) { init(); frameRef.current = requestAnimationFrame(step); }
    const onR = () => resize();
    addEventListener('resize', onR);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.has = true;
    };
    const onDown = () => { mouseRef.current.down = true; mouseRef.current.has = true; };
    const onUp = () => { mouseRef.current.down = false; };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('pointerup', onUp, { passive: true });
    addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      removeEventListener('resize', onR);
      removeEventListener('pointermove', onMove as any);
      removeEventListener('pointerdown', onDown as any);
      removeEventListener('pointerup', onUp as any);
      removeEventListener('pointercancel', onUp as any);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.65 }}
    />
  );
}

// ── Tools Nav ─────────────────────────────────────────────────────────────────
function ToolsNav({ onClick }: { onClick: () => void }) {
  const c = ['#FF0084', '#FFD500', '#37B2DA', '#14801A', '#601480', '#f97316', '#8b5cf6'];
  return (
    <motion.div className="flex gap-1.5 cursor-pointer group justify-center" whileHover={{ gap: '10px' }} onClick={onClick}>
      {['D', 'E', 'V', 'I', 'C', 'E', 'S'].map((l, i) => (
        <motion.div key={i} className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-zinc-800 border border-transparent group-hover:border-white/20 transition-all"
          whileHover={{ scale: 1.15, backgroundColor: c[i % c.length] }}>
          <span className="font-bold text-sm text-white/50 group-hover:text-white transition-colors" style={{ fontFamily: DOTO }}>{l}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function HomePage({
  onEnterLab,
  onOpenAdmin,
  adminMode = false,
}: {
  onEnterLab: (id: LabId) => void;
  onOpenAdmin?: () => void;
  adminMode?: boolean;
}) {
  const [introFinished, setIntroFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef(0);
  const diagRef = useRef<HTMLElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    scrollTarget.current = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
  };

  const scrollToLabs = () => document.getElementById('labs-section')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Immersive background life (particle-life-ish). */}
      <BoidsBackground active={true} />
      {onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          className="fixed top-3 right-3 z-20 px-3 py-2 rounded-xl border border-dashed border-white/15 bg-black/60 hover:bg-white/5 transition-colors"
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: adminMode ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}
          title={adminMode ? 'Admin Mode (ativado)' : 'Admin Mode (senha)'}
        >
          {adminMode ? 'ADMIN ON' : 'ADMIN'}
        </button>
      )}
      <AnimatePresence>
        {!introFinished && <T4PAnimation onComplete={() => setIntroFinished(true)} />}
      </AnimatePresence>

      {introFinished && <ScrollLogo scrollTarget={scrollTarget} />}

      <motion.div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto overflow-x-hidden relative z-10 snap-y snap-mandatory scroll-smooth"
        initial={{ opacity: 0 }}
        animate={{ opacity: introFinished ? 1 : 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >

        {/* ═══ S1 — HERO ═══ */}
        <section className="h-[100svh] snap-start flex flex-col items-center justify-center px-6">
          <div style={{ flex: '1 1 0', minHeight: '12vh' }} />

          <motion.div className="w-[min(92vw,1040px)]"
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1, delay: 0.15 }}>
            <img
              src={logoDevicesForIntuition}
              alt="Devices for Intuition"
              draggable={false}
              loading="eager"
              className="w-full h-auto select-none"
              style={{
                filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.10))',
              }}
            />
          </motion.div>

          <motion.p className="mt-5 text-zinc-500 text-[10px] md:text-xs tracking-[0.5em] text-center" style={{ fontFamily: MONO }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.45, duration: 0.7 }}>
            ALPHA TEST
          </motion.p>

          <motion.div className="mt-8"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.55, duration: 0.6 }}>
            <ToolsNav onClick={scrollToLabs} />
          </motion.div>

          <div style={{ flex: '1.6 1 0', minHeight: '16vh' }} />
        </section>

        {/* ═══ S2 — PROJECT ═══ */}
        <section className="h-[100svh] snap-start flex items-center px-6 lg:px-16 py-16">
          <motion.div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.4 }} transition={{ duration: 1 }}>
            <div className="space-y-5 text-center lg:text-left">
              <p className="text-zinc-500 text-[10px] tracking-[0.35em] uppercase" style={{ fontFamily: MONO }}>devices for intuition</p>
              <h2 className="text-[clamp(30px,5.6vw,72px)] leading-[0.92] uppercase" style={{ fontFamily: DOTO }}>
                Um laboratório vivo para pensar com o corpo — e percepção.
              </h2>
              <p className="text-zinc-400 text-[11px] md:text-xs leading-relaxed uppercase max-w-lg mx-auto lg:mx-0" style={{ fontFamily: MONO }}>
                Criamos ferramentas para perceber e estudar, de forma heurística, visual e não linear, dinâmicas complexas: sistemas que mudam, se organizam, entram em crise, se reinventam.
              </p>
              <p className="text-zinc-500 text-[10px] md:text-[11px] leading-relaxed uppercase max-w-lg mx-auto lg:mx-0 pt-2" style={{ fontFamily: MONO }}>
                Construímos lentes pra testar hipóteses em tempo real.<br />
                É uma máquina de gerar perguntas. Não buscamos &quot;verdade final.&quot;
              </p>
            </div>
            <div className="text-center lg:text-right space-y-2 lg:pr-4">
              <p className="text-zinc-500 text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: MONO }}>as ferramentas são</p>
              <p className="text-white text-[clamp(32px,5vw,64px)] uppercase leading-none" style={{ fontFamily: DOTO }}>"LENTES"</p>
            </div>
          </motion.div>
        </section>

        {/* ═══ S3 — ALGORITMO + BOIDS ═══ */}
        <section ref={diagRef} className="h-[100svh] snap-start relative overflow-hidden flex items-center px-6 py-16">

          <motion.div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.35 }} transition={{ duration: 1 }}>

            <div className="space-y-4 text-center lg:text-left">
              <h3 className="text-[clamp(24px,4vw,42px)] uppercase" style={{ fontFamily: DOTO }}>Algoritmo</h3>
              <p className="text-zinc-400 text-[11px] md:text-xs leading-relaxed uppercase max-w-sm mx-auto lg:mx-0" style={{ fontFamily: MONO }}>
                Todas as nossas ferramentas utilizam o mesmo princípio e algoritmo de vida artificial customizado (ALife), baseado em partículas com arquétipos variáveis, mutáveis e influenciáveis.
              </p>
              <p className="text-zinc-600 text-[9px] tracking-[0.2em] uppercase pt-1" style={{ fontFamily: MONO }}>
                simulação rodando em tempo real no background
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-2" style={{ fontFamily: DOTO }}>
              <span className="text-[#FFD500] text-[clamp(14px,2vw,22px)] uppercase">[ Campo ]</span>
              <span className="text-zinc-500 text-[clamp(14px,2vw,22px)]">↓</span>
              <div className="flex items-center gap-2 whitespace-nowrap flex-wrap justify-center lg:justify-end">
                <span className="text-[#14801A] text-[clamp(14px,2vw,22px)] uppercase">[ Agentes ]</span>
                <span className="text-zinc-500 text-[clamp(14px,2vw,22px)]">←→</span>
                <span className="text-[#FF0084] text-[clamp(14px,2vw,22px)] uppercase">[ Interações ]</span>
              </div>
              <span className="text-zinc-500 text-[clamp(14px,2vw,22px)]">↓</span>
              <span className="text-[#FFD500] text-[clamp(14px,2vw,22px)] uppercase">[ Campo ]</span>
              <span className="text-zinc-400 text-[clamp(11px,1.5vw,16px)] normal-case mt-1">↺ (recursividade)</span>
            </div>
          </motion.div>
        </section>

        {/* ═══ S4 — MANIFESTO ═══ */}
        <section className="h-[100svh] snap-start flex flex-col items-center justify-center px-6 py-16">
          <motion.div className="max-w-5xl w-full text-center space-y-10"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.45 }} transition={{ duration: 1 }}>
            <p className="text-zinc-300 text-[clamp(15px,2.5vw,34px)] leading-[1.4] uppercase tracking-[0.1em]" style={{ fontFamily: DOTO }}>
              Acreditamos que o processo de construir uma hipótese deve ser livre, variável, contínuo, visual e meta-linguístico.
            </p>
            <p className="text-zinc-300 text-[clamp(15px,2.5vw,34px)] leading-[1.4] uppercase tracking-[0.1em]" style={{ fontFamily: DOTO }}>
              A ideia não é achar verdade definitiva, e sim propor uma lente que é antítese a equações lineares e "fechadas".
            </p>
            <div className="pt-6 flex flex-col items-center gap-5">
              <ToolsNav onClick={scrollToLabs} />
              <p className="text-zinc-600 text-[10px] tracking-[0.25em] uppercase" style={{ fontFamily: MONO }}>9 ferramentas disponíveis + 3 em breve.</p>
              <p className="text-zinc-700 text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: MONO }}>(grátis durante alpha test)</p>
            </div>
          </motion.div>
        </section>

        {/* ═══ S5 — LABS LIST ═══ */}
        <section id="labs-section" className="snap-start pb-24 pt-16 px-4 md:px-12 max-w-[1600px] mx-auto w-full">
          <div className="mb-16 border-b border-dashed border-white/10 pb-4">
            <h3 className="text-zinc-500 text-sm tracking-widest" style={{ fontFamily: MONO }}>AVAILABLE TOOLS (9) + SOON (3)</h3>
          </div>
          <div className="grid gap-0">
            {LABS.map((lab, idx) => (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ delay: idx * 0.04, duration: 0.5 }}
                className={`group border-t border-dashed border-white/10 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start hover:bg-white/5 transition-colors cursor-pointer ${(!lab.enabled && !adminMode) ? 'opacity-40' : ''}`}
                onClick={() => (lab.enabled || adminMode) && onEnterLab(lab.id)}>
                <div className="col-span-1 md:col-span-1 text-2xl text-zinc-600 font-light" style={{ fontFamily: MONO }}>{lab.num}</div>
                <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                  <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all" style={{ color: lab.tagColor }}>{lab.symbol}</span>
                  <h4 className="text-2xl md:text-3xl font-light uppercase tracking-tight" style={{ fontFamily: DOTO }}>{lab.name}</h4>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                  {lab.tag && <span className="text-[10px] tracking-widest uppercase font-bold" style={{ color: lab.tagColor, fontFamily: MONO }}>[{lab.tag}]</span>}
                  <span className="text-[10px] text-zinc-600 tracking-widest uppercase" style={{ fontFamily: MONO }}>
                    {(!lab.enabled && !adminMode) ? (lab.statusLabel || 'TRANCADO') : (lab.statusLabel || '')}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-4">
                  <p className="text-xs text-zinc-400 leading-relaxed uppercase" style={{ fontFamily: MONO }}>{lab.description}</p>
                </div>
              </motion.div>
            ))}
            <div className="border-t border-dashed border-white/10" />
          </div>
        </section>

        <footer className="py-24 text-center snap-start">
          <div className="flex justify-center gap-2 mb-8">
            {['D', 'E', 'V', 'I', 'C', 'E', 'S'].map((l, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-zinc-900 text-zinc-600 flex items-center justify-center text-[10px] font-bold" style={{ fontFamily: MONO }}>{l}</div>
            ))}
          </div>
          <p className="text-zinc-700 text-[10px] tracking-widest uppercase" style={{ fontFamily: MONO }}>Devices for Intuition © 2026</p>
          <a
            href="mailto:frans@radical.vision"
            className="inline-block mt-3 text-zinc-500 text-[10px] tracking-widest uppercase hover:text-zinc-300 transition-colors"
            style={{ fontFamily: MONO }}
          >
            frans@radical.vision
          </a>
        </footer>

      </motion.div>
    </div>
  );
}
