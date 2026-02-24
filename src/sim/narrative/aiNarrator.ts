// AI Narrator - Interprets simulation events and creates narrative
// This system adds meaning and gamification to raw simulation data

import { WorldEvent } from '../../story/worldLog';
import { Beat } from '../../story/beats';
import { DetectorResults } from '../reconfig/detectors';

export interface NarrativeInterpretation {
  title: string;
  description: string;
  mood: 'wonder' | 'tension' | 'harmony' | 'chaos' | 'discovery' | 'loss';
  significance: number; // 0-1, how important is this
}

export interface StabilityMetrics {
  score: number; // 0-1 overall stability
  entropy: number; // 0-1 disorder level
  complexity: number; // 0-1 pattern complexity
  resilience: number; // 0-1 resistance to perturbation
}

// Interprets beats into narrative events
export function interpretBeat(beat: Beat, metrics: DetectorResults): NarrativeInterpretation {
  switch (beat.type) {
    case 'speciation':
      return {
        title: '🧬 Nova Espécie Emergiu',
        description: `${beat.message} - Uma nova forma de vida surgiu da sopa primordial! As interações complexas levaram à diferenciação espontânea.`,
        mood: 'discovery',
        significance: 0.8,
      };
      
    case 'institution':
      return {
        title: '🏛️ Instituição Estabelecida',
        description: `${beat.message} - Padrões de comportamento coletivo cristalizaram-se em estruturas duradouras. Uma nova ordem social emerge.`,
        mood: 'harmony',
        significance: 0.9,
      };
      
    case 'mutation':
      return {
        title: '⚡ Mutação Detectada',
        description: `${beat.message} - As forças caóticas causaram uma mudança fundamental nas regras do universo. Nada será como antes.`,
        mood: 'tension',
        significance: 0.7,
      };
      
    default:
      return {
        title: beat.message,
        description: 'Algo interessante aconteceu no universo.',
        mood: 'wonder',
        significance: 0.5,
      };
  }
}

// Calculates stability metrics from detector results
export function calculateStabilityMetrics(
  detectors: DetectorResults,
  particleCount: number,
  currentTime: number
): StabilityMetrics {
  // Stability increases with:
  // - High cohesion
  // - Low tension (or balanced tension)
  // - Presence of stable clusters
  // - Low novelty (patterns repeating)
  
  const cohesionScore = Math.min(1, detectors.avgCohesion);
  const clusterScore = Math.min(1, detectors.stableClusters / 5); // More clusters = more stability
  const tensionPenalty = Math.abs(detectors.avgTension - 0.5) * 2; // Penalty for extreme tension
  const noveltyPenalty = detectors.avgNovelty; // High novelty = unstable
  
  const score = Math.max(0, Math.min(1, 
    cohesionScore * 0.4 + 
    clusterScore * 0.3 - 
    tensionPenalty * 0.2 - 
    noveltyPenalty * 0.1
  ));
  
  // Entropy: High when scarcity is high, tension is extreme, or novelty bursts
  const entropy = Math.max(0, Math.min(1,
    detectors.avgScarcity * 0.4 +
    Math.abs(detectors.avgTension - 0.5) * 0.3 +
    (detectors.noveltyBurst ? 0.3 : 0)
  ));
  
  // Complexity: Based on diversity and number of types
  const complexity = Math.min(1, 
    detectors.avgNovelty * 0.5 +
    (detectors.stableClusters > 0 ? 0.3 : 0) +
    (detectors.borderStrength > 0.5 ? 0.2 : 0)
  );
  
  // Resilience: Based on how long system has been stable
  const resilience = Math.min(1, Math.sqrt(currentTime / 120)); // Grows with time, maxes at 2min
  
  return { score, entropy, complexity, resilience };
}

// Generates narrative interpretation of mitosis event
export function interpretMitosis(
  parentSize: number,
  childrenCount: number,
  currentTime: number
): NarrativeInterpretation {
  if (childrenCount >= 4) {
    return {
      title: '🧬 Explosão Reprodutiva',
      description: `Um organismo massivo se fragmentou em ${childrenCount} descendentes! A vida encontra um caminho através da divisão explosiva.`,
      mood: 'chaos',
      significance: 0.9,
    };
  } else if (childrenCount === 2) {
    return {
      title: '🧬 Divisão Celular',
      description: `Um organismo atingiu massa crítica e se dividiu em dois. A reprodução através da mitose é a base da vida multicelular.`,
      mood: 'wonder',
      significance: 0.7,
    };
  } else {
    return {
      title: '🧬 Fragmentação',
      description: `Um cluster instável se fragmentou em ${childrenCount} partes. Às vezes o caos é necessário para criar ordem.`,
      mood: 'tension',
      significance: 0.6,
    };
  }
}

// Interprets metamorphosis event
export function interpretMetamorphosis(
  oldType: number,
  newType: number,
  energy: number
): NarrativeInterpretation {
  const energyLevel = energy > 1.2 ? 'supercarregada' : energy < 0.8 ? 'esgotada' : 'equilibrada';
  
  return {
    title: '🦋 Metamorfose',
    description: `Uma partícula do tipo ${oldType} transformou-se em tipo ${newType}! Energia ${energyLevel}: ${energy.toFixed(2)}. A plasticidade adaptativa permite sobrevivência.`,
    mood: 'discovery',
    significance: 0.7,
  };
}

// Generates myth/legend based on pattern
export function generateMythFromPattern(
  pattern: string,
  duration: number,
  stability: number
): string {
  const myths = {
    membrane: [
      'A Grande Membrana surgiu das águas primordiais, separando o dentro do fora.',
      'Conta-se que a Primeira Célula envolveu-se em sua própria existência.',
      'Os antigos falam de um Anel de Contenção que mantém o caos à distância.',
    ],
    ring: [
      'O Anel de Saturno gira eternamente, guardião da ordem circular.',
      'Dizem que quando partículas dançam em círculos, os deuses estão satisfeitos.',
      'A Roda da Fortuna gira, e com ela, o destino de todas as partículas.',
    ],
    spiral: [
      'A Espiral Galáctica puxa todas as coisas para seu centro luminoso.',
      'Nos braços da espiral, civilizações nasceram e pereceram mil vezes.',
      'O Redemoinho Cósmico sussurra segredos de mundos esquecidos.',
    ],
    oscillator: [
      'O Coração do Universo pulsa em ritmo constante.',
      'A Respiração Cósmica inspira e expira, mantendo tudo em equilíbrio.',
      'O Metrônomo Divino marca o tempo entre criação e destruição.',
    ],
    crystal: [
      'O Cristal Eterno cresceu da terra, estrutura perfeita de ordem.',
      'Na grade periódica, a matemática do universo se revela.',
      'Os Pilares da Criação sustentam a realidade em ângulos retos.',
    ],
  };
  
  // Select myth based on pattern
  const options = myths[pattern as keyof typeof myths] || [
    'Algo extraordinário aconteceu, mas nenhum profeta vivo pode nomeá-lo.',
  ];
  
  const myth = options[Math.floor(Math.random() * options.length)];
  
  if (duration > 60) {
    return `${myth} Por ${duration.toFixed(0)} segundos, testemunhamos sua glória.`;
  } else {
    return myth;
  }
}

// Interprets system state into a status message
export function interpretSystemState(metrics: StabilityMetrics): string {
  if (metrics.score > 0.8 && metrics.entropy < 0.3) {
    return '⚖️ Equilíbrio Perfeito - O universo encontrou harmonia';
  } else if (metrics.entropy > 0.7 && metrics.score < 0.3) {
    return '🌪️ Caos Primordial - Forças destrutivas dominam';
  } else if (metrics.complexity > 0.7) {
    return '🧩 Complexidade Emergente - Padrões intrincados se formam';
  } else if (metrics.resilience > 0.8) {
    return '🛡️ Sistema Resiliente - Ordem resistente às perturbações';
  } else {
    return '🌊 Fluxo Dinâmico - Criação e destruição em equilíbrio';
  }
}
