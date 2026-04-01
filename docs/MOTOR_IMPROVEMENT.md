# TOOLS FOR PERCEPTION — Motor Improvement (guia vivo)

Este documento é o guia de auditoria e robustecimento do motor T4P. O Cursor usa a regra em `.cursor/rules/T4P-motor-improvement.mdc` (sempre aplicada) com o mesmo conteúdo resumido.

**Fase atual**: consolidar o que existe; não adicionar features.

---

## Tarefas prioritárias (ordem)

- [x] **1. Determinismo e reprodutibilidade** — SeededRNG em uso no loop principal; applyChaos/applyMagnetize e spawnFromRecipe com rng; seed padrão DEFAULT_SEED; *pendente*: teste snapshot frame 1000 e substituir Math.random() nos demais módulos (labs, sociogenesis, etc.).
- [x] **2. Timers por módulo** — particleLife, energy, field, genes, reconfig, render cronometrados; histórico 120 frames (ring buffer); getModuleStats(avgMs, maxMs, percentOfFrame); exibição no ComplexityPanel.
- [x] **3. Auditoria de alocações** — energy: feedNeighborsBuffer (Uint16Array) e childrenToAddBuffer reutilizados; feedbackEngine: gridTypeCount, gridTotal, typePop reutilizados (realloc só quando typesCount muda). *Pendente*: mitosis detectClusters e recursiveFieldWrapper originalAttract.
- [ ] **4. Consistência de padrões** — Naming, interface ModuleState/ModuleConfig/stepModule; código morto; catalogar TODO/HACK/FIXME em docs/TODO.md.
- [ ] **5. Formalização** — docs/formal_model.md com S, T, equações extraídas do código, tabela de parâmetros.
- [ ] **6. Análise de sensibilidade** — SensitivityRunner (após 1–5).
- [ ] **7. Benchmark comparativo** — Cenário canônico; NetLogo, Mesa, Particle Life (após 1–6).

---

## Status atual (Março 2026)

### Determinismo (Tarefa 1) — Sprint 1 feito
- **SeededRNG** em `src/engine/rng.ts`; **DEFAULT_SEED** para cold start reproduzível.
- **App** usa `rngRef.current` em todo o loop principal; **applyChaos** e **applyMagnetize** passam a receber `rng`; **spawnFromRecipe** recebe `rng: SpawnRng` e usa em todos os padrões.
- **Math.random()** ainda em: sociogenesisPresets, rhizomeLLM, alchemistSecretary, archetypes, metaArtDNA, MetaArtLab, TreeOfLifeLab, PhysicsSandbox/aquariumEngine, etc. (fora do core sim do Complexity Lab).

### Timers (Tarefa 2) — Sprint 1 feito + painel completo
- **recordModuleMs** atualizado: ring buffer de 120 frames por módulo (history, historyIndex, historySize).
- **getModuleStats(telem, id)** e **getAllModuleStats(telem)** para painel Performance completo.
- App registra: **particleLife**, **energy**, **field**, **genes**, **reconfig**, **render**, **mitosis** (quando roda), **feedbackLens** (em stepComplexityLens).
- ComplexityPanel: secção "Performance (todos os módulos)" expansível com avg · max (ms) · % do frame para os 10 módulos; indicador "Budget ativo" quando LOD > 0.

### Alocações (Tarefa 3) — Sprint 1 parcial
- **energy.ts**: `feedNeighborsBuffer` (Uint16Array 28) e `childrenToAddBuffer` (array reutilizado) — zero alocação no feed/reproduce loop.
- **feedbackEngine.ts**: `_gridTypeCount`, `_gridTotal`, `_typePop` reutilizados; realloc só quando typesCount muda.
- *Pendente*: mitosis detectClusters (SpatialHash); recursiveFieldWrapper originalAttract (matriz backup por frame).

### Budget mode + LOD (escalabilidade)
- **src/engine/budgetMode.ts**: `createBudgetState(targetFps)`, `updateBudget(state, frameMs, currentMaxSteps, agentCount)`, `getCappedMaxSteps(state, desiredMaxSteps)`, `getLODFeedSubsample(state)`.
- App: ao fim do frame calcula `totalFrameMs = simEnd - renderStart`, chama `updateBudget`; no início do frame aplica `getCappedMaxSteps` ao maxStepsPerFrame; passa `lodFeedSubsample` a `updateEnergy` via `EnergyLODOptions`.
- Quando frame time > ~95% do budget (60fps): reduz recommendedMaxSteps; se steps já baixos e N>400, sobe lodLevel (1 ou 2). LOD 2 → feed a cada 4º agente; LOD 1 → cada 2º. Recuperação quando under 60–70% do budget.
- **energy.ts**: `updateEnergy(..., options?: EnergyLODOptions)` com `lodFeedSubsample` para subsample do loop de alimentação.

### Campo 2D (limitação documentada)
- **docs/FIELD_2D_LIMITATION.md**: descreve a escolha 2D (simplicidade, visualização, custo); limitações (estratificação em profundidade, topologia); caminhos para generalização (grid 3D, canais como eixo extra, múltiplos grids 2D) com referências ao código.

---

## Regras para o agente

- **Nunca**: features sem pedido; refatorar fora do escopo; mudar semântica de parâmetros; `any`; alocar no tick; `Math.random()` direto.
- **Sempre**: listar dependentes antes de modificar; comentar bug fix (O QUE + POR QUÊ); manter SnapshotV1; PT-BR; medir antes/depois em perf.
- **Commit**: `tipo(módulo): descrição` (fix, refactor, perf, docs, test, feat).

---

Última atualização: Março 2026.
