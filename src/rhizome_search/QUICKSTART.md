# Rhizome Search — Quick Start Guide

Comece a gerar mapas de conhecimento em 5 minutos.

---

## 1. Configuração (Primeira vez)

### Opção A: Arquivo .env (Recomendado)

```bash
# Na raiz do projeto
cp .env.example .env
```

Edite `.env` e adicione sua API key:

```env
VITE_RHIZOME_LLM_API_KEY=sk-your-api-key-here
```

Reinicie o servidor:

```bash
npm run dev
```

### Opção B: Via UI (Temporário)

1. Abra Rhizome Search
2. Clique no ícone de engrenagem (Settings)
3. Cole sua API key no campo "API Key"
4. A key vale apenas para esta sessão

---

## 2. Gerar Seu Primeiro Mapa

### Passo a Passo

1. **Abra Rhizome Lab**
   - No menu principal do Quantum Symbolics

2. **Expanda "LLM Epistêmico"**
   - No painel direito

3. **Clique "Abrir Rhizome Search"**
   - Botão roxo com ícone de lupa

4. **Digite um tópico**
   - Exemplo: "Cibernética"
   - Ou: "Filosofia de Deleuze"
   - Ou: "Física Quântica"

5. **Selecione o tamanho**
   - Small (40 nós): Overview rápido
   - Medium (80 nós): **Recomendado**
   - Large (150 nós): Exploração profunda

6. **Escolha o estilo**
   - Concepts: Ideias abstratas
   - People+Works: Autores e obras
   - Methods: Ferramentas e técnicas
   - **Balanced**: Mix de tudo (recomendado)

7. **Clique "Gerar Mapa"**
   - Aguarde ~5-15 segundos
   - O mapa aparecerá no canvas

8. **Explore!**
   - Clique nos nós para ver detalhes
   - Use as search queries para pesquisar
   - Navegue pelas conexões

---

## 3. Explorar um Nó

### O que você vê no Node Inspector:

1. **Resumo (3 bullets)**
   - Essência do conceito/pessoa/obra

2. **Conexões**
   - Outros nós relacionados
   - Clique para navegar

3. **Search Queries**
   - 5-10 queries otimizadas
   - Clique no ícone de copy
   - Cole no Google Scholar, PubMed, etc.

4. **Bibliografia**
   - Referências sugeridas
   - Badge de confiança (0-100%)
   - Badge "Verificar" se incerto
   - **Sempre verifique!** (LLM pode aproximar)

---

## 4. Usar Living Layout

**O que é?**
- Animação "breathing" no mapa
- Não altera a topologia
- Apenas adiciona movimento orgânico

**Como usar:**
1. Após gerar o mapa
2. Clique em "Living Layout OFF"
3. Vira "Living Layout ON"
4. O mapa começa a se mover suavemente

**Quando desligar:**
- Para fazer screenshot
- Para análise estática
- Se preferir estático

---

## 5. Salvar e Revisitar Mapas

### Cache Automático

- Todo mapa gerado é salvo automaticamente
- Key: (query + tamanho + estilo)
- Últimos 12 mapas guardados

### Biblioteca

1. **Clique "Biblioteca"** no topo
2. Veja seus mapas salvos
3. Ações disponíveis:
   - **Carregar**: Load instantâneo
   - **Rename**: Mudar título
   - **Export JSON**: Baixar como arquivo
   - **Delete**: Remover do cache

---

## 6. Exemplos de Queries

### Filosofia
```
Rizoma (Deleuze & Guattari)
Genealogia do Poder (Foucault)
Desconstrução (Derrida)
Fenomenologia
```

### Ciência
```
Cibernética
Teoria dos Sistemas Complexos
Mecânica Quântica
Neurociência Computacional
```

### Interdisciplinar
```
Arte Generativa
Ecologia Profunda
Pensamento Sistêmico
Biologia Teórica
```

### Específico
```
Feedback Loops em Cibernética
Autopoiese de Maturana e Varela
Teoria da Informação de Shannon
Estruturalismo vs Pós-Estruturalismo
```

---

## 7. Dicas de Uso

### Para melhores resultados:

1. **Queries específicas** > genéricas
   - ✅ "Teoria dos Grafos"
   - ❌ "Matemática"

2. **Medium** é o tamanho ideal
   - Small: Muito superficial
   - Medium: **Sweet spot**
   - Large: Pode ser lento

3. **Balanced** é o estilo mais versátil
   - Concepts: Só ideias abstratas
   - People+Works: Focado em bibliografia
   - Methods: Ferramentas práticas
   - **Balanced**: Mix completo

4. **Use as Search Queries**
   - São o "link" real para pesquisa
   - Copie e cole no Google Scholar
   - Verifique a bibliografia sugerida

5. **Living Layout OFF** para screenshots
   - Desliga animação
   - Mapa fica estático
   - Melhor para captura

---

## 8. Atalhos e Truques

### Navegação Rápida

- **Clique no nó** → Abre Inspector
- **Clique em conexão** → Navega para o nó
- **Clique no canvas vazio** → Fecha Inspector

### Cache

- **Mesma query?** → Carrega do cache (instantâneo)
- **Query diferente?** → Gera novo mapa
- **Cache cheio?** → Deleta os mais antigos (automático)

### Export

- **JSON** → Backup permanente
- **Load depois** → Via import (futuro)

---

## 9. Resolução de Problemas

### "Insira um tópico"
→ Você esqueceu de digitar no campo de texto

### "API key não configurada"
→ Configure no .env ou Settings

### "Network error"
→ Verifique conexão ou API key inválida

### "Mapa carregado do cache"
→ Query já foi gerada antes. Mude ligeiramente se quiser novo mapa

### Nó não clica
→ Clique diretamente no círculo ou no label

---

## 10. Próximos Passos

### Explore

- Gere mapas de diferentes disciplinas
- Compare estilos de output
- Experimente Living Layout
- Navegue pelas conexões

### Aprenda Mais

- [README.md](./README.md) — Documentação completa
- [DEV_REFERENCE.md](./DEV_REFERENCE.md) — Para desenvolvedores
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) — Problemas comuns

### Avançado

- Configure providers alternativos (Anthropic, Ollama)
- Export/import de mapas
- Customize presets visuais

---

**Pronto!** Você já sabe usar o Rhizome Search. Bom mapeamento! 🗺️✨

---

**Versão**: 1.0.0  
**Data**: 2026-02-22  
**Feedback**: Reporte bugs e sugestões via issues
