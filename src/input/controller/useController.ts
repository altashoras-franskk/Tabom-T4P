// ─── useController — React hook for gamepad integration ──────────────────────
import { useEffect, useRef, useState } from 'react';
import { getControllerManager } from './ControllerInputManager';
import type { ControllerFrameState, InputMode } from './types';

export interface ControllerStatus {
  connected: boolean;
  name: string;
  inputMode: InputMode;
}

/**
 * Provides connection status and exposes the ControllerInputManager for
 * polling inside the component's own RAF loop.
 */
export function useController() {
  const manager = getControllerManager();

  const [status, setStatus] = useState<ControllerStatus>({
    connected: false, name: '', inputMode: 'auto',
  });
  const inputModeRef = useRef<InputMode>('auto');

  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      setStatus(prev => ({ ...prev, connected: true, name: e.gamepad.id.slice(0, 40) }));
    };
    const onDisconnect = () => {
      setStatus(prev => ({ ...prev, connected: false, name: '' }));
    };
    window.addEventListener('gamepadconnected',    onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected',    onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  const setInputMode = (mode: InputMode) => {
    inputModeRef.current = mode;
    setStatus(prev => ({ ...prev, inputMode: mode }));
  };

  return { manager, status, inputModeRef, setInputMode };
}

/** Determine if controller should act (based on inputMode + connection) */
export function shouldUseController(
  state: ControllerFrameState,
  mode: InputMode,
): boolean {
  if (mode === 'mouse')      return false;
  if (mode === 'controller') return state.connected;
  // 'auto': activate when there's any stick/trigger input
  return state.connected && (
    Math.abs(state.axes.lx) > 0.05 || Math.abs(state.axes.ly) > 0.05 ||
    state.triggers.rt > 0.05 || state.triggers.lt > 0.05 ||
    Object.values(state.buttons).some(Boolean)
  );
}
