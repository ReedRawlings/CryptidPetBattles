import type { ZoneMap, MapNode, NodeType } from '../../types';

const ROWS = 15; // 0-13 = normal, 14 = boss
const NUM_PATHS = 6; // Number of paths from start to boss (like StS ~6 paths)

// Fixed node types for specific rows
const FIXED_ROWS: Record<number, NodeType> = {
  0: 'battle',   // First encounter
  13: 'rest',    // Rest before boss
  14: 'boss',    // Boss
};

// Rows where we guarantee specific types somewhere in the row
const GUARANTEED_ROWS: Record<number, NodeType> = {
  2: 'shop',     // Early shop access
  6: 'rest',     // Mid-run rest
};

// Weighted pick from a distribution
function weightedPick(weights: { type: NodeType; weight: number }[]): NodeType {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.type;
  }
  return weights[0].type;
}

/**
 * Slay the Spire-style map generation.
 *
 * Algorithm:
 * 1. Generate NUM_PATHS independent paths from row 0 to row 14
 * 2. Each path is a sequence of node columns (one per row)
 * 3. Paths can share nodes when they land on the same column in the same row
 * 4. Connections never cross (if path A is left of path B in row N, A stays left or meets B in row N+1)
 * 5. After paths are built, assign node types with constraints:
 *    - Fixed rows get their fixed type
 *    - No two consecutive non-battle nodes along any path
 *    - ~50% of flexible nodes are battles
 */
export function generateZoneMap(zoneId: number): ZoneMap {
  // Step 1: Generate paths as column indices per row
  const paths = generatePaths();

  // Step 2: Collect unique nodes from all paths
  const nodeGrid = new Map<string, { row: number; col: number }>();
  for (const path of paths) {
    for (let row = 0; row < ROWS; row++) {
      const col = path[row];
      const key = `${row}-${col}`;
      if (!nodeGrid.has(key)) {
        nodeGrid.set(key, { row, col });
      }
    }
  }

  // Step 3: Build connections from paths (no crossing guaranteed by path generation)
  const connectionSet = new Map<string, Set<string>>();
  for (const path of paths) {
    for (let row = 0; row < ROWS - 1; row++) {
      const fromKey = `${row}-${path[row]}`;
      const toKey = `${row + 1}-${path[row + 1]}`;
      if (!connectionSet.has(fromKey)) connectionSet.set(fromKey, new Set());
      connectionSet.get(fromKey)!.add(toKey);
    }
  }

  // Step 4: Assign node types with path-aware constraints
  const nodeTypes = assignNodeTypes(paths, nodeGrid, connectionSet);

  // Step 5: Build MapNode objects
  const nodes: MapNode[] = [];
  const keyToId = new Map<string, string>();

  // Sort by row then column for consistent ordering
  const sortedEntries = [...nodeGrid.entries()].sort((a, b) => {
    if (a[1].row !== b[1].row) return a[1].row - b[1].row;
    return a[1].col - b[1].col;
  });

  for (const [key, { row, col }] of sortedEntries) {
    const id = `z${zoneId}-r${row}-c${col}`;
    keyToId.set(key, id);

    const type = nodeTypes.get(key)!;
    const node: MapNode = {
      id,
      row,
      column: col,
      type,
      connections: [],
      completed: false,
    };

    if (type === 'battle' || type === 'boss') {
      node.enemyPreview = {
        count: getEnemyCount(row, type === 'boss'),
        maxTier: getMaxEnemyTier(zoneId, row),
      };
    }

    nodes.push(node);
  }

  // Wire connections using real node IDs
  for (const [fromKey, toKeys] of connectionSet.entries()) {
    const fromId = keyToId.get(fromKey)!;
    const fromNode = nodes.find((n) => n.id === fromId)!;
    for (const toKey of toKeys) {
      const toId = keyToId.get(toKey)!;
      if (!fromNode.connections.includes(toId)) {
        fromNode.connections.push(toId);
      }
    }
  }

  return { zoneId, nodes, currentNodeId: null };
}

/**
 * Generate NUM_PATHS non-crossing paths from row 0 to row 14.
 * Each path is an array of column indices (one per row).
 * Paths start spread across columns and drift randomly, never crossing each other.
 */
function generatePaths(): number[][] {
  const paths: number[][] = [];

  // Row 0 and row 14 are single nodes — all paths share column 0
  for (let p = 0; p < NUM_PATHS; p++) {
    paths.push(new Array(ROWS).fill(0));
    paths[p][0] = 0;               // All start at the single start node
    paths[p][ROWS - 1] = 0;        // All end at the single boss node
  }

  // For rows 1-13, assign columns. Paths spread out then converge.
  for (let row = 1; row < ROWS - 1; row++) {
    // How wide can we spread? Peaks in the middle rows
    const midpoint = (ROWS - 1) / 2;
    const spread = Math.max(2, Math.round(4 * (1 - Math.abs(row - midpoint) / midpoint)));
    const maxCol = spread - 1;

    // Assign columns to each path, maintaining sorted order (no crossing)
    const cols: number[] = [];
    for (let p = 0; p < NUM_PATHS; p++) {
      const prevCol = paths[p][row - 1];
      // Drift: -1, 0, or +1 from previous column, clamped to [0, maxCol]
      const drift = Math.floor(Math.random() * 3) - 1;
      const newCol = Math.max(0, Math.min(maxCol, prevCol + drift));
      cols.push(newCol);
    }

    // Sort to maintain non-crossing invariant
    cols.sort((a, b) => a - b);

    for (let p = 0; p < NUM_PATHS; p++) {
      paths[p][row] = cols[p];
    }
  }

  return paths;
}

/**
 * Assign node types respecting:
 * - Fixed rows (row 0 = battle, row 13 = rest, row 14 = boss)
 * - Guaranteed types in specific rows (row 2 has at least one shop, row 6 has at least one rest)
 * - No two consecutive non-battle nodes along any path
 * - ~50% battles overall for flexible nodes
 */
function assignNodeTypes(
  paths: number[][],
  nodeGrid: Map<string, { row: number; col: number }>,
  _connectionSet: Map<string, Set<string>>
): Map<string, NodeType> {
  const types = new Map<string, NodeType>();

  // Assign fixed rows first
  for (const [key, { row }] of nodeGrid.entries()) {
    if (FIXED_ROWS[row] !== undefined) {
      types.set(key, FIXED_ROWS[row]);
    }
  }

  // Collect flexible nodes by row
  const flexibleByRow = new Map<number, string[]>();
  for (const [key, { row }] of nodeGrid.entries()) {
    if (types.has(key)) continue;
    if (!flexibleByRow.has(row)) flexibleByRow.set(row, []);
    flexibleByRow.get(row)!.push(key);
  }

  // Process rows in order so we can check parent types
  const sortedRows = [...flexibleByRow.keys()].sort((a, b) => a - b);

  for (const row of sortedRows) {
    const keysInRow = flexibleByRow.get(row)!;
    const guaranteed = GUARANTEED_ROWS[row];
    let guaranteedAssigned = false;

    for (const key of keysInRow) {
      // Check if ALL parents along any path are non-battle
      // If so, this node MUST be battle to prevent consecutive non-combat
      const parentKeys = getParentKeys(key, paths);
      const allParentsNonBattle = parentKeys.length > 0 && parentKeys.every((pk) => {
        const t = types.get(pk);
        return t !== undefined && t !== 'battle' && t !== 'boss';
      });

      if (allParentsNonBattle) {
        types.set(key, 'battle');
        continue;
      }

      // If this is a guaranteed row and we haven't placed the guaranteed type yet
      if (guaranteed && !guaranteedAssigned) {
        types.set(key, guaranteed);
        guaranteedAssigned = true;
        continue;
      }

      // Weighted pick — battle-heavy to maintain ~50%
      // If any parent is non-battle, increase battle weight to avoid chains
      const anyParentNonBattle = parentKeys.some((pk) => {
        const t = types.get(pk);
        return t !== undefined && t !== 'battle' && t !== 'boss';
      });

      const weights = anyParentNonBattle
        ? [
            { type: 'battle' as NodeType, weight: 70 },
            { type: 'shop' as NodeType, weight: 10 },
            { type: 'rest' as NodeType, weight: 10 },
            { type: 'event' as NodeType, weight: 10 },
          ]
        : [
            { type: 'battle' as NodeType, weight: 45 },
            { type: 'shop' as NodeType, weight: 15 },
            { type: 'rest' as NodeType, weight: 15 },
            { type: 'event' as NodeType, weight: 25 },
          ];

      types.set(key, weightedPick(weights));
    }

    // If guaranteed type wasn't placed (all nodes were forced to battle), override one
    if (guaranteed && !guaranteedAssigned && keysInRow.length > 0) {
      const overrideKey = keysInRow[keysInRow.length - 1];
      types.set(overrideKey, guaranteed);
    }
  }

  return types;
}

/**
 * Get all parent node keys (from the row above) that connect to this node,
 * based on the path data.
 */
function getParentKeys(key: string, paths: number[][]): string[] {
  const [rowStr, colStr] = key.split('-');
  const row = parseInt(rowStr);
  const col = parseInt(colStr);
  if (row === 0) return [];

  const parentCols = new Set<number>();
  for (const path of paths) {
    if (path[row] === col) {
      parentCols.add(path[row - 1]);
    }
  }

  return [...parentCols].map((c) => `${row - 1}-${c}`);
}

function getEnemyCount(row: number, isBoss: boolean): number {
  if (isBoss) return 2 + Math.floor(Math.random() * 2); // 2-3 (boss + 1-2 allies)
  if (row === 0) return 2; // First fight is always easy: max 2 enemies
  if (row <= 3) return 2 + Math.floor(Math.random() * 2); // 2-3
  if (row <= 8) return 3 + Math.floor(Math.random() * 2); // 3-4
  return 4 + Math.floor(Math.random() * 2); // 4-5
}

function getMaxEnemyTier(zoneId: number, row: number): number {
  if (zoneId === 1) {
    if (row >= 11) return 2; // Last 3 events have T2
    return 1;
  }
  // Future zones
  return Math.min(zoneId + 1, 4);
}

/**
 * Get reachable nodes from the current position.
 */
export function getReachableNodes(map: ZoneMap): MapNode[] {
  if (!map.currentNodeId) {
    // Start of run: first row nodes are reachable
    return map.nodes.filter((n) => n.row === 0);
  }

  const currentNode = map.nodes.find((n) => n.id === map.currentNodeId);
  if (!currentNode) return [];

  return map.nodes.filter((n) => currentNode.connections.includes(n.id));
}
