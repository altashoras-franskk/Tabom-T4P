# Por que a simulação parece homogênea — e o que falta para complexidade real

## Diagnóstico

Em quase todos os “universos” (presets, receitas, labs) o **comportamento visível** é parecido: aglomerados que se atraem/repelem, sem sensação de **física distinta** (peso, colisão, confinamento). Isso acontece porque o núcleo da simulação hoje tem:

1. **Só forças sociais (tipo×tipo)**  
   A única física entre agentes é a matriz de atração/repulsão por tipo. Não há:
   - **Gravidade** → não há “para baixo”, sedimentação, pressão no fundo.
   - **Colisão / exclusão** → partículas podem ocupar o mesmo ponto; não há empurrar, cristalização, congestionamento.
   - **Bordas** → por padrão é `wrap` (toroidal); com `wrap: false` existe bounce, mas não é o default e não gera “recipiente” tão óbvio.

2. **Mesmo kernel em todo lugar**  
   O kernel de força (clássico com `coreRepel` ou `pow` com falloff) é o mesmo em todos os cenários. Varia só a matriz (attract/radius/falloff). Como a matriz costuma ser normalizada ou em faixas parecidas, a **escala** da dinâmica fica similar.

3. **Campo modula, mas pouco**  
   Tensão, coesão, escassez etc. modulam força e drag, mas em muitos presets o campo é fraco ou homogêneo. Falta **heterogeneidade espacial forte** (zonas com regras diferentes) para regimes visivelmente distintos.

4. **Presets mudam matriz, não a física**  
   Trocar de “predator-prey” para “symbiosis” muda quem atrai/repel quem, mas o **tipo de interação** continua o mesmo: forças suaves, sem contato, sem peso. Por isso a sensação entre universos é parecida.

---

## O que realmente aumenta complexidade (e heterogeneidade)

| Mecânica            | O que falta hoje                         | O que adiciona |
|--------------------|------------------------------------------|----------------|
| **Gravidade**      | Não existe no core (só em Music/PhysicsSandbox). | Direção preferencial, sedimentação, “fundo”, pressão, comportamentos assimétricos. Universos com gravidade vs sem gravidade ficam **muito** diferentes. |
| **Colisão / exclusão** | Partículas não se empurram; podem sobrepor. Só há repulsão de núcleo (evitar singularidade). | Espaçamento mínimo, “corpo”, filas, cristalização, congestionamento. Com colisão, aglomerados têm **estrutura física** em vez de só atração. |
| **Bordas (bounce)**| Código já tem (`wrap: false` = bounce), mas default é wrap. | Confinamento, pressão nas paredes, reflexão. Com bounce + gravidade, surge “recipiente” claro. |
| **Heterogeneidade espacial** | Campo é globalmente suave. | Zonas com atração/repulsão/gravidade diferentes (ex.: “chão” com atrito, “céu” com flutuação) criam **regimes** distintos no mesmo universo. |

Resposta direta à pergunta “é sobre colisão? física? gravidade?”:

- **Gravidade** — Sim. É o que mais falta no core para que “universos” se sintam diferentes (peso, direção, sedimentação). Implementação: `gravityX`, `gravityY` em `MicroConfig`, aplicados na integração em `particleLife.ts`.
- **Colisão** — Sim. Hoje não há exclusão espacial; partículas passam umas pelas outras. Colisão (ex.: raio mínimo por agente, empurrar quando sobrepõem) introduz dinâmica de “corpo” e congestionamento, muito diferente do atual.
- **Física** — Em parte. O que falta não é “mais física” genérica, e sim **tipos de física** que hoje não existem no loop principal: gravidade global, colisão partícula–partícula (e opcionalmente partícula–parede quando bounce está ativo).

---

## O que foi feito (Março 2026)

- **Gravidade opcional no core**  
  - `MicroConfig`: `gravityX`, `gravityY` (unidades por segundo²; default 0).  
  - Em `particleLife.ts`, na integração: para agentes não-food, `vx += gravityX * dt`, `vy += gravityY * dt`.  
  - Controles no Complexity Lab (Interação / Física): sliders para gravidade X e Y.  
  Com gravidade ≠ 0, universos passam a ter “para baixo” (ou outra direção), sedimentação e sensação de ambiente distinta.

- **Bounce já existia**  
  - `wrap: false` no painel já ativa bordas sólidas com reflexão. Vale combinar com gravidade para ver “recipiente” e pressão nas bordas.

Próximos passos sugeridos (para ainda mais heterogeneidade):

1. **Colisão partícula–partícula**  
   Raio mínimo por agente (ou global); quando distância < 2×raio, aplicar força de separação (ou correção de posição). Custo: O(n) com spatial hash, checando vizinhos próximos.
2. **Presets “física forte”**  
   Receitas que já nascem com gravidade (ex.: Y negativo), bounce e, quando existir, colisão ligada, para contrastar com universos “flutuantes”.
3. **Campo mais forte e espacialmente variado**  
   Aumentar modulação do campo (força, drag, nutriente) e/ou criar zonas (ex.: gradiente vertical) para regimes locais distintos.

---

*Última atualização: Março 2026*
