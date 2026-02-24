import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LabId } from '../../ui/TopHUD';
import svgPaths from '../../imports/svg-0y4jkqpiw6';

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
  { id: 'treeOfLife', num: '07.', symbol: '\u{1F739}', name: 'Tree of Life', tag: 'HERMETISMO', tagColor: '#601480', statusLabel: 'ALPHA V0', description: 'APRENDA A OPERAR COM O ALGORITMO DA VIDA ARTIFICIAL ATRAVÉS DE EXPERIMENTOS, PRESETS E PARÂMETROS VARIÁVEIS INTERATIVOS.', enabled: true },
  { id: 'sociogenesis', num: '08.', symbol: '\u{1F755}', name: 'Sociogenesis', tag: 'SOCIOLOGIA', tagColor: '#9f1111', statusLabel: 'EXPERIMENTAL BUILD', description: 'DESCUBRA A EMERGÊNCIA DE SÍMBOLOS, INSTITUIÇÕES, MITOS, TOTENS E TABUS ENTRE AGENTES E COMO ISSO ALTERA O CAMPO.', enabled: true },
  { id: 'languageLab', num: '09.', symbol: '\u{1F714}', name: 'Recursive Language', tag: '', tagColor: '#191919', statusLabel: '', description: 'EM BREVE', enabled: false },
  { id: 'asimovTheater', num: '10.', symbol: '\u{1F733}', name: 'Psico-history Theater', tag: '', tagColor: '#191919', statusLabel: '', description: 'EM BREVE', enabled: false },
  { id: 'physicsSandbox', num: '11.', symbol: '\u{1F719}', name: 'Physics Sandbox', tag: '', tagColor: '#141414', statusLabel: '', description: 'EM BREVE', enabled: false },
];

const heroPaths = [
  svgPaths.p127a1200, svgPaths.p39a3e180, svgPaths.p3116aa00, svgPaths.p21125400,
  svgPaths.p3810b500, svgPaths.pbcf7c00, svgPaths.p3dc6840, svgPaths.p2b8b7000,
  svgPaths.p2d0f700, svgPaths.p17fb5300, svgPaths.p161bb100, svgPaths.p21538800,
  svgPaths.p3459ed80, svgPaths.p7993e00, svgPaths.p25265000, svgPaths.p1fde8480,
  svgPaths.p2fae140, svgPaths.p3f52de00,
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

// ── Boids Background ──────────────────────────────────────────────────────────
type Boid = { x: number; y: number; vx: number; vy: number; z: number; predator: boolean; kind: 'duelist' | 'swarm' };

function BoidsBackground({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const w1 = useRef(false), w2 = useRef(false), w3 = useRef(false);
  const trails = useRef<{ x: number; y: number }[][]>([[], []]);

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
      boidsRef.current = [
        { x: -20, y: hh * 0.42, vx: 2.4, vy: 0.4, z: 1.0, predator: true, kind: 'duelist' },
        { x: ww + 20, y: hh * 0.58, vx: -2.4, vy: -0.4, z: 1.0, predator: true, kind: 'duelist' },
      ];
      trails.current = [[], []];
      w1.current = w2.current = w3.current = false;
      startRef.current = null;
    };

    const clampSpd = (b: Boid, mn: number, mx: number) => {
      const s = Math.hypot(b.vx, b.vy) || 0.001;
      if (s > mx) { b.vx = (b.vx / s) * mx; b.vy = (b.vy / s) * mx; }
      else if (s < mn) { b.vx = (b.vx / s) * mn; b.vy = (b.vy / s) * mn; }
    };

    const spawn = (left: boolean, n: number, pf: number) => {
      const ww = canvas.clientWidth, hh = canvas.clientHeight;
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        const zv = r < 0.06 ? 1.5 + Math.random() * 0.4
                 : r < 0.22 ? 1.15 + Math.random() * 0.35
                 : 0.35 + Math.random() * 0.8;
        const zSpd = 0.55 + zv * 0.45;
        boidsRef.current.push({
          x: left ? -8 - Math.random() * 40 : ww + 8 + Math.random() * 40,
          y: hh * 0.15 + Math.random() * hh * 0.7,
          vx: (left ? 1 : -1) * (1.2 + Math.random() * 1.6) * zSpd,
          vy: (Math.random() - 0.5) * 1.8 * zSpd,
          z: zv,
          predator: i >= n * (1 - pf), kind: 'swarm',
        });
      }
    };

    const step = (time: number) => {
      if (!startRef.current) startRef.current = time;
      const el = (time - startRef.current) / 1000;
      const ww = canvas.clientWidth, hh = canvas.clientHeight;
      const boids = boidsRef.current;
      const cx = ww / 2, cy = hh / 2;

      if (el > 6.0 && !w1.current) { spawn(true, 30, 0); w1.current = true; }
      if (el > 6.5 && !w2.current) { spawn(false, 30, 0); w2.current = true; }
      if (el > 7.2 && !w3.current) { spawn(Math.random() < 0.5, 6, 1); w3.current = true; }

      ctx.clearRect(0, 0, ww, hh);

      if (el > 1.2 && el < 7 && boids.length >= 2) {
        const d1 = boids[0], d2 = boids[1];
        const dd = Math.hypot(d1.x - d2.x, d1.y - d2.y);
        const tn = Math.max(0, 1 - dd / 220);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y);
        ctx.strokeStyle = `rgba(255,255,255,${(0.06 + Math.sin(el * 4.5) * 0.04) * tn})`;
        ctx.lineWidth = 0.4; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        if (el < 7 && b.kind === 'duelist') {
          const o = boids[i === 0 ? 1 : 0];
          const ox = o.x - b.x, oy = o.y - b.y, od = Math.hypot(ox, oy) || 0.001;
          const nx = ox / od, ny = oy / od;
          const tcx = cx - b.x, tcy = cy - b.y, tcd = Math.hypot(tcx, tcy) || 0.001;
          const td = Math.max(24, 100 - el * 14);
          const de = od - td;
          const int = 0.6 + el * 0.12;
          b.vx += (tcx / tcd) * 0.065 + (-ny) * 0.13 * int + nx * de * 0.0035 + Math.sin(el * 8.1 + i * 3) * 0.12;
          b.vy += (tcy / tcd) * 0.065 + nx * 0.13 * int + ny * de * 0.0035 + Math.cos(el * 6.3 + i * 5) * 0.12;
          if (el % 1.2 < 0.15 && i === Math.floor(el / 1.2) % 2) { b.vx += nx * 0.65; b.vy += ny * 0.65; }
          clampSpd(b, 1.4, 3.2);
          if (i < 2) { trails.current[i].push({ x: b.x, y: b.y }); if (trails.current[i].length > 20) trails.current[i].shift(); }
        } else {
          let alX = 0, alY = 0, coX = 0, coY = 0, spX = 0, spY = 0, n = 0;
          let chX = 0, chY = 0, ps = 0, frX = 0, frY = 0;
          for (let j = 0; j < boids.length; j++) {
            if (i === j) continue;
            const o = boids[j], dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 0.001;
            if (!b.predator && o.predator && d < 150) { frX -= dx / d; frY -= dy / d; }
            if (b.predator && !o.predator && d < 190) { chX += dx / d; chY += dy / d; ps++; }
            if (b.predator !== o.predator) continue;
            if (d < (b.predator ? 130 : 95)) {
              alX += o.vx; alY += o.vy; coX += o.x; coY += o.y; n++;
              if (d < 22) { spX -= dx / d; spY -= dy / d; }
            }
          }
          if (n > 0) { alX /= n; alY /= n; coX = coX / n - b.x; coY = coY / n - b.y; }
          if (b.predator) {
            b.vx += alX * 0.022 + coX * 0.0006 + spX * 0.12;
            b.vy += alY * 0.022 + coY * 0.0006 + spY * 0.12;
            if (ps > 0) { b.vx += (chX / ps) * 0.1; b.vy += (chY / ps) * 0.1; }
            clampSpd(b, 1.3, 2.8);
          } else {
            b.vx += alX * 0.034 + coX * 0.0018 + spX * 0.15 + frX * 0.09;
            b.vy += alY * 0.034 + coY * 0.0018 + spY * 0.15 + frY * 0.09;
            clampSpd(b, 0.7, 2.3);
          }
        }

        b.x += b.vx; b.y += b.vy;
        if (b.x < -30) b.x += ww + 60; if (b.x > ww + 30) b.x -= ww + 60;
        if (b.y < -30) b.y += hh + 60; if (b.y > hh + 30) b.y -= hh + 60;

        if (b.kind === 'duelist' && i < 2 && el < 9) {
          const tr = trails.current[i];
          for (let t = 1; t < tr.length; t++) {
            ctx.beginPath(); ctx.moveTo(tr[t - 1].x, tr[t - 1].y); ctx.lineTo(tr[t].x, tr[t].y);
            ctx.strokeStyle = `rgba(255,255,255,${(t / tr.length) * 0.2})`;
            ctx.lineWidth = 1.2 * (t / tr.length); ctx.stroke();
          }
          const gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 12);
          gl.addColorStop(0, 'rgba(255,255,255,0.12)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI * 2); ctx.fill();
        }

        const hd = Math.atan2(b.vy, b.vx);
        const zs = b.z;
        const sz = (b.kind === 'duelist' ? 4.5 : b.predator ? 3.2 : 2) * zs;
        const zA = b.kind === 'duelist' ? 1.0 : clamp01(0.25 + zs * 0.55);

        if (zs > 1.2 && b.kind !== 'duelist') {
          const gr = sz * 4;
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, gr);
          g.addColorStop(0, `rgba(255,255,255,${0.05 * zs})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, gr, 0, Math.PI * 2); ctx.fill();
        }

        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(hd);
        ctx.beginPath(); ctx.moveTo(sz * 2.2, 0); ctx.lineTo(-sz, sz * 0.85); ctx.lineTo(-sz * 0.3, 0); ctx.lineTo(-sz, -sz * 0.85); ctx.closePath();
        ctx.fillStyle = b.kind === 'duelist' ? '#fff' : b.predator ? `rgba(255,255,255,${0.92 * zA})` : `rgba(200,200,200,${0.72 * zA})`;
        ctx.fill(); ctx.restore();
      }

      if (active) frameRef.current = requestAnimationFrame(step);
    };

    if (active) { init(); frameRef.current = requestAnimationFrame(step); }
    const onR = () => resize();
    addEventListener('resize', onR);
    return () => { removeEventListener('resize', onR); if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [active]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-55" />;
}

// ── Tools Nav ─────────────────────────────────────────────────────────────────
function ToolsNav({ onClick }: { onClick: () => void }) {
  const c = ['#FF0084', '#FFD500', '#37B2DA', '#14801A', '#601480'];
  return (
    <motion.div className="flex gap-2 cursor-pointer group justify-center" whileHover={{ gap: '12px' }} onClick={onClick}>
      {['T', 'O', 'O', 'L', 'S'].map((l, i) => (
        <motion.div key={i} className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 border border-transparent group-hover:border-white/20 transition-all"
          whileHover={{ scale: 1.2, backgroundColor: c[i] }}>
          <span className="font-bold text-sm text-white/50 group-hover:text-white transition-colors" style={{ fontFamily: DOTO }}>{l}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function HomePage({ onEnterLab }: { onEnterLab: (id: LabId) => void }) {
  const [introFinished, setIntroFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef(0);
  const diagRef = useRef<HTMLElement>(null);
  const [boidsOn, setBoidsOn] = useState(false);

  useEffect(() => {
    const el = diagRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setBoidsOn(e.isIntersecting && e.intersectionRatio >= 0.4), { threshold: [0.15, 0.4, 0.7] });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    scrollTarget.current = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
  };

  const scrollToLabs = () => document.getElementById('labs-section')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
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
            <svg className="w-full" viewBox="0 0 1313.7 430.6" fill="white">
              {heroPaths.map((d, i) => <path key={i} d={d} />)}
            </svg>
          </motion.div>

          <motion.p className="mt-5 text-zinc-500 text-[10px] md:text-xs tracking-[0.5em] text-center" style={{ fontFamily: MONO }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.7 }}>
            ALPHA TEST
          </motion.p>

          <motion.div className="mt-8"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.55, duration: 0.6 }}>
            <ToolsNav onClick={scrollToLabs} />
          </motion.div>

          <div style={{ flex: '1.6 1 0', minHeight: '16vh' }} />
        </section>

        {/* ═══ S2 — EPISTEMOLÓGICO OPERACIONAL ═══ */}
        <section className="h-[100svh] snap-start flex items-center px-6 lg:px-16 py-16">
          <motion.div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.4 }} transition={{ duration: 1 }}>
            <div className="space-y-5 text-center lg:text-left">
              <p className="text-zinc-500 text-[10px] tracking-[0.35em] uppercase" style={{ fontFamily: MONO }}>é um projeto</p>
              <h2 className="text-[clamp(30px,5.6vw,72px)] leading-[0.92] uppercase" style={{ fontFamily: DOTO }}>
                Epistemológico Operacional
              </h2>
              <p className="text-zinc-400 text-[11px] md:text-xs leading-relaxed uppercase max-w-lg mx-auto lg:mx-0" style={{ fontFamily: MONO }}>
                Criamos ferramentas para perceber e estudar de forma heurística, sistemas dinâmicos e complexos, através de processos semióticos, experimentais, metafóricos e não-lineares.
              </p>
              <p className="text-zinc-500 text-[10px] md:text-[11px] leading-relaxed uppercase max-w-lg mx-auto lg:mx-0 pt-2" style={{ fontFamily: MONO }}>
                Queremos propor um processo operacional epistemológico contínuo e recursivo para experimentar processos de auto-percepção, criação e formulação de hipóteses.
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
          <BoidsBackground active={boidsOn} />

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
              <p className="text-zinc-600 text-[10px] tracking-[0.25em] uppercase" style={{ fontFamily: MONO }}>6 ferramentas disponíveis + 6 em breve.</p>
              <p className="text-zinc-700 text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: MONO }}>(grátis durante alpha test)</p>
            </div>
          </motion.div>
        </section>

        {/* ═══ S5 — LABS LIST ═══ */}
        <section id="labs-section" className="snap-start pb-24 pt-16 px-4 md:px-12 max-w-[1600px] mx-auto w-full">
          <div className="mb-16 border-b border-dashed border-white/10 pb-4">
            <h3 className="text-zinc-500 text-sm tracking-widest" style={{ fontFamily: MONO }}>AVAILABLE TOOLS (8) + SOON (3)</h3>
          </div>
          <div className="grid gap-0">
            {LABS.map((lab, idx) => (
              <motion.div key={lab.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ delay: idx * 0.04, duration: 0.5 }}
                className={`group border-t border-dashed border-white/10 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start hover:bg-white/5 transition-colors cursor-pointer ${!lab.enabled ? 'opacity-40' : ''}`}
                onClick={() => lab.enabled && onEnterLab(lab.id)}>
                <div className="col-span-1 md:col-span-1 text-2xl text-zinc-600 font-light" style={{ fontFamily: MONO }}>{lab.num}</div>
                <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                  <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all" style={{ color: lab.tagColor }}>{lab.symbol}</span>
                  <h4 className="text-2xl md:text-3xl font-light uppercase tracking-tight" style={{ fontFamily: DOTO }}>{lab.name}</h4>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                  {lab.tag && <span className="text-[10px] tracking-widest uppercase font-bold" style={{ color: lab.tagColor, fontFamily: MONO }}>[{lab.tag}]</span>}
                  <span className="text-[10px] text-zinc-600 tracking-widest uppercase" style={{ fontFamily: MONO }}>{lab.statusLabel}</span>
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
            {['T', 'O', 'O', 'L', 'S'].map((l, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-zinc-900 text-zinc-600 flex items-center justify-center text-[10px] font-bold" style={{ fontFamily: MONO }}>{l}</div>
            ))}
          </div>
          <p className="text-zinc-700 text-[10px] tracking-widest uppercase" style={{ fontFamily: MONO }}>Tools for Perception © 2026</p>
        </footer>

      </motion.div>
    </div>
  );
}
