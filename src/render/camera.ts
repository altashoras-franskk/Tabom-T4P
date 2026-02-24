/**
 * Camera utilities for zoom and pan
 */

import { CameraState } from './webgl-renderer';

export interface ZoomConfig {
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
}

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.3,
  maxZoom: 5.0,
  zoomSpeed: 0.001,
};

/**
 * Apply zoom at a specific point (usually mouse position)
 */
export function zoomAt(
  camera: CameraState,
  worldX: number,
  worldY: number,
  delta: number,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG
): CameraState {
  const oldZoom = camera.zoom;
  
  // Calculate new zoom level
  let newZoom = oldZoom * (1 - delta * config.zoomSpeed);
  newZoom = Math.max(config.minZoom, Math.min(config.maxZoom, newZoom));
  
  // If zoom didn't change, return original camera
  if (newZoom === oldZoom) {
    return camera;
  }
  
  // Calculate the zoom ratio
  const zoomRatio = newZoom / oldZoom;
  
  // Adjust camera position to zoom towards the point
  const newCameraX = worldX - (worldX - camera.x) * zoomRatio;
  const newCameraY = worldY - (worldY - camera.y) * zoomRatio;
  
  return {
    x: newCameraX,
    y: newCameraY,
    zoom: newZoom,
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorldCoords(
  screenX: number,
  screenY: number,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: camera.x + screenX / camera.zoom,
    y: camera.y + screenY / camera.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreenCoords(
  worldX: number,
  worldY: number,
  camera: CameraState
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom,
    y: (worldY - camera.y) * camera.zoom,
  };
}

/**
 * Reset camera to default view (centered, zoom 1.0)
 */
export function resetCamera(canvasWidth: number, canvasHeight: number): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: 1.0,
  };
}

/**
 * Pan camera by screen-space delta
 */
export function panCamera(
  camera: CameraState,
  screenDeltaX: number,
  screenDeltaY: number
): CameraState {
  return {
    x: camera.x - screenDeltaX / camera.zoom,
    y: camera.y - screenDeltaY / camera.zoom,
    zoom: camera.zoom,
  };
}
