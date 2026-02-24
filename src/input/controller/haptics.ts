// ─── Haptics helpers ─────────────────────────────────────────────────────────
import { getControllerManager } from './ControllerInputManager';

export function rumble(intensity: number, durationMs: number, balance = 0.5): void {
  getControllerManager().rumble(intensity, durationMs, balance, 1 - balance);
}

// Semantic presets
export const haptics = {
  /** Short click — tool/preset change */
  click:     () => rumble(0.18, 45, 0.5),
  /** Quick tap — snapshot/pin */
  tap:       () => rumble(0.35, 80, 0.4),
  /** Soft continuous stroke (RT held) */
  stroke:    (intensity: number) => rumble(intensity * 0.25, 40, 0.6),
  /** Event: crystallization, phase change */
  pulse:     () => rumble(0.45, 100, 0.3),
  /** Musical kick */
  kick:      () => rumble(0.6,  55, 0.8),
  /** Musical snare */
  snare:     () => rumble(0.3,  35, 0.2),
  /** Harmony formed */
  harmonyPulse: () => { rumble(0.3, 50, 0.5); setTimeout(() => rumble(0.2, 40, 0.5), 90); },
};
