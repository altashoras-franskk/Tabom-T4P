// Camera state (for future zoom/pan)
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const createCamera = (): Camera => ({
  x: 0,
  y: 0,
  zoom: 1,
});

export const screenToWorld = (
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  camera: Camera
): [number, number] => {
  const aspect = width / height;
  const worldX = ((screenX / width) * 2 - 1) * aspect;
  const worldY = ((screenY / height) * 2 - 1) * -1;
  return [worldX + camera.x, worldY + camera.y];
};
