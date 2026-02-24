// Sistema de Pings de Sigils: símbolos discretos que aparecem quando arquétipos emergem
export type SigilPing = {
  id: number;
  x: number; // -1 a 1 (coordenadas mundo)
  y: number; // -1 a 1
  sigil: string; // símbolo unicode
  color: string; // cor RGB
  name: string; // nome do arquétipo
  spawnTime: number; // tempo de criação
  lifetime: number; // duração total em segundos
  intensity: number; // 0-1, para fade out
};

export type SigilPingSystem = {
  pings: SigilPing[];
  nextId: number;
};

export function createSigilPingSystem(): SigilPingSystem {
  return {
    pings: [],
    nextId: 0,
  };
}

export function addSigilPing(
  system: SigilPingSystem,
  x: number,
  y: number,
  sigil: string,
  color: string,
  name: string,
  lifetime: number = 5.0 // 5 segundos por padrão
): void {
  system.pings.push({
    id: system.nextId++,
    x,
    y,
    sigil,
    color,
    name,
    spawnTime: Date.now() / 1000,
    lifetime,
    intensity: 1.0,
  });
}

export function updateSigilPings(system: SigilPingSystem, _currentTime: number): void {
  // Use wall-clock time (Date.now/1000) to match spawnTime — simulation elapsed
  // time and wall-clock epoch are NOT the same base and cannot be compared.
  const now = Date.now() / 1000;
  for (let i = system.pings.length - 1; i >= 0; i--) {
    const ping = system.pings[i];
    const elapsed = now - ping.spawnTime;

    if (elapsed >= ping.lifetime) {
      system.pings.splice(i, 1);
    } else {
      // Fade out suave no último 30% da vida
      const fadeStart = ping.lifetime * 0.7;
      if (elapsed > fadeStart) {
        const fadeProgress = (elapsed - fadeStart) / (ping.lifetime - fadeStart);
        ping.intensity = 1.0 - fadeProgress;
      }
    }
  }

  // Limita número máximo de pings
  if (system.pings.length > 50) {
    system.pings.shift();
  }
}

export function clearSigilPings(system: SigilPingSystem): void {
  system.pings = [];
}

// Cores bonitas para tipos de arquétipos
export const ARCHETYPE_COLORS = {
  bond: '#ffaa00',    // laranja (coesão)
  rift: '#aa00ff',    // roxo (conflito)
  bloom: '#00ffaa',   // ciano (crescimento)
  oath: '#aaff00',    // amarelo-verde (ritual)
  storm: '#ff4444',   // vermelho (caos)
  default: '#88ccff', // azul claro (padrão)
};

// Determina cor baseada nas notas do arquétipo
export function getArchetypeColor(notes: string[]): string {
  if (notes.includes('coesivo')) return ARCHETYPE_COLORS.bond;
  if (notes.includes('filho-da-tempestade')) return ARCHETYPE_COLORS.storm;
  if (notes.includes('nascido-da-escassez')) return ARCHETYPE_COLORS.bloom;
  return ARCHETYPE_COLORS.default;
}