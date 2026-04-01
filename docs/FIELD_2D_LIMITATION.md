# Campo 2D — Limitação de design e caminho para generalização

## Situação atual

O **campo (Field)** no T4P é **2D**: um grid de células com coordenadas `(x, y)`. Os canais (tensão, coesão, escassez, novidade, mítico) são escalares por célula; a difusão e o decaimento operam na malha 2D. Os agentes (MICRO) também vivem no plano `(x, y)`.

Isso é uma **escolha intencional** para:

- **Simplicidade** de implementação e debug
- **Visualização** direta (canvas 2D, sem projeção 3D)
- **Custo computacional** menor (menos células, menos vizinhos)
- **Papers e protótipos** focados em dinâmicas que não exigem profundidade topológica

## Limitações

- **Estratificação em profundidade**: não é possível modelar “camadas” (ex.: hierarquia social em múltiplas dimensões, nichos em altura/profundidade).
- **Topologia**: apenas vizinhança no plano (4 ou 8 vizinhos); não há “acima/abaixo” ou dimensões extras.
- **Generalização**: qualquer dinâmica que exija uma terceira dimensão espacial (ou dimensões adicionais) não é representável sem mudança de modelo.

## Caminho para generalização

Se no futuro for necessário modelar dinâmicas com profundidade topológica (ex.: estratificação social multidimensional, habitats em 3D), as opções são:

1. **Campo 3D (grid 3D)**  
   - `field[y][x]` → `field[z][y][x]` (ou array linear indexado por `z * W * H + y * W + x`).  
   - Difusão: 6 ou 26 vizinhos.  
   - Deposição/leitura de agentes: posição `(x, y, z)`.  
   - Código afetado: `fieldState`, `depositMicroMetrics`, `updateField`, injeção por artefatos, leitura de nutriente no energy.

2. **Dimensões extras como canais**  
   - Manter grid 2D mas interpretar um ou mais canais como “eixo extra” (ex.: canal “camada social” com valor 0..1).  
   - Agentes teriam um atributo `layer` e a interação (força, feed) dependeria de `layer` além de `(x,y)`.  
   - Menos invasivo que 3D espacial; adequado quando a “profundidade” é abstrata (estrato) e não espacial.

3. **Múltiplos campos 2D**  
   - Vários grids 2D independentes (ex.: um por “estrato”); agentes pertencem a um estrato e interagem dentro dele (e opcionalmente entre estratos via regras explícitas).  
   - Reaproveita toda a lógica atual de campo 2D; a generalização fica na camada de agente e nas regras de acoplamento entre grids.

## Referências no código

- Estado do campo: `FieldState` (grid 2D por canal) — ver `src/sim/field/` ou equivalente em `fieldLayers`.
- Depósito/leitura: funções que recebem `(x, y)`; para 3D seriam `(x, y, z)` ou índice linear.
- Documento de evolução: `docs/evolution_map.md` descreve o loop de campo e difusão no plano.

---

*Última atualização: Março 2026*
