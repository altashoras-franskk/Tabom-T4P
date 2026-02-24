# Evolution Map — Complexity Life Lab
> Diagnóstico do sistema atual (PATCH 01 baseline)  
> Gerado: Feb 2026 — atualizar a cada patch

---

## 1. Cadeia Causal (Feedback Loops)

```
╔══════════════════════════════════════════════════════════════╗
║                  MACRO: CAMPO (FieldLayers)                  ║
║  nutriente · memória · entropia · coesão · tensão            ║
║  Diffusion 4-viz · Decay por layer · Global mix              ║
╠══════════════════════════════════════════════════════════════╣
║                  MESO: POPULAÇÕES                            ║
║  Tipos 0–8 · Matriz de atração/repulsão · Clusters           ║
╠══════════════════════════════════════════════════════════════╣
║                  MICRO: AGENTES                              ║
║  posição · velocidade · energia · idade · genes (A-D)        ║
╚══════════════════════════════════════════════════════════════╝

LOOP PRINCIPAL (por physics tick ~16.6ms):
  [1] SpatialHash rebuild (quando raio/count muda)
  [2] Force loop → fx[i], fy[i]  (O(N) com grid)
      ← modulado por campo (tension, cohesion, scarcity)
      ← modulado por Or Chozer/ComplexityLens (force, drag, rmax, beta)
  [3] Integrate velocity → position (wrap/clamp)
  [4] updateEnergy → decaimento + alimentação + reprodução  ← births
      → mortalidade por fome (energy < threshold)           ← deaths
  [5] updateMetamorphosis → mutação de tipo, tamanho, mutation potential
  [6] mutateGenes → deriva genômica

LOOP DE CAMPO (por RAF frame, se fieldTick):
  [7] FieldLayers → diffusion + decay + global mix
  [8] depositMicroMetrics → agentes injetam no campo

LOOP DE RETROAÇÃO (por RAF frame, a cada intervalFrames):
  [9] ComputeRawMetrics → entropy, clustering, conflict, diversity, energy
  [10] StepFeedbackEngine → sefirot activations → modulation deltas
       → modula: force, drag, entropy, beta, rmax, mutationRate
```

**Loops de Reforço (R) identificados:**
- R1: Alta atração → aglomeração → mais interações → mais energia → mais reprodução → mais agentes → mais atração
- R2: Mutação alta → diversidade → nichos → mais energia disponível → mais reprodução → mais mutação
- R3: Campo nutriente → alimentação → crescimento → mais agentes depositam → mais nutriente

**Loops de Balanço (B) identificados:**
- B1: Muitos agentes → competição por espaço → menos energia → mortalidade → menos agentes
- B2: Alta velocidade (conflito) → feedback reduz force + aumenta drag → desacelera → conflito baixa
- B3: Baixa diversidade → feedback injeta novelty (mutation rate up) → diversidade sobe

---

## 2. Dados por Agente (MicroState)

| Campo          | Tipo          | Range           | Descrição                               |
|----------------|---------------|-----------------|----------------------------------------|
| `x`, `y`       | Float32       | [-1, +1]        | Posição normalizada                    |
| `vx`, `vy`     | Float32       | [-speedClamp, +speedClamp] | Velocidade                |
| `type`         | Uint8         | [0, typesCount-1] / 255=FOOD | Tipo/espécie            |
| `energy`       | Float32       | [0, 6.0]        | Energia metabólica                     |
| `age`          | Uint32        | [0, ∞]          | Ticks de vida                          |
| `mutationPotential` | Float32  | [0, 1]          | Pressão acumulada de mutação           |
| `size`         | Float32       | [0.5, 2.0]      | Tamanho visual (evoluído pela energia) |
| `geneA–D`      | Float32       | [0, 1]          | Genoma (4 alelos; classifica arquétipo)|
| `archetypeId`  | Uint16        | [0, N]          | ID de arquétipo detectado              |

**Ausente ainda (necessário para EvolutionStack):**
- `lineageId` — ID de linhagem para especiação
- `plasticity[0..5]` — parâmetros plásticos (aprendizado)
- `colonyId` — ID de colônia (para módulo de colônias)
- `lastRewardSignal` — recompensa recente (para Hebb-lite)

---

## 3. Gargalos de Performance

### Crítico (O(N²) ou alocações por frame):
| Local | Problema | Impacto | Solução |
|-------|----------|---------|---------|
| `energy.ts:102` | `neighbors` array alocado por frame | Médio | Buffer pré-alocado |
| `mitosis.ts detectClusters` | Itera todos os agentes por tipo | Alto a N>2k | SpatialHash |
| `feedbackEngine.ts:129` | `gridTypeCount = new Uint16Array(...)` | Médio | Buffer estático reutilizável |

### Menor / Aceitável:
| Local | Nota |
|-------|------|
| `particleLife.ts` inner loop | Bem otimizado, O(N) com spatial hash |
| Field diffusion | Grid 96×96 = 9216 células, aceitável |
| History buffer | 8 × maxCount — escrita O(N), ok |
| Metrics sampling | MAX_SAMPLE=500, baixo custo |

### Missing:
- **Sem timers por módulo** — não sabemos quanto tempo cada sistema consome
- **Sem LOD** — todos os agentes processados na mesma frequência
- **Sem budget mode** — sem adaptação automática ao FPS alvo

---

## 4. Tick Sequence Completo (por RAF loop)

```
RAF frame
│
├─ updateTime() → stepCount, fieldTick, reconfigTick
│
├─ for i in stepCount:                [MÓDULO: particleLife]
│   ├─ applyModulation (Or Chozer)
│   ├─ updateParticleLife / withField
│   │   ├─ spatialHash.rebuild()
│   │   ├─ force loop (O(N) grid)
│   │   └─ integrate + wrap
│   ├─ restoreParams
│   └─ updateEnergy                   [MÓDULO: energy]
│       ├─ decay per agent
│       ├─ feed (spatial hash)
│       ├─ reproduce (births)
│       └─ die (deaths)
│
├─ FieldLayers update                 [MÓDULO: field]
│   ├─ agent → field injection
│   ├─ diffusion
│   └─ decay
│
├─ mutateGenes                        [MÓDULO: genes]
├─ updateMetamorphosis                [MÓDULO: metamorphosis]
├─ runDetectors                       [MÓDULO: reconfig] (throttled)
├─ runMitosis                         [MÓDULO: mitosis] (throttled)
├─ archetypeDetection                 [MÓDULO: archetypes] (throttled)
├─ sigilSystem update                 [MÓDULO: sigils] (throttled)
│
├─ stepFeedbackEngine                 [MÓDULO: feedbackEngine]
│   ├─ computeRawMetrics
│   ├─ computeSefirotActivations
│   ├─ stepPhaseOscillator
│   └─ computeModulationDeltas
│
└─ render()                           [MÓDULO: render]
```

---

## 5. Módulos Candidatos ao EvolutionStack

Os módulos abaixo serão adicionados via feature flags (PATCH 02–06):

| ID | Módulo | Status | Custo estimado |
|----|--------|--------|----------------|
| A | Ciclo celular (mitose v2) | PATCH 02 | O(N) |
| B | Seleção + mortalidade por causa | PATCH 03 | O(N) |
| C | Plasticidade (Hebb-lite) | PATCH 04 | O(N) |
| D | Linhagens + especiação lenta | PATCH 05 | O(N) |
| E | Campo nutriente/toxina/temperatura | PATCH 02 | O(grid) |
| F | Colônias (densidade + macro) | PATCH 06 | O(N) + O(grid) |

---

## 6. Plano de Checkpoints

```
PATCH 01 ✅ — Telemetria + ComplexityLens + timers por módulo
PATCH 02 — Ciclo celular (3 fases) + campo nutriente básico
PATCH 03 — Morte por causa (fome/idade/conflito) + presets calibrados
PATCH 04 — Plasticidade (2–4 params por agente) + Hebb-lite
PATCH 05 — lineageId + especiação rara + cor por linhagem
PATCH 06 — Colônias: detecção densidade + metabolismo coletivo
PATCH 07 — Budget mode + LOD + render sampling
PATCH 08 — UI overlays máxima legibilidade + docs leigo
```

---

## 7. Referência Teórica

### Donella Meadows — Thinking in Systems
Parâmetros-chave para um sistema complexo saudável:
- **Stocks** (o que o sistema tem): população, energia total
- **Flows** (taxas de mudança): nascimentos/s, mortes/s, mutação/s
- **Feedback loops**: R (amplificação) vs B (regulação)
- **Delays** (atrasos): quanto tempo o feedback leva para agir
- **Resilience** (resiliência): diversidade + capacidade de auto-reorganização
- **Self-organization**: emergência de nova estrutura sem controle externo
- **Hierarchy** (hierarquia): micro → meso → macro (agente → população → ecologia)

### Edgar Morin — Pensamento Complexo
Princípios para um sistema verdadeiramente complexo:
- **Dialogique**: forças opostas coexistem (ordem/desordem, atração/repulsão)
- **Recursivité**: efeito é também causa (retroalimentação)
- **Hologramme**: cada parte contém informação do todo (genes → comportamento)
- **Perturbação → Reorganização**: crise não é falha, é motor de emergência
- **Auto-Eco-Organização**: sistema se reorganiza em relação ao ambiente
- **Emergência**: o todo é mais do que a soma das partes
- **Incerteza**: complexidade implica imprevisibilidade estrutural
