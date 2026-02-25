# Mil Platôs — CsO + Rizoma + Platôs

## Arquitetura de 3 Camadas

O lab opera sobre um **mundo compartilhado** com 3 camadas sobrepostas (toggles):

### (A) CsO — Corpo sem Órgãos
- **Órgãos** (8-20 nós): hierarquia com springs, repulsão, importância, saúde
- **Afetos** (50-400 partículas): intensidade, hue, pulso, trilhas, influenciados por zonas
- **Zonas** (3 campos móveis): radius, strength, hue — modulam afetos e depositam consistência
- **Crueldade**: acumula pressão → **rupturas** (burst + quebra de conexões + evento narrativo)
- **Desorganização**: chance de reconexão aleatória (anti-hábito)

### (B) Rizoma — Grafo Anti-Hierárquico
- **Nós** (até 150): posições com layout force-directed, heat, territory
- **Entradas** (isEntry): múltiplos pontos de acesso (portais visuais)
- **Crescimento**: ramificação a partir de nós existentes (growthTimer)
- **Multiplicidade**: burst de novas entradas
- **Linhas de Fuga**: conexões improváveis entre nós distantes
- **Hubs**: preferential attachment quando `hubs` alto
- **Esquecimento**: poda de conexões e remoção de nós isolados

### (C) Platôs — Detector de Regimes
- Roda a ~8Hz, analisa estabilidade de métricas
- Labels: Simbiose Vibrante, Captura (Proto-Estado), Nomadismo, Metástase, Reterritorialização, Delírio Controlado
- **Captura**: salva snapshot (params + métricas) em localStorage (até 6)

## Mapeamento Conceito → Parâmetro → Operador → Métrica

### Parâmetros (15 sliders, 0..1 cada)

| Param | Conceito D&G | Operador | Métrica |
|-------|-------------|----------|---------|
| **organismo** | Corpo com Órgãos | Dominância de órgãos, saúde alta | K |
| **intensidade** | Afetos / Devir | Força de pulso dos afetos | Intensidade Média |
| **hierarquia** | Estratificação | Conexões rígidas entre órgãos | K, Hub Dominance |
| **rigidez** | Organização | Stiffness dos springs | K |
| **desorganizacao** | Anti-hábito | Chance de reconexão aleatória | Rupturas |
| **crueldade** | Crueldade (threshold) | Limiar de ruptura (baixo = fácil) | Rupturas |
| **antiHabito** | Linha de fuga micro | Reconexão a nós improváveis | Entropia |
| **multiplicidade** | Multiplicidade | Novos pontos de entrada no rizoma | N nós |
| **linhasDeFuga** | Linhas de fuga | Conexões distantes improváveis | Arestas flight |
| **territorializacao** | Territorialização | Atração local, depósito no campo | Memória |
| **reterritorializacao** | Reterritorialização | Pull para centro, recaptura | K |
| **hubs** | Captura estatal | Preferential attachment | Hub Dominance |
| **esquecimento** | Esquecimento | Poda de conexões/nós | N nós (decresce) |
| **ruido** | Temperatura | Estocasticidade | Entropia Campo |
| **densidade** | Densidade de afetos | Target count de partículas | N Afetos |

### K — Pressão de Estratificação (derivado)

```
K = organismo × 0.35 + hierarquia × 0.30 + rigidez × 0.20 + (1 - desorganizacao) × 0.15
```

### Dial Macro (CsO ↔ Corpo com Órgãos)

```
macro = (1-organismo)×0.25 + intensidade×0.15 + desorganizacao×0.20 +
        (1-hierarquia)×0.15 + linhasDeFuga×0.10 + ruido×0.10 + antiHabito×0.05
```

## Field Layers (64×64)

| Campo | Depositado por | Efeito | Decai com |
|-------|---------------|--------|-----------|
| **Consistência** (P_plane) | Afetos (via intensidade) | Modula propensão a desorganizar | consDecay fixo |
| **Território** (TerritoryTrace) | Nós rizoma (via territory) + órgãos | Influencia territorialização | (1 - territorializacao - reterritorializacao) |

## Ferramentas de Intervenção (5)

| Ferramenta | Efeito | Opera sobre |
|------------|--------|-------------|
| Sopro de Temperatura | Perturba velocidades + aumenta intensidade | Afetos + Órgãos |
| Selo Territorial | Deposita traço territorial forte | Campo territory |
| Rasura | Apaga consistência + território | Ambos campos |
| Linha de Fuga | Burst de vetores radiais | Afetos + Nós rizoma |
| Gradiente de Consistência | Pinta consistência | Campo consistency |

## Presets (8)

| # | Nome | Perfil |
|---|------|--------|
| 1 | Estratos (Organismo) | K alto, hierarquia rígida, hubs fortes |
| 2 | CsO Pulsante | Intensidade máxima, desorganização alta |
| 3 | Captura (Proto-Estado) | Hubs dominantes, territorialização alta |
| 4 | Nomadismo | Linhas de fuga ativas, sem território |
| 5 | Linhas de Fuga | Desterritorialização pura |
| 6 | Reterritorialização | Memória alta, recaptura gradual |
| 7 | Delírio Controlado | Intensidade + rupturas frequentes |
| 8 | Rizoma Frio | Esquecimento alto, poda ativa |

## Visual Layering

- **Heatmaps**: Consistência (azul/roxo pulsante) e Território (âmbar)
- **Zonas**: Gradientes radiais pulsantes com hue do afeto
- **Trilhas de Afetos**: Linhas sutis com decay
- **Partículas**: Glow fake (halo quando intensidade > 0.4) + pulsação por phase
- **Órgãos**: Anéis com espessura por importância; ghost mode (transparência) quando CsO cresce
- **Conexões Organ**: Linhas com espessura por hierarquia + health-based alpha
- **Rizoma**: Edges curvas com cor por heat; entradas = diamantes pulsantes
- **Linhas de Fuga**: Dash animado + seta no ponto médio
- **Rupturas**: Anel expansivo + sparks radiais
- **Log de Eventos**: Overlay no canto superior direito com fade

## Performance

- Órgãos: 8-20 (O(N²) aceitável com N pequeno)
- Rizoma: até 150 nós; repulsão amostrada (stride = N/40)
- Afetos: até 400; interação via zonas (3), não par-a-par
- Métricas/platô: ~8Hz
- Edges rizoma: recalculadas a ~5Hz
- Fields: 64×64 grid (4096 cells), decay/diffusion por frame
