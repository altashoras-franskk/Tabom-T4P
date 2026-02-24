// ─── Quick Menu — controller-friendly overlay ────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import type { ControllerFrameState } from './types';

interface QuickMenuSection<T> {
  label: string;
  items: T[];
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
}

interface Props<P, T> {
  open: boolean;
  onClose: () => void;
  ctrl: ControllerFrameState;
  presetsSection: QuickMenuSection<P>;
  toolsSection: QuickMenuSection<T>;
}

type AnySection = QuickMenuSection<unknown>;

export function QuickMenu<P, T>({ open, onClose, ctrl, presetsSection, toolsSection }: Props<P, T>) {
  const sections: AnySection[] = [
    presetsSection as AnySection,
    toolsSection as AnySection,
  ];
  const [col, setCol] = useState(0);
  const [row, setRow] = useState(0);
  const prevButtons = useRef({ dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false, a: false, b: false, start: false });

  useEffect(() => {
    if (!open) return;
    setRow(0);
    setCol(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = prevButtons.current;
    const btn = ctrl.buttons;

    if (btn.dpadUp    && !prev.dpadUp)    setRow(r => Math.max(0, r - 1));
    if (btn.dpadDown  && !prev.dpadDown)  setRow(r => Math.min((sections[col]?.items.length ?? 1) - 1, r + 1));
    if (btn.dpadLeft  && !prev.dpadLeft)  { setCol(c => Math.max(0, c - 1)); setRow(0); }
    if (btn.dpadRight && !prev.dpadRight) { setCol(c => Math.min(sections.length - 1, c + 1)); setRow(0); }
    if (btn.a && !prev.a) {
      const sec = sections[col];
      if (sec) { sec.onSelect(sec.items[row]); onClose(); }
    }
    if ((btn.b && !prev.b) || (btn.start && !prev.start)) onClose();

    prevButtons.current = { dpadUp: btn.dpadUp, dpadDown: btn.dpadDown, dpadLeft: btn.dpadLeft, dpadRight: btn.dpadRight, a: btn.a, b: btn.b, start: btn.start };
  }, [ctrl, open]); // eslint-disable-line

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(4,6,12,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{ display: 'flex', gap: 32, maxHeight: '80vh' }}>
        {sections.map((sec, ci) => (
          <div key={ci} style={{
            minWidth: 180,
            background: col === ci ? 'rgba(255,255,255,0.04)' : 'transparent',
            borderRadius: 8, padding: '14px 8px',
            border: col === ci ? '1px solid rgba(80,230,140,0.25)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 9, color: col === ci ? 'rgba(80,230,140,0.8)' : 'rgba(255,255,255,0.3)',
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 8 }}>
              {sec.label}
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '65vh' }}>
              {sec.items.map((item, ri) => {
                const active = ci === col && ri === row;
                return (
                  <div key={ri}
                    onClick={() => { sec.onSelect(item); onClose(); }}
                    style={{
                      padding: '7px 10px', cursor: 'pointer', borderRadius: 5,
                      background: active ? 'rgba(80,230,140,0.15)' : 'transparent',
                      color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                      fontSize: 11, letterSpacing: '0.04em',
                      borderLeft: active ? '2px solid rgba(80,230,140,0.6)' : '2px solid transparent',
                      transition: 'all 0.1s',
                    }}>
                    {sec.getLabel(item)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Hint bar */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 20,
      }}>
        {[['D ◄ ►', 'coluna'], ['D ▲ ▼', 'item'], ['A', 'selecionar'], ['B / START', 'fechar']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(200,180,100,0.8)', fontFamily: 'monospace' }}>{k}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
