# Rhizome Search — Developer Reference

Quick reference for developers working on the Rhizome Search system.

---

## Architecture Overview

```
User Input (query)
    ↓
RhizomeSearchPanel (UI)
    ↓
llmClient.ts (API call)
    ↓
schema.ts (validation)
    ↓
mapBuilder.ts (layout)
    ↓
renderer.ts (canvas)
    ↓
User clicks node
    ↓
NodeInspector (drawer)
```

---

## Key Files

### Core Logic

- **types.ts**: All TypeScript interfaces
- **schema.ts**: JSON schema, system prompt, validation
- **llmClient.ts**: LLM API calls with retry/timeout
- **mapBuilder.ts**: Force-directed layout & living layout
- **mapCache.ts**: localStorage persistence
- **nodeInspector.ts**: Node selection logic
- **renderer.ts**: Canvas rendering

### UI Components

- **RhizomeSearchPanel.tsx**: Main panel (search form + canvas)
- **NodeInspector.tsx**: Drawer for node details
- **MapLibrary.tsx**: Drawer for saved maps

---

## Data Flow

### 1. User submits query

```typescript
RhizomeSearchPanel.handleGenerate()
  → Check cache first (getCachedMap)
  → If not cached, call generateKnowledgeMap()
  → llmClient builds prompt from schema
  → Calls LLM API
  → Returns raw JSON
  → Validates with validateKnowledgeMap()
  → Returns KnowledgeMap object
```

### 2. Map rendering

```typescript
KnowledgeMap
  → cleanMap() (dedupe nodes, remove invalid edges)
  → ensureConnectedness() (add auto-bridges if needed)
  → initializePositions() (cluster-based circle layout)
  → runForceLayout() (force-directed, 200-500 iterations)
  → renderKnowledgeMap() (canvas rendering)
  → Optional: updateLivingLayout() (breathing animation)
```

### 3. User clicks node

```typescript
Canvas onClick
  → findNodeAtPosition(x, y)
  → setSelectedNodeId(node.id)
  → Open NodeInspector drawer
  → Display: bullets, connections, queries, bibliography
```

---

## Key Functions

### llmClient.ts

```typescript
generateKnowledgeMap(request: RhizomeSearchRequest): Promise<KnowledgeMap>
```
- Resolves API key from multiple sources
- Builds system + user prompt
- Calls LLM API with timeout/retry
- Validates response
- Returns KnowledgeMap

### schema.ts

```typescript
validateKnowledgeMap(raw: any): KnowledgeMap
```
- Type checks all required fields
- Validates nodes/edges/clusters arrays
- Ensures proper structure
- Throws error with clear message if invalid

```typescript
buildUserPrompt(query: string, nodeCount: number, style: string): string
```
- Creates detailed prompt for LLM
- Includes schema in-prompt
- Instructs on rhizomatic structure

### mapBuilder.ts

```typescript
initializePositions(map: KnowledgeMap, width: number, height: number): void
```
- Places cluster centroids in circle
- Jitters nodes around centroids
- Sets initial velocities to 0

```typescript
runForceLayout(map: KnowledgeMap, width: number, height: number, config?: LayoutConfig): void
```
- Runs force-directed simulation
- Repulsion between all nodes
- Spring attraction on connected nodes
- Center gravity to prevent drift
- Damping to stabilize
- Bounds checking

```typescript
updateLivingLayout(map: KnowledgeMap, dt: number, config?: LayoutConfig): void
```
- Adds breathing animation
- Uses sine wave noise
- Does NOT change topology
- Can toggle on/off without recompute

```typescript
ensureConnectedness(map: KnowledgeMap): void
```
- Detects disconnected components
- Adds minimal edges to connect
- Marks auto-added edges as is_long

```typescript
cleanMap(map: KnowledgeMap): void
```
- Deduplicates nodes by ID
- Removes edges with invalid source/target
- Removes self-loops

### renderer.ts

```typescript
renderKnowledgeMap(ctx: CanvasRenderingContext2D, map: KnowledgeMap, width: number, height: number, selectedNodeId?: string): void
```
- Clears canvas (black background)
- Renders edges first
- Renders nodes second
- Renders labels last
- Highlights selected node

### mapCache.ts

```typescript
cacheMap(map: KnowledgeMap): void
```
- Generates unique ID from (query + size + style)
- Stores in localStorage
- Keeps max 12 maps (FIFO)

```typescript
getCachedMap(query: string, size: MapSize, style: OutputStyle): KnowledgeMap | null
```
- Generates same unique ID
- Retrieves from localStorage
- Returns null if not found

```typescript
getAllCachedMaps(): MapCacheEntry[]
```
- Returns all cached maps with metadata
- Sorted by generatedAt (newest first)

### nodeInspector.ts

```typescript
findNodeAtPosition(map: KnowledgeMap, x: number, y: number, radius?: number): KnowledgeNode | null
```
- Checks distance from click to each node
- Returns closest node within radius
- Returns null if none found

---

## Configuration

### Environment Variables

```typescript
// Priority order:
1. request.apiKey (user input)
2. VITE_RHIZOME_LLM_API_KEY (highest priority env)
3. VITE_OPENAI_API_KEY (fallback env)
4. window.__APP_CONFIG__.OPENAI_API_KEY (runtime)
```

### Constants

```typescript
// types.ts
export const MAP_SIZE_NODE_COUNT: Record<MapSize, number> = {
  small: 40,
  medium: 80,
  large: 150,
};

export const MAX_VISIBLE_LINKS = 160; // Performance limit
export const BRIDGE_HALO_RADIUS = 8; // White halo around bridges

// schema.ts
export const RHIZOME_SEARCH_SYSTEM_PROMPT = `...`;
```

---

## Styling

### Color Palette

```typescript
// Rhizome aesthetic (dark background)
Background:        '#000000'
Clusters:          cluster.colorHint (e.g., '#7c3aed' purple)
Nodes by type:
  - person:        '#fbbf24' (gold)
  - work:          '#60a5fa' (blue)
  - method:        '#34d399' (green)
  - concept:       cluster color
  - discipline:    cluster color
Links (normal):    'rgba(124, 58, 237, 0.3)' (purple)
Links (is_long):   'rgba(255, 59, 213, 0.4)' (magenta)
Bridge halo:       'rgba(255, 255, 255, 0.15)' (white)
Selected halo:     'rgba(255, 255, 255, 0.4)' (bright white)
```

### Node Sizes

```typescript
Base radius:       4
With importance:   4 + importance * 3  (max ~7)
Bridges:           +1.5 extra
```

---

## Testing

### Manual Test Checklist

- [ ] Generate map (Small/Medium/Large)
- [ ] Try all Output Styles
- [ ] Click node → Inspector opens
- [ ] Click connection → Navigates
- [ ] Copy search query → Clipboard works
- [ ] Toggle Living Layout → Animation starts/stops
- [ ] Open Library → Shows cached maps
- [ ] Load cached map → Instant
- [ ] Rename map → Persists
- [ ] Export JSON → Downloads
- [ ] Delete map → Removed from cache
- [ ] Settings → API key saves (session only)

### Edge Cases to Test

- [ ] Empty query
- [ ] Invalid API key
- [ ] Network timeout
- [ ] JSON parse error from LLM
- [ ] Duplicate nodes in response
- [ ] Invalid edges in response
- [ ] Disconnected graph
- [ ] Cache full (>12 maps)

---

## Common Tasks

### Add a new node type

1. Update `NodeType` in `types.ts`
2. Update `buildUserPrompt` in `schema.ts` to mention it
3. Update color logic in `renderer.ts`

### Change default map size

Update `MAP_SIZE_NODE_COUNT` in `types.ts`.

### Adjust force layout

Modify `DEFAULT_LAYOUT_CONFIG` in `types.ts`:

```typescript
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  iterations: 300,           // More = better quality, slower
  repulsionStrength: 5000,   // Higher = more spread out
  springStrength: 0.02,      // Higher = tighter clusters
  springLength: 80,          // Ideal edge length
  centerGravity: 0.01,       // Higher = more centered
  damping: 0.85,             // Lower = more bouncy
  // ...
};
```

### Change LLM timeout

In `llmClient.ts`, line ~80:

```typescript
const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s
```

### Adjust cache size

In `mapCache.ts`, line ~10:

```typescript
const MAX_CACHED_MAPS = 12; // Change this
```

---

## Performance Tips

### For large maps (150+ nodes):

1. Reduce `iterations` in force layout (e.g., 200 instead of 500)
2. Increase `damping` to stabilize faster (e.g., 0.9)
3. Disable Living Layout by default
4. Reduce `MAX_VISIBLE_LINKS` (e.g., 100 instead of 160)

### For slow LLMs:

1. Increase timeout to 30-40s
2. Add progress indicator (not implemented yet)
3. Use faster model (gpt-3.5-turbo instead of gpt-4o)

---

## Debugging

### Enable verbose logging

```typescript
// In llmClient.ts, add console.log statements:
console.log('[LLM Request]', { query, nodeCount, style });
console.log('[LLM Response]', rawText);
console.log('[Validated Map]', map);
```

### Check localStorage

```javascript
// In browser console:
const maps = localStorage.getItem('rhizome_search_maps');
console.log(JSON.parse(maps));
```

### Inspect force layout

```typescript
// In mapBuilder.ts, after runForceLayout:
console.log('Final positions:', map.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
```

---

## API Reference

### Types

```typescript
type MapSize = 'small' | 'medium' | 'large';
type OutputStyle = 'concepts' | 'people_works' | 'methods' | 'balanced';
type NodeType = 'concept' | 'person' | 'work' | 'method' | 'discipline';

interface KnowledgeNode {
  id: string;
  label: string;
  type: NodeType;
  cluster: string;
  importance: number;  // 0..1
  keywords: string[];
  inspector: NodeInspectorData;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number;  // 0..1
  relation: string;
  is_long: boolean;
}

interface KnowledgeMap {
  title: string;
  summary: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: KnowledgeCluster[];
  bridges: string[];
  recommended_presets: RecommendedPresets;
  generatedAt: number;
  query: string;
  mapSize: MapSize;
  outputStyle: OutputStyle;
}
```

---

## Troubleshooting Development Issues

### "Cannot find module '../rhizome_search'"

Fix: Check import path in RhizomeLab.tsx should be `'../../rhizome_search'`.

### "Property 'x' does not exist on type 'KnowledgeNode'"

Fix: Node positions are optional. Always check `node.x !== undefined` before using.

### "Cannot read property 'x' of undefined"

Fix: Check edge validity before rendering (source/target must exist in nodes array).

### Force layout diverges (nodes fly off screen)

Fix: Increase `damping` or reduce `repulsionStrength`.

### Living layout is too chaotic

Fix: Reduce `livingNoiseScale` in config (default 0.3 → try 0.15).

---

## Code Style

### Naming conventions

- **Files**: camelCase (e.g., `llmClient.ts`)
- **Components**: PascalCase (e.g., `RhizomeSearchPanel`)
- **Functions**: camelCase (e.g., `generateKnowledgeMap`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_VISIBLE_LINKS`)
- **Types**: PascalCase (e.g., `KnowledgeMap`)

### Comment style

```typescript
// ── Section Header ────────────────────────────────────────────────────────────

// Function comment
export function myFunction() {
  // Implementation comment
  const x = 1;
  return x;
}
```

---

## Build & Deploy

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
```

Output: `/dist` folder.

### Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
# Edit .env with your API keys
```

---

**Last Updated**: 2026-02-22  
**Version**: 1.0.0  
**Maintainer**: Staff Engineer + Systems Designer
