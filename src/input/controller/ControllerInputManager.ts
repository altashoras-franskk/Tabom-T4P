// ─── Controller Input Manager — singleton Gamepad poller ─────────────────────
import type { ControllerFrameState, ControllerButtons } from './types';

const DEADZONE   = 0.12;
const SMOOTH     = 0.72;   // lerp factor for stick smoothing

function applyDeadzone(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE);
}

function emptyButtons(): ControllerButtons {
  return { a:false, b:false, x:false, y:false, lb:false, rb:false, start:false, select:false,
           dpadUp:false, dpadDown:false, dpadLeft:false, dpadRight:false, l3:false, r3:false };
}

function emptyState(): ControllerFrameState {
  return { connected: false, name: '', axes: { lx:0, ly:0, rx:0, ry:0 },
           triggers: { lt:0, rt:0 }, buttons: emptyButtons(),
           justPressed: emptyButtons(), justReleased: emptyButtons() };
}

// Button-index → key in ControllerButtons (standard mapping)
const BTN_MAP: [number, keyof ControllerButtons][] = [
  [0,'a'], [1,'b'], [2,'x'], [3,'y'],
  [4,'lb'], [5,'rb'],
  [8,'select'], [9,'start'],
  [10,'l3'], [11,'r3'],
  [12,'dpadUp'], [13,'dpadDown'], [14,'dpadLeft'], [15,'dpadRight'],
];

class ControllerInputManager {
  private padIndex = -1;
  private prevButtons: Partial<Record<keyof ControllerButtons, boolean>> = {};
  private _state: ControllerFrameState = emptyState();
  private smoothLx = 0; private smoothLy = 0;
  private smoothRx = 0; private smoothRy = 0;

  // Dpad repeat state
  private repeatTimers: Partial<Record<keyof ControllerButtons, number>> = {};
  private REPEAT_INITIAL = 400;
  private REPEAT_RATE    = 160;

  // Haptics budget: max N rumbles per second
  private hapticCount = 0;
  private hapticResetTime = 0;
  private HAPTIC_BUDGET = 10;

  poll(now = performance.now()): ControllerFrameState {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;

    // Prefer last known pad, fallback to first connected
    if (this.padIndex >= 0) pad = pads[this.padIndex] ?? null;
    if (!pad || !pad.connected) {
      this.padIndex = -1;
      for (const p of pads) {
        if (p && p.connected) { pad = p; this.padIndex = p.index; break; }
      }
    }

    if (!pad || !pad.connected) {
      this._state = emptyState();
      return this._state;
    }

    // Smooth sticks
    const rawLx = applyDeadzone(pad.axes[0] ?? 0);
    const rawLy = applyDeadzone(pad.axes[1] ?? 0);
    const rawRx = applyDeadzone(pad.axes[2] ?? 0);
    const rawRy = applyDeadzone(pad.axes[3] ?? 0);

    this.smoothLx = this.smoothLx * SMOOTH + rawLx * (1 - SMOOTH);
    this.smoothLy = this.smoothLy * SMOOTH + rawLy * (1 - SMOOTH);
    this.smoothRx = this.smoothRx * SMOOTH + rawRx * (1 - SMOOTH);
    this.smoothRy = this.smoothRy * SMOOTH + rawRy * (1 - SMOOTH);

    const btn  = (i: number): boolean => !!(pad!.buttons[i]?.pressed);
    const btnV = (i: number): number  => pad!.buttons[i]?.value ?? 0;

    const buttons = emptyButtons();
    for (const [idx, key] of BTN_MAP) buttons[key] = btn(idx);

    // Triggers (may be axes or buttons depending on driver)
    const lt = Math.max(btnV(6), pad.axes[4] !== undefined ? (pad.axes[4] + 1) / 2 : 0);
    const rt = Math.max(btnV(7), pad.axes[5] !== undefined ? (pad.axes[5] + 1) / 2 : 0);

    const justPressed  = emptyButtons();
    const justReleased = emptyButtons();

    for (const [, key] of BTN_MAP) {
      const cur  = buttons[key];
      const prev = this.prevButtons[key] ?? false;
      justPressed[key]  = cur  && !prev;
      justReleased[key] = !cur && prev;
      this.prevButtons[key] = cur;
    }

    this._state = {
      connected: true, name: pad.id,
      axes: { lx: this.smoothLx, ly: this.smoothLy, rx: this.smoothRx, ry: this.smoothRy },
      triggers: { lt, rt },
      buttons, justPressed, justReleased,
    };

    return this._state;
  }

  get current(): ControllerFrameState { return this._state; }

  /** Haptics with budget limiting */
  rumble(intensity: number, durationMs: number, leftBalance = 0.5, rightBalance = 0.5): void {
    const now = performance.now();
    if (now - this.hapticResetTime > 1000) { this.hapticCount = 0; this.hapticResetTime = now; }
    if (this.hapticCount >= this.HAPTIC_BUDGET) return;
    this.hapticCount++;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad  = this.padIndex >= 0 ? pads[this.padIndex] : null;
    if (!pad) return;
    const actuator = (pad as unknown as { vibrationActuator?: { playEffect: (t: string, o: object) => void } }).vibrationActuator;
    if (!actuator) return;
    try {
      actuator.playEffect('dual-rumble', {
        startDelay: 0, duration: durationMs,
        weakMagnitude:   rightBalance * intensity,
        strongMagnitude: leftBalance  * intensity,
      });
    } catch { /* unsupported */ }
  }
}

// ── Module singleton ─────────────────────────────────────────────────────────
let _manager: ControllerInputManager | null = null;

export function getControllerManager(): ControllerInputManager {
  if (!_manager) _manager = new ControllerInputManager();
  return _manager;
}
