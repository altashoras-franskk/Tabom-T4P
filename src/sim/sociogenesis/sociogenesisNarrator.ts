// Sociogenesis Narrator
// Generates short chronicle entries for symbolic events

import type { SocioChronicleEntry } from './sociogenesisTypes';

type EventKind =
  | 'TOTEM_FOUNDED'
  | 'TOTEM_EMERGED'
  | 'TOTEM_REMOVED'
  | 'TABOO_DECLARED'
  | 'TABOO_EMERGED'
  | 'TABOO_REMOVED'
  | 'RITUAL_STARTED'
  | 'RITUAL_EMERGED'
  | 'RITUAL_ENDED'
  | 'TRANSGRESSION'
  | 'JUDGMENT'
  | 'SCHISM';

const TEMPLATES: Record<EventKind, { icon: string; template: string; cause: string; consequence: string }> = {
  TOTEM_FOUNDED: {
    icon: '\u2295',
    template: 'TOTEM FOUNDED: {kind} "{name}"',
    cause: 'Placed by the observer',
    consequence: 'Local field bias active',
  },
  TOTEM_EMERGED: {
    icon: '\u2728',
    template: '✨ TOTEM EMERGED: {kind} "{name}"',
    cause: 'Spontaneous crystallization from particle behavior',
    consequence: 'Self-organized field bias now active',
  },
  TOTEM_REMOVED: {
    icon: '\u2716',
    template: 'TOTEM REMOVED: "{name}"',
    cause: 'Banished by the observer',
    consequence: 'Field influence dissolved',
  },
  TABOO_DECLARED: {
    icon: '\u26D4',
    template: 'TABOO DECLARED: {kind} zone',
    cause: 'Zone marked forbidden',
    consequence: 'Boundary enforced',
  },
  TABOO_EMERGED: {
    icon: '\u26A1',
    template: '⚡ TABOO EMERGED: {kind} boundary',
    cause: 'Collective avoidance pattern detected',
    consequence: 'Self-organized restriction now enforced',
  },
  TABOO_REMOVED: {
    icon: '\u2205',
    template: 'TABOO LIFTED: zone dissolved',
    cause: 'Restriction removed',
    consequence: 'Area now open',
  },
  RITUAL_STARTED: {
    icon: '\u2609',
    template: 'RITUAL STARTED: {kind} at "{totemName}"',
    cause: 'Ritual bound to totem',
    consequence: 'Periodic gathering active',
  },
  RITUAL_EMERGED: {
    icon: '\u2734',
    template: '✴️ RITUAL EMERGED: {kind} at "{totemName}"',
    cause: 'Recurring motion pattern detected',
    consequence: 'Self-organized ceremony now active',
  },
  RITUAL_ENDED: {
    icon: '\u2205',
    template: 'RITUAL ENDED at totem',
    cause: 'Ritual dissolved',
    consequence: 'Periodic effect ceased',
  },
  TRANSGRESSION: {
    icon: '\u26A0',
    template: 'TRANSGRESSION: {tabooKind} taboo violated',
    cause: 'Particles crossed forbidden boundary',
    consequence: 'Case opened for judgment',
  },
  JUDGMENT: {
    icon: '\u2696',
    template: 'JUDGMENT: {resolution}',
    cause: 'Case {caseId} resolved',
    consequence: '{resolution} applied to violators',
  },
  SCHISM: {
    icon: '\u2694',
    template: 'SCHISM: tribe split detected',
    cause: 'Divergent ethos',
    consequence: 'New faction emerged',
  },
};

export function narrateEvent(
  kind: EventKind,
  params: Record<string, string> = {},
  elapsedSec?: number,
): SocioChronicleEntry {
  const tmpl = TEMPLATES[kind];
  const fill = (s: string) =>
    s.replace(/\{(\w+)\}/g, (_, key) => params[key] || '?');

  return {
    time: elapsedSec ?? Date.now() / 1000,
    icon: tmpl.icon,
    message: fill(tmpl.template),
    cause: fill(tmpl.cause),
    consequence: fill(tmpl.consequence),
  };
}

// Name generators for totems
const TOTEM_NAMES = {
  BOND: ['Hearth', 'Nexus', 'Anchor', 'Haven', 'Beacon', 'Cradle', 'Font', 'Root'],
  RIFT: ['Rift', 'Schism', 'Void', 'Breach', 'Divide', 'Fracture', 'Scar', 'Edge'],
  ORACLE: ['Oracle', 'Whisper', 'Flux', 'Tremor', 'Pulse', 'Spark', 'Echo', 'Haze'],
  ARCHIVE: ['Archive', 'Memory', 'Codex', 'Record', 'Ledger', 'Stone', 'Tablet', 'Trace'],
};

let nameCounter = 0;

export function generateTotemName(kind: string): string {
  const names = TOTEM_NAMES[kind as keyof typeof TOTEM_NAMES] || TOTEM_NAMES.BOND;
  const name = names[nameCounter % names.length];
  nameCounter++;
  return `${name}-${String(nameCounter).padStart(2, '0')}`;
}