# Complexity Lab — Auditoria: o que está ligado vs pseudocódigo/UI falsa

> Referência: `docs/evolution_map.md`, loop principal em `App.tsx` (requestAnimationFrame quando `activeLab === 'complexityLife'`).  
> Objetivo: garantir que cada controle e cada métrica exibida corresponda a código que realmente roda.

---

## 1. Condições para o loop rodar

| Condição | Onde | Status |
|----------|------|--------|
| `!showHome` | App.tsx ~1313 | ✅ Loop não roda na home |
| `activeLab === 'complexityLife' \|\| activeLab === 'sociogenesis'` | App.tsx ~1313 | ✅ Só Complexity Life e Sociogenesis rodam este loop |
| `timeRef.current.running` | App.tsx ~1318 | ⚠️ Se "pausado", simulação não avança (render continua) |

**Conclusão:** No Complexity Life, com simulação **rodando** (não pausada), o tick roda.

---

## 2. Sistema de energia (nascimentos / mortes)

### O que a documentação diz (evolution_map.md)
- `[4] updateEnergy` → decaimento, alimentação, reprodução (births), morte por fome (deaths).
- Stocks: população, energia total. Flows: nascimentos/s, mortes/s.

### Cadeia real no código
| Etapa | Arquivo | Condição / Observação |
|-------|---------|------------------------|
| Toggle "Energia" no painel | ComplexityPanel.tsx | `life.energyEnabled` → `onLifeChange({ energyEnabled: v })` |
| Estado React | App.tsx | `setLife(prev => applyLifeDial({ ...prev, energyEnabled: v }))` |
| Ref para o loop | App.tsx onLifeChange | `lifeRef.current = next` (síncrono no setState) |
| Gate no loop | App.tsx ~1494 | `if (!ENERGY_SYSTEM_DISABLED_COMPLEXITY_LAB && lifeCfg.energyEnabled)` |
| Flag global | App.tsx ~147 | `ENERGY_SYSTEM_DISABLED_COMPLEXITY_LAB = false` (energia respeitada) |
| EnergyConfig.enabled | App.tsx ~1497 | `e.enabled = true` ao entrar no bloco |
| updateEnergy | energy.ts | `if (!config.enabled) return { births: 0, deaths: 0, mutations: 0 }` |
| Nascimentos/mortes | energy.ts | Retorno `{ births, deaths, mutations }` → `frameBirths`, `frameDeaths` |
| Acumulador | App.tsx ~2088 | `tickVitalRates(vitalAccRef.current, ..., frameBirths, frameDeaths, ...)` só se `activeLab === 'complexityLife'` |
| Exibição | App.tsx | `complexityLensRef.current.vitalRates = { ...vitalAccRef.current.lastRates }` |
| UI | ComplexityPanel | `vitalRates={complexitySnap.vitalRates}` → Nasc./s, Mortes/s, etc. |

### Correções aplicadas (revisão Mar 2026)
- **ENERGY_SYSTEM_DISABLED_COMPLEXITY_LAB = false** — o toggle Energia no painel passa a controlar o bloco de energia.
- **Ao ligar Energia no UI** — `onLifeChange` chama `initializeEnergy(microStateRef.current, energyConfigRef.current)` para que todos os agentes existentes recebam `startEnergy`; evita energia zerada por caminhos de spawn que não preenchem `state.energy`.
- **Mensagem na telemetria** — quando `!life.energyEnabled` é exibido "⚡ Energia desligada — ative em Metabolismo para nasc./mortes" na seção Telemetria.

### Possíveis causas de "energia não funciona"
1. **Energia desligada no painel** — Abrir seção "Metabolismo" e ligar o toggle **Energia**.
2. **Simulação pausada** — Verificar se o botão Play está ativo (timeRef.running).
3. **Limiar de reprodução alto** — Com `reproductionThreshold` 2.0 e agentes em 1.0, precisam ganhar energia (feed) para reproduzir; mortes (decay até `deathThreshold`) devem aparecer em poucos segundos.

---

## 3. Telemetria (FPS, agentes, módulos ms/frame)

| Métrica | Fonte real | Onde é escrita |
|---------|------------|----------------|
| FPS | `timeRef.current.fps` | time.ts (a cada 30 frames) |
| Agentes | `microStateRef.current.count` | particleLife, energy (births/deaths), spawn |
| Nasc./s, Mortes/s, Mut./s | `vitalAccRef.current.lastRates` | tickVitalRates (complexityLens) |
| Mortes por causa | idem | frameDeathsByStarvation, etc. (hoje só starvation preenchido pelo energy) |
| Módulos (ms/frame) | `complexityLensRef.current.moduleTelemetry` | recordModuleMs no loop (particleLife, energy, field, genes, reconfig, render) |

**Snapshot para React:** a cada 20 frames, `setComplexitySnap({ ...cl, moduleTelemetry: cl.moduleTelemetry })`. O painel usa `complexitySnap.moduleTelemetry` (ou fallback `lensState.moduleTelemetry`). Se a seção "Módulos" estiver vazia, pode ser snapshot antigo ou telemetria sem chaves; o painel agora mostra fallback "Aguardando telemetria…" e lista de módulos.

---

## 4. Feedback / Or Chozer (modulação)

| Elemento | Conectado? | Observação |
|----------|------------|------------|
| stepComplexityLens | ✅ | Chama stepFeedbackEngine, traduz para metrics/forces/phase |
| applyModulation / restoreParams | ✅ | Aplicado antes/depois de updateParticleLife quando feedback.config.enabled |
| Sliders "parâmetros efetivos" | ✅ | Leem base + modulation quando feedback ligado |
| Métricas Meadows (variedade, coesão, atrito, etc.) | ✅ | computeRawMetrics → toComplexityMetrics |

---

## 5. Controles Life (Metabolismo) — todos ligados

| Controle | Prop | Efeito real |
|----------|------|-------------|
| Comida (food) | life.foodEnabled | microConfig.foodEnabled, conversão de partículas em FOOD_TYPE |
| Proporção comida | life.foodRatio | microConfig.foodRatio |
| **Energia** | life.energyEnabled | Gate do bloco updateEnergy + stepCellCycle |
| Reconfig | life.reconfigEnabled | runOperators (mutationStrength, speciationRate, institutionRate) |
| Modo (OFF/METABOLIC/EVOLUTIVE/FULL) | life.mode | metamorphosisEnabled, mutationRate, typeStability |
| absorptionRate | life.energyFeedRate | energyConfig.feedRate |
| metabolicCost | life.energyDecay | energyConfig.baseDecay |
| reproductionThreshold | life.energyReproThreshold | energyConfig.reproductionThreshold |
| supportCapacity | targetParticleCount | targetParticleCountRef, maintain population logic |
| maintainPopulation | maintainPopulation | Lógica de spawn/trim para manter total |
| mutation (dial) | life.mutationDial | energyConfig.mutationChance, deathThreshold; applyLifeDial → mutationRate, typeStability |

Nenhum desses é "fake": todos alteram refs usados no mesmo frame ou no próximo pelo loop.

---

## 6. O que ainda é parcial ou não implementado (evolution_map)

- **Mortes por causa:** Só "fome" (starvation) vem do energy; idade/colisão/predação seriam PATCH 03 (não todos implementados).
- **Ciclo celular (G1/S/G2/M):** stepCellCycle existe mas `cellCycleEnabled` está `false` no bloco de energia; reprodução é por energia livre, não só em fase M.
- **Budget mode / LOD:** Não implementado (evolution_map § Missing).

---

## 7. Checklist rápido "energia não mexe"

- [ ] Estou na aba **Complexity Life** (não em outra lab).
- [ ] A simulação está **rodando** (não pausada).
- [ ] No painel **Sistema Complexo** (ou Patchboard), seção **Metabolismo**, toggle **Energia** está **ligado**.
- [ ] Aguardar alguns segundos: decaimento deve gerar mortes (energia < deathThreshold); alimentação + limiar de reprodução podem gerar nascimentos dependendo da matriz e do preset.

---

*Última atualização: Março 2026 — pós-revisão Sprint 1 e correção ENERGY_SYSTEM_DISABLED_COMPLEXITY_LAB.*
