// ─── Meta-Arte: Layer Stack ────────────────────────────────────────────────
import type { LayerState, LayerId, BlendMode } from './metaArtTypes';

export const LAYER_DEFS: { id: LayerId; name: string; blendMode: BlendMode; opacity: number }[] = [
  { id: 'trail',       name: 'Rastro',    blendMode: 'normal', opacity: 1.0  }, // primary painting
  { id: 'particles',   name: 'Quanta',    blendMode: 'normal', opacity: 0.18 }, // subtle hint of agents
  { id: 'connections', name: 'Conexoes',  blendMode: 'normal', opacity: 0.60 },
  { id: 'glow',        name: 'Brilho',    blendMode: 'normal', opacity: 0.18 }, // very subtle
  { id: 'post',        name: 'Post/FX',   blendMode: 'normal', opacity: 0.0  }, // off — causes grey haze
  { id: 'brush',       name: 'Pinceis',   blendMode: 'normal', opacity: 1.0  }, // always on top
];

export function createLayerStack(W: number, H: number): LayerState[] {
  return LAYER_DEFS.map(def => {
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    return { ...def, canvas, visible: true, locked: false };
  });
}

export function getLayer(layers: LayerState[], id: LayerId): LayerState | undefined {
  return layers.find(l => l.id === id);
}

export function clearLayer(layer: LayerState): void {
  if (!layer.canvas) return;
  const ctx = layer.canvas.getContext('2d')!;
  ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
}

export function compositeLayersToMain(
  mainCtx: CanvasRenderingContext2D,
  layers: LayerState[],
  background: string,
  W: number, H: number,
): void {
  mainCtx.save();
  mainCtx.globalAlpha = 1;
  mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.fillStyle = background;
  mainCtx.fillRect(0, 0, W, H);

  for (const layer of layers) {
    if (!layer.visible || !layer.canvas || layer.opacity <= 0) continue;
    mainCtx.globalAlpha = layer.opacity;
    mainCtx.globalCompositeOperation = blendModeToComposite(layer.blendMode);
    mainCtx.drawImage(layer.canvas, 0, 0);
  }

  mainCtx.globalAlpha = 1;
  mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.restore();
}

function blendModeToComposite(bm: BlendMode): GlobalCompositeOperation {
  switch (bm) {
    case 'add':      return 'lighter';
    case 'multiply': return 'multiply';
    case 'screen':   return 'screen';
    case 'overlay':  return 'overlay';
    default:         return 'source-over';
  }
}