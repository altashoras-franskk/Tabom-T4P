// ── Asimov Theater — Lesson Presets (Scenario Library) ───────────────────────
import React, { useState } from 'react';
import { BookOpen, Play, X, ChevronRight } from 'lucide-react';
import { LESSON_PRESETS, LessonPreset } from '../../sim/asimov/asimovLessons';

interface LessonPresetsProps {
  onSelect: (lesson: LessonPreset) => void;
  onClose: () => void;
}

export const LessonPresetsPanel: React.FC<LessonPresetsProps> = ({ onSelect, onClose }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(7,7,18,0.92)',
      backdropFilter: 'blur(12px)',
      zIndex: 50,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <BookOpen size={14} strokeWidth={1.5} color="rgba(255,255,255,0.6)" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
          Scenarios
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
          {LESSON_PRESETS.length} cenarios
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, alignContent: 'start',
      }}>
        {LESSON_PRESETS.map(lesson => {
          const isHovered = hovered === lesson.id;
          return (
            <div
              key={lesson.id}
              onMouseEnter={() => setHovered(lesson.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(lesson)}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                background: isHovered ? `${lesson.color}12` : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isHovered ? lesson.color + '44' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              {/* Name + color dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: lesson.color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 10.5, color: isHovered ? lesson.color : 'rgba(255,255,255,0.8)',
                  lineHeight: 1.2,
                }}>
                  {lesson.name}
                </span>
                {isHovered && (
                  <ChevronRight size={10} color={lesson.color} style={{ marginLeft: 'auto' }} />
                )}
              </div>

              {/* Description */}
              <div style={{
                fontSize: 9, color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.3,
              }}>
                {lesson.description}
              </div>

              {/* Expected arc */}
              <div style={{
                fontSize: 8.5, color: 'rgba(255,255,255,0.3)',
                fontStyle: 'italic', lineHeight: 1.25,
              }}>
                {lesson.expectedArc}
              </div>

              {/* Focus metrics chips */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {lesson.focusMetrics.map(m => (
                  <span key={m} style={{
                    fontSize: 7.5, padding: '1px 4px', borderRadius: 2,
                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {m}
                  </span>
                ))}
                {lesson.suggestedActs && (
                  <span style={{
                    fontSize: 7.5, padding: '1px 4px', borderRadius: 2,
                    background: 'rgba(255,206,90,0.08)', color: 'rgba(255,206,90,0.5)',
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}>
                    <Play size={7} strokeWidth={1.5} />
                    auto-play
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 9, color: 'rgba(255,255,255,0.25)',
      }}>
        Selecione um cenario. Voce pode brincar livremente apos iniciar.
      </div>
    </div>
  );
};
