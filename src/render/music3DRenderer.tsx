// ── Music Lab 3D Renderer v2 — Enhanced Three.js Visualization ───────────────
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { MusicState, VoiceRole, ROLE_COLORS } from '../sim/music/musicTypes';

export interface Music3DRendererProps {
  state: MusicState;
  width: number;
  height: number;
  cameraMode: '3d-orbital' | '3d-fpp' | '3d-top' | '3d-side';
  paused: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  showTrails?: boolean;
  colorMode?: 'role' | 'charge' | 'velocity';
}

const TRAIL_MAX = 28;

function chargeColor(c: number): THREE.Color {
  return new THREE.Color().setHSL(0.6 - c * 0.58, 1.0, 0.32 + c * 0.38);
}
function velColor(spd: number): THREE.Color {
  const t = Math.min(spd / 0.22, 1);
  return new THREE.Color().setHSL(0.65 - t * 0.65, 1.0, 0.33 + t * 0.28);
}

export const Music3DRenderer: React.FC<Music3DRendererProps> = ({
  state, width, height, cameraMode, paused,
  showGrid = true, showAxes = false, showTrails = true, colorMode = 'role',
}) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const meshesRef     = useRef<Map<number, THREE.Mesh>>(new Map());
  const trailHistRef  = useRef<Map<number, {x:number;y:number;z:number}[]>>(new Map());
  const trailLineRef  = useRef<Map<number, THREE.Line>>(new Map());
  const frameRef      = useRef<number>(0);
  const timeRef       = useRef<number>(0);
  const gridRef       = useRef<THREE.GridHelper | null>(null);
  const axesRef       = useRef<THREE.AxesHelper | null>(null);

  // Orbital state — angle, elevation, radius (user-controllable)
  const orbRef = useRef({ theta: 0, phi: 0.42, r: 9.0 });
  const dragRef = useRef(false);
  const lastPtRef = useRef({ x: 0, y: 0 });

  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020308);
    scene.fog = new THREE.FogExp2(0x020308, 0.038);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.05, 200);
    camera.position.set(0, 3, 9);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x304060, 0.7));
    const p1 = new THREE.PointLight(0x00d4ff, 2.5, 28); p1.position.set(6, 7, 6); scene.add(p1);
    const p2 = new THREE.PointLight(0xff2255, 1.8, 24); p2.position.set(-6, 4, -6); scene.add(p2);
    const p3 = new THREE.PointLight(0xffcc44, 1.0, 20); p3.position.set(0,-4, 8); scene.add(p3);
    const p4 = new THREE.PointLight(0xaa44ff, 0.8, 18); p4.position.set(-4, 8,-3); scene.add(p4);

    // Grid
    const grid = new THREE.GridHelper(32, 32, 0x223344, 0x112233);
    grid.position.y = -3;
    grid.visible = showGrid;
    scene.add(grid);
    gridRef.current = grid;

    // Axes
    const axes = new THREE.AxesHelper(5);
    axes.visible = showAxes;
    scene.add(axes);
    axesRef.current = axes;

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current && containerRef.current) {
        try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
      }
      rendererRef.current?.dispose();
      meshesRef.current.clear();
      trailLineRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync grid/axes visibility ──────────────────────────────────────────────
  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (axesRef.current) axesRef.current.visible = showAxes; }, [showAxes]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, [width, height]);

  // ── Render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (!paused) timeRef.current += 0.016;

      const scene    = sceneRef.current!;
      const camera   = cameraRef.current!;
      const renderer = rendererRef.current!;
      const orb      = orbRef.current;
      const t        = timeRef.current;

      // ── Camera ─────────────────────────────────────────────────────────
      if (cameraMode === '3d-orbital') {
        orb.theta += 0.007;                                   // auto-rotate
        orb.phi = 0.30 + Math.sin(t * 0.055) * 0.18;         // gentle elevation bob
        const r  = orb.r + Math.sin(t * 0.09) * 1.8;
        camera.position.x = r * Math.sin(orb.phi) * Math.cos(orb.theta);
        camera.position.z = r * Math.sin(orb.phi) * Math.sin(orb.theta);
        camera.position.y = r * Math.cos(orb.phi);
        camera.lookAt(0, 0, 0);
      } else if (cameraMode === '3d-fpp') {
        const ft = t * 0.10;
        camera.position.set(
          Math.cos(ft) * 2.0,
          0.6 + Math.sin(ft * 0.6) * 0.4,
          Math.sin(ft) * 2.0,
        );
        camera.lookAt(Math.cos(ft + 1.2) * 3, 0, Math.sin(ft + 1.2) * 3);
      } else if (cameraMode === '3d-top') {
        const st = t * 0.03;
        camera.position.set(Math.cos(st) * 0.8, 13, Math.sin(st) * 0.8);
        camera.lookAt(0, 0, 0);
      } else if (cameraMode === '3d-side') {
        const ss = t * 0.05;
        camera.position.set(
          13 + Math.sin(ss) * 2,
          2.5 + Math.sin(ss * 0.8) * 1.2,
          Math.cos(ss) * 2,
        );
        camera.lookAt(0, 0, 0);
      }

      // ── Particles ──────────────────────────────────────────────────────
      const live = new Set<number>();

      state.quanta.forEach((q, idx) => {
        live.add(idx);
        const px = q.x * 5;
        const pz = q.y * 5;
        const py = (q.charge - 0.5) * 3.5 + Math.sin(q.phase * Math.PI * 2 + t) * 0.6;
        const spd = Math.sqrt(q.vx * q.vx + q.vy * q.vy);

        // Color
        let color: THREE.Color;
        if (colorMode === 'charge')   color = chargeColor(q.charge);
        else if (colorMode === 'velocity') color = velColor(spd);
        else color = new THREE.Color(ROLE_COLORS[q.role] ?? '#ffffff');

        // Create mesh
        let mesh = meshesRef.current.get(idx);
        if (!mesh) {
          const geo = new THREE.IcosahedronGeometry(0.11, 1);
          const mat = new THREE.MeshStandardMaterial({
            color, emissive: color, emissiveIntensity: 0.55,
            metalness: 0.25, roughness: 0.38,
          });
          mesh = new THREE.Mesh(geo, mat);
          scene.add(mesh);
          meshesRef.current.set(idx, mesh);
        }

        mesh.position.set(px, py, pz);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(color);
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.4 + q.brightness * 0.9 + q.charge * 0.25 + Math.sin(t * 5 + idx * 0.4) * 0.05;
        const sc = 0.65 + q.charge * 0.85 + spd * 1.5;
        mesh.scale.setScalar(sc);
        mesh.rotation.y = t * 0.55 + q.phase * Math.PI * 2;
        mesh.rotation.x = Math.sin(t * 0.35 + idx * 0.12) * 0.4;

        // ── Trails ───────────────────────────────────────────────────────
        if (showTrails) {
          let hist = trailHistRef.current.get(idx);
          if (!hist) { hist = []; trailHistRef.current.set(idx, hist); }
          hist.push({ x: px, y: py, z: pz });
          if (hist.length > TRAIL_MAX) hist.shift();

          if (hist.length >= 2) {
            const pts = hist.map(p => new THREE.Vector3(p.x, p.y, p.z));
            const geo = new THREE.BufferGeometry().setFromPoints(pts);

            let line = trailLineRef.current.get(idx);
            if (!line) {
              const trailCol = new THREE.Color(ROLE_COLORS[q.role] ?? '#ffffff').multiplyScalar(0.7);
              const lmat = new THREE.LineBasicMaterial({ color: trailCol, transparent: true, opacity: 0.32 });
              line = new THREE.Line(geo, lmat);
              scene.add(line);
              trailLineRef.current.set(idx, line);
            } else {
              line.geometry.dispose();
              line.geometry = geo;
              (line.material as THREE.LineBasicMaterial).color.copy(color).multiplyScalar(0.65);
              (line.material as THREE.LineBasicMaterial).opacity = 0.22 + q.charge * 0.2;
            }
          }
        }
      });

      // ── Cleanup removed particles ───────────────────────────────────────
      meshesRef.current.forEach((mesh, idx) => {
        if (!live.has(idx)) {
          scene.remove(mesh); mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          meshesRef.current.delete(idx);
        }
      });
      trailLineRef.current.forEach((line, idx) => {
        if (!live.has(idx) || !showTrails) {
          scene.remove(line); line.geometry.dispose();
          (line.material as THREE.Material).dispose();
          trailLineRef.current.delete(idx);
          trailHistRef.current.delete(idx);
        }
      });

      renderer.render(scene, camera);
    };

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [state, cameraMode, paused, showTrails, colorMode]);

  // ── Mouse orbital drag ─────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = true;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - lastPtRef.current.x;
    const dy = e.clientY - lastPtRef.current.y;
    orbRef.current.theta -= dx * 0.006;
    orbRef.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbRef.current.phi + dy * 0.006));
    lastPtRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseUp = useCallback(() => { dragRef.current = false; }, []);
  const onWheel   = useCallback((e: React.WheelEvent) => {
    orbRef.current.r = Math.max(2.5, Math.min(28, orbRef.current.r + e.deltaY * 0.012));
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height, position: 'relative', overflow: 'hidden', cursor: dragRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    />
  );
};

export default Music3DRenderer;
