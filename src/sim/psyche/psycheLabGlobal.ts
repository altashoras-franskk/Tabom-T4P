// ── Psyche Lab Global State Accessor ─────────────────────────────────────────
// Allows App.tsx 3D renderer to read PsycheState without prop-drilling.
// Non-destructive: only a reference, never modified here.

import { PsycheState } from './psycheTypes';

let _state: PsycheState | null = null;

export function registerPsycheState(s: PsycheState): void  { _state = s; }
export function unregisterPsycheState(): void              { _state = null; }
export function getPsycheState(): PsycheState | null       { return _state; }
