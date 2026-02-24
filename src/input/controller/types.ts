// ─── Controller Input: Types ──────────────────────────────────────────────────

export type InputMode = 'mouse' | 'controller' | 'auto';

export interface ControllerAxes {
  lx: number; ly: number;   // left stick (-1..1)
  rx: number; ry: number;   // right stick (-1..1)
}

export interface ControllerTriggers {
  lt: number;  // left trigger  0..1
  rt: number;  // right trigger 0..1
}

export interface ControllerButtons {
  a: boolean; b: boolean; x: boolean; y: boolean;
  lb: boolean; rb: boolean;
  start: boolean; select: boolean;
  dpadUp: boolean; dpadDown: boolean; dpadLeft: boolean; dpadRight: boolean;
  l3: boolean; r3: boolean;
}

export interface ControllerFrameState {
  connected: boolean;
  name: string;
  axes: ControllerAxes;
  triggers: ControllerTriggers;
  buttons: ControllerButtons;
  justPressed: ControllerButtons;
  justReleased: ControllerButtons;
}

export interface ControllerCursorState {
  x: number;  // 0..1 normalized
  y: number;  // 0..1 normalized
}
