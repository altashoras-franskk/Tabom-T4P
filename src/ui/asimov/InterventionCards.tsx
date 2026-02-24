// ── Asimov Theater — Intervention Cards Strip ─────────────────────────────────
import React from 'react';
import { INTERVENTION_CARDS } from '../../sim/asimov/asimovInterventions';
import { ActiveIntervention, InterventionCardDef } from '../../sim/asimov/asimovTypes';

interface InterventionCardsProps {
  cardCooldowns: Record<string, number>;  // cardId → absolute t when ready
  activeInterventions: ActiveIntervention[];
  currentT: number;
  onApply: (cardId: string) => void;
}

export const InterventionCards: React.FC<InterventionCardsProps> = ({
  cardCooldowns,
  activeInterventions,
  currentT,
  onApply,
}) => {
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '6px 10px',
      overflowX: 'auto', alignItems: 'flex-start',
    }}>
      {INTERVENTION_CARDS.map(card => {
        const readyAt = cardCooldowns[card.id] ?? 0;
        const onCooldown = currentT < readyAt;
        const remainCd = Math.max(0, readyAt - currentT);
        const isActive = activeInterventions.some(a => a.cardId === card.id);
        const activeInter = activeInterventions.find(a => a.cardId === card.id);
        const progress = activeInter
          ? 1 - (activeInter.endT - currentT) / (activeInter.endT - activeInter.startT)
          : 0;

        return (
          <CardView
            key={card.id}
            card={card}
            onCooldown={onCooldown}
            remainCooldown={remainCd}
            isActive={isActive}
            activeProgress={progress}
            onApply={() => onApply(card.id)}
          />
        );
      })}
    </div>
  );
};

// ── Single Card View ──────────────────────────────────────────────────────
interface CardViewProps {
  card: InterventionCardDef;
  onCooldown: boolean;
  remainCooldown: number;
  isActive: boolean;
  activeProgress: number;
  onApply: () => void;
}

function CardView({ card, onCooldown, remainCooldown, isActive, activeProgress, onApply }: CardViewProps) {
  const canApply = !onCooldown && !isActive;
  const col = card.color;

  return (
    <div
      onClick={canApply ? onApply : undefined}
      title={card.description}
      style={{
        flexShrink: 0,
        width: 110,
        padding: '7px 8px',
        borderRadius: 6,
        cursor: canApply ? 'pointer' : 'default',
        background: isActive
          ? `${col}18`
          : onCooldown
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive
          ? col + '55'
          : onCooldown
            ? 'rgba(255,255,255,0.05)'
            : col + '33'}`,
        opacity: onCooldown && !isActive ? 0.45 : 1,
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Active progress fill */}
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: `${activeProgress * 100}%`, height: 2,
          background: col, borderRadius: '0 0 6px 6px',
          transition: 'width 0.5s',
        }} />
      )}

      {/* Name */}
      <div style={{
        fontSize: 10, color: isActive ? col : 'rgba(255,255,255,0.8)',
        marginBottom: 3, lineHeight: 1.2,
      }}>
        {card.name}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 8.5, color: 'rgba(255,255,255,0.4)',
        lineHeight: 1.25, marginBottom: 5,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {card.description}
      </div>

      {/* Status */}
      {isActive ? (
        <div style={{ fontSize: 8, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ativo {Math.round(activeProgress * 100)}%
        </div>
      ) : onCooldown ? (
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cd: {remainCooldown.toFixed(0)}s
        </div>
      ) : (
        <div style={{
          fontSize: 8, color: col, textTransform: 'uppercase',
          letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Aplicar</span>
          <span style={{ opacity: 0.6 }}>-{Math.round(card.cost * 100)}R</span>
        </div>
      )}
    </div>
  );
}