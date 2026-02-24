// ── useZoomPan — zoom + pan state for canvas labs ─────────────────────────────
import { useRef, useState, useCallback } from 'react';

export interface ZoomPanRefs {
  zoomRef: React.MutableRefObject<number>;
  panXRef: React.MutableRefObject<number>;
  panYRef: React.MutableRefObject<number>;
}

export function useZoomPan(opts?: { min?: number; max?: number }) {
  const MIN = opts?.min ?? 0.15;
  const MAX = opts?.max ?? 10;

  // State for rendering UI (ZoomControls display)
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Refs for RAF-loop access (no re-render lag)
  const zoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  // Pan tracking
  const isPanning     = useRef(false);
  const panStart      = useRef({ cx: 0, cy: 0, px: 0, py: 0 });

  // ── Apply a new zoom+pan atomically ───────────────────────────────────────
  const applyView = useCallback((nz: number, npx: number, npy: number) => {
    zoomRef.current = nz;
    panXRef.current = npx;
    panYRef.current = npy;
    setZoom(nz);
    setPanX(npx);
    setPanY(npy);
  }, []);

  // ── Wheel zoom (centered on cursor position) ───────────────────────────────
  const handleWheel = useCallback((e: WheelEvent, canvas: HTMLCanvasElement) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const W = rect.width, H = rect.height;

    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nz  = Math.max(MIN, Math.min(MAX, zoomRef.current * factor));

    // Keep the world point under the cursor fixed
    const npx = mx - W / 2 - (mx - W / 2 - panXRef.current) * nz / zoomRef.current;
    const npy = my - H / 2 - (my - H / 2 - panYRef.current) * nz / zoomRef.current;
    applyView(nz, npx, npy);
  }, [MIN, MAX, applyView]);

  // ── Middle-mouse / Alt+drag pan ────────────────────────────────────────────
  const handlePanStart = useCallback((e: React.MouseEvent | MouseEvent): boolean => {
    const isMid = e.button === 1;
    const isAlt = e.button === 0 && e.altKey;
    if (!isMid && !isAlt) return false;
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { cx: e.clientX, cy: e.clientY, px: panXRef.current, py: panYRef.current };
    return true;
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent | MouseEvent): boolean => {
    if (!isPanning.current) return false;
    const npx = panStart.current.px + (e.clientX - panStart.current.cx);
    const npy = panStart.current.py + (e.clientY - panStart.current.cy);
    panXRef.current = npx;
    panYRef.current = npy;
    setPanX(npx);
    setPanY(npy);
    return true;
  }, []);

  const handlePanEnd = useCallback((e?: React.MouseEvent | MouseEvent) => {
    if (e && e.button === 1) isPanning.current = false;
    else if (!e) isPanning.current = false;
    else if (e.button === 0) isPanning.current = false;
  }, []);

  // ── Programmatic controls ──────────────────────────────────────────────────
  const resetView = useCallback(() => applyView(1, 0, 0), [applyView]);

  const zoomIn = useCallback(() => {
    const nz = Math.min(MAX, zoomRef.current * 1.25);
    applyView(nz, panXRef.current, panYRef.current);
  }, [MAX, applyView]);

  const zoomOut = useCallback(() => {
    const nz = Math.max(MIN, zoomRef.current / 1.25);
    applyView(nz, panXRef.current, panYRef.current);
  }, [MIN, applyView]);

  return {
    zoom, panX, panY,
    zoomRef, panXRef, panYRef,
    isPanning,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetView,
    zoomIn,
    zoomOut,
  };
}

// ── Coordinate helpers (exported for lab components) ──────────────────────────

/** Music Lab: world coords [-1,1] inverse transform */
export function screenToWorldMusic(
  clientX: number, clientY: number,
  rect: DOMRect,
  zoom: number, panX: number, panY: number,
): [number, number] {
  const lx = clientX - rect.left;
  const ly = clientY - rect.top;
  const W = rect.width, H = rect.height;
  return [
    (lx - W / 2 - panX) / (zoom * W / 2),
    (ly - H / 2 - panY) / (zoom * H / 2),
  ];
}

/** Alchemy Lab: world coords [0,1] inverse transform */
export function screenToWorldAlchemy(
  clientX: number, clientY: number,
  rect: DOMRect,
  zoom: number, panX: number, panY: number,
): [number, number] {
  const lx = clientX - rect.left;
  const ly = clientY - rect.top;
  const W = rect.width, H = rect.height;
  return [
    (lx - W / 2 - panX) / (zoom * W) + 0.5,
    (ly - H / 2 - panY) / (zoom * H) + 0.5,
  ];
}

/** Apply zoom/pan canvas transform (call AFTER drawing background) */
export function applyZoomTransform(
  c: CanvasRenderingContext2D,
  W: number, H: number,
  zoom: number, panX: number, panY: number,
): void {
  c.translate(W / 2 + panX, H / 2 + panY);
  c.scale(zoom, zoom);
  c.translate(-W / 2, -H / 2);
}
