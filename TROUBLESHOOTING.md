# Rhizome Search — Troubleshooting Guide

## Problemas Comuns e Soluções

### 1. "Insira um tópico para pesquisar"

**Problema**: Você clicou em "Gerar Mapa" sem inserir texto.

**Solução**: Digite uma área de conhecimento no campo de texto (ex: "Física Quântica", "Filosofia de Deleuze").

---

### 2. "API key não configurada"

**Problema**: O sistema não encontrou uma API key válida.

**Soluções**:

1. **Via arquivo `.env`** (recomendado para desenvolvimento):
   ```bash
   # Copie o arquivo exemplo
   cp .env.example .env
   
   # Edite .env e adicione sua chave
   VITE_RHIZOME_LLM_API_KEY=sk-your-actual-key-here
   
   # Reinicie o servidor
   npm run dev
   ```

2. **Via UI** (temporário, só para esta sessão):
   - Clique no ícone de engrenagem (Settings)
   - Cole sua API key no campo "API Key"
   - Clique "Salvar"

3. **Via window config** (runtime):
   ```javascript
   window.__APP_CONFIG__ = {
     OPENAI_API_KEY: 'sk-your-key-here'
   };
   ```

**Onde conseguir API key**:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Ollama: Não precisa de key (use `http://localhost:11434/v1` como base URL)

---

### 3. "signal is aborted without reason" ou erro de Timeout

**Este é o erro mais comum!** Aparece quando:
- API key não configurada (90% dos casos)
- Timeout excedido (>60 segundos)
- Requisição cancelada

**Soluções por ordem de prioridade**:

1. **Configure sua API key** (veja item #2 acima)
   - ⚠️ Sem API key configurada, a requisição falha imediatamente
   - Verifique se o arquivo `.env` existe e tem a chave correta
   - Reinicie o servidor após criar/editar `.env`

2. **Se você JÁ tem API key configurada:**
   - Teste se ela está válida: https://platform.openai.com/api-keys
   - Reduza o tamanho do mapa (use "Small" em vez de "Large")
   - Use um modelo mais rápido: `gpt-4o-mini` (padrão)
   - Verifique sua conexão de internet

3. **Timeout específico do servidor:**
   - Query muito complexa pode demorar >60s
   - Tente uma query mais específica (ex: "Teoria Quântica de Campos" em vez de "Física")
   - Reduza o tamanho do mapa para "Small" (40 nós)

---

### 4. "Network error" ou "Failed to fetch"

**Possíveis causas**:

#### A) Problemas de CORS
Se estiver usando um proxy ou endpoint customizado, adicione headers CORS.

#### B) API key inválida
Verifique se a key está correta e ativa no dashboard do provider.

#### C) Servidor offline ou inacessível
O endpoint da API pode estar temporariamente indisponível.

**Soluções**: 
1. Verifique sua API key
2. Teste sua conexão de internet
3. Tente novamente em alguns minutos
4. Use um modelo mais rápido (ex: `gpt-4o-mini`)

---

### 5. "Invalid JSON response"

**Problema**: O LLM retornou texto que não é JSON válido.

**Soluções**:
1. Use um modelo mais confiável (GPT-4o-mini ou superior)
2. Tente gerar novamente (pode ter sido um erro temporário)
3. Reduza o tamanho do mapa (Small em vez de Large)

---

### 6. Mapa gerado mas vazio ou com poucos nós

**Problema**: Validação removeu nós ou edges inválidas.

**Soluções**:
1. Tente uma query mais específica
2. Use Output Style diferente (ex: "Balanced" em vez de "Concepts")
3. Aumente o tamanho do mapa

---

### 7. "Mapa carregado do cache" mas quero gerar novo

**Problema**: O sistema usa cache automático por (query + size + style).

**Solução**:
1. Altere ligeiramente a query (ex: "Física Quântica" → "Mecânica Quântica")
2. Ou mude o tamanho/estilo
3. Ou limpe o cache manualmente:
   ```javascript
   localStorage.removeItem('rhizome_search_maps');
   ```

---

### 8. Node Inspector não abre ao clicar no nó

**Problema**: Clique não registrado.

**Soluções**:
1. Certifique-se de clicar diretamente no círculo do nó
2. Tente clicar no label do nó
3. Verifique se o Living Layout está muito rápido (desligue temporariamente)

---

### 9. Bibliografia sem DOI/ISBN

**Problema**: LLM não tinha certeza sobre a referência.

**Comportamento esperado**: O sistema NÃO inventa DOIs/ISBNs. Se o campo está vazio ou tem badge "Verificar", use as search queries para encontrar a referência real.

**Solução**: Use as queries sugeridas no Node Inspector para pesquisar no Google Scholar, PubMed, etc.

---

### 10. Living Layout deixa o mapa "bagunçado"

**Problema**: Living Layout adiciona movimento contínuo.

**Solução**: 
- Toggle OFF o Living Layout (botão Zap/ZapOff)
- Living Layout NÃO altera a topologia, apenas adiciona "breathing"
- Se preferir estático, mantenha desligado

---

### 11. Erro ao exportar mapa como JSON

**Problema**: Browser bloqueou download.

**Solução**:
1. Permita downloads no seu browser
2. Verifique se não há extensões bloqueando (adblockers)
3. Tente usar outro browser

---

### 12. Mapas antigos aparecem na biblioteca

**Problema**: Cache persiste entre sessões.

**Comportamento esperado**: O sistema guarda os últimos 12 mapas no localStorage.

**Para limpar**:
- Clique no botão Delete de cada mapa
- Ou limpe todo o cache:
  ```javascript
  localStorage.removeItem('rhizome_search_maps');
  ```

---

### 13. Performance ruim com mapas grandes

**Problema**: Muitos nós (Large = 150 nós).

**Soluções**:
1. Use mapas Small ou Medium
2. Desligue Living Layout
3. Reduza o zoom do browser se necessário

---

## Configuração Avançada

### Usando Anthropic Claude

```env
VITE_RHIZOME_LLM_API_KEY=sk-ant-your-key-here
VITE_RHIZOME_LLM_BASE_URL=https://api.anthropic.com/v1/messages
VITE_RHIZOME_LLM_MODEL=claude-3-5-haiku-20241022
```

**Nota**: Pode precisar adaptar o formato da chamada (Anthropic usa formato diferente de OpenAI).

---

### Usando Ollama (LLM local)

```env
VITE_RHIZOME_LLM_BASE_URL=http://localhost:11434/v1
VITE_RHIZOME_LLM_MODEL=llama3.2
# Não precisa de API key
```

**Requisitos**:
1. Ollama instalado e rodando
2. Modelo baixado (`ollama pull llama3.2`)
3. Servidor em `localhost:11434`

---

## Logs de Debug

Para ver logs detalhados no console:

```javascript
// No console do browser
localStorage.setItem('rhizome_debug', 'true');
```

Depois recarregue a página. Os logs de geração aparecerão no console.

---

## Verificação de Funcionamento

### Checklist Básico

- [ ] API key configurada (via .env ou UI)
- [ ] Servidor dev rodando (`npm run dev`)
- [ ] Browser moderno (Chrome/Firefox/Safari/Edge atualizado)
- [ ] Conexão com internet ativa
- [ ] Console sem erros de JavaScript

### Teste Rápido

1. Abra Rhizome Lab
2. Expanda "LLM Epistêmico"
3. Clique "Abrir Rhizome Search"
4. Digite "Cibernética"
5. Clique "Gerar Mapa"
6. Aguarde ~5-10 segundos
7. Clique em qualquer nó
8. Node Inspector deve abrir

Se tudo funcionar, o sistema está OK! ✅

---

## Suporte Adicional

### Arquivos de Log

Verifique o console do browser (F12 → Console) para mensagens de erro detalhadas.

### Informações para Reportar Bug

Se encontrar um bug, inclua:

1. **Mensagem de erro** (screenshot ou texto do console)
2. **Query usada** (ex: "Física Quântica")
3. **Configurações** (Map Size, Output Style)
4. **Provider** (OpenAI/Anthropic/Ollama)
5. **Browser e versão** (ex: Chrome 120)
6. **Steps to reproduce** (passo a passo)

---

## Limitações Conhecidas

1. **Cache por query exata**: Pequenas mudanças na query geram novo mapa
2. **Máximo 12 mapas** no cache (limite arbitrário para performance)
3. **Timeout de 60s**: Queries muito complexas podem falhar
4. **Sem undo/redo**: Uma vez gerado, não dá para editar nós manualmente
5. **Bibliografia**: Sempre verificar (LLM pode sugerir referências aproximadas)

---

## Dicas de Uso

### Para melhores resultados:

1. **Queries específicas** funcionam melhor que genéricas
   - ✅ "Teoria dos Sistemas Complexos"
   - ❌ "Filosofia"

2. **Tamanho adequado**:
   - Small (40): Overview rápido
   - Medium (80): Equilíbrio ideal
   - Large (150): Exploração profunda (mais lento)

3. **Output Style**:
   - Concepts: Ideias abstratas
   - People+Works: Autores e obras
   - Methods: Ferramentas e técnicas
   - Balanced: Mix de tudo

4. **Living Layout**:
   - OFF: Estático, boa para screenshots
   - ON: Vivo, boa para exploração

5. **Use as Search Queries**: Elas são o link real para pesquisa aprofundada

---

**Última atualização**: 2026-02-22  
**Versão do sistema**: 1.0.0
