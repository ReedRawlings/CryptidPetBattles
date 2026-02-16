import { useState, useMemo } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import { getReachableNodes } from '../../game/roguelite/mapGen';
import type { MapNode, NodeType } from '../../types';
import { CreatureTooltip } from './CreatureTooltip';
import './RunMap.css';

const NODE_ICONS: Record<NodeType, string> = {
  battle: '\u2694',   // crossed swords
  boss: '\u2620',     // skull
  shop: '\u2733',     // star
  rest: '\u2665',     // heart
  event: '?',
};

const NODE_LABELS: Record<NodeType, string> = {
  battle: 'Battle',
  boss: 'BOSS',
  shop: 'Shop',
  rest: 'Rest',
  event: 'Event',
};

const POSITION_LABELS = ['Front 1', 'Front 2', 'Back 1', 'Back 2', 'Back 3'];

// Layout constants
const NODE_W = 90;
const NODE_H = 56;
const ROW_GAP = 72;
const COL_GAP = 110;
const PAD_X = 60;
const PAD_TOP = 40;
const PAD_BOTTOM = 20;

export function RunMap() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // Compute node positions (memoized since map data doesn't change mid-render)
  const { nodePositions, svgWidth, svgHeight } = useMemo(() => {
    if (!run) return { nodePositions: new Map<string, { x: number; y: number }>(), svgWidth: 0, svgHeight: 0 };

    const positions = new Map<string, { x: number; y: number }>();

    // Group by row
    const rows = new Map<number, MapNode[]>();
    let mRow = 0;
    for (const node of run.map.nodes) {
      if (!rows.has(node.row)) rows.set(node.row, []);
      rows.get(node.row)!.push(node);
      if (node.row > mRow) mRow = node.row;
    }

    // Find max columns for width
    let maxCols = 1;
    for (const nodes of rows.values()) {
      if (nodes.length > maxCols) maxCols = nodes.length;
    }

    const totalWidth = PAD_X * 2 + (maxCols - 1) * COL_GAP + NODE_W;
    const totalHeight = PAD_TOP + PAD_BOTTOM + mRow * ROW_GAP + NODE_H;

    // Position each node — row 0 at bottom, maxRow at top
    for (const [row, nodes] of rows.entries()) {
      const rowWidth = (nodes.length - 1) * COL_GAP;
      const startX = (totalWidth - rowWidth) / 2;
      // Flip: row 0 = bottom, higher rows = higher up
      const y = totalHeight - PAD_BOTTOM - NODE_H - row * ROW_GAP;

      for (let i = 0; i < nodes.length; i++) {
        const x = startX + i * COL_GAP;
        positions.set(nodes[i].id, { x, y });
      }
    }

    return { nodePositions: positions, svgWidth: totalWidth, svgHeight: totalHeight };
  }, [run]);

  if (!run) return <div>No active run</div>;

  const reachable = getReachableNodes(run.map);
  const reachableIds = new Set(reachable.map((n) => n.id));
  const nodeById = new Map(run.map.nodes.map((n) => [n.id, n]));

  const handleNodeClick = (node: MapNode) => {
    if (!reachableIds.has(node.id)) return;
    dispatch({ type: 'SELECT_NODE', nodeId: node.id });
  };

  const handleSlotClick = (index: number) => {
    if (swapSource === null) {
      setSwapSource(index);
    } else {
      if (swapSource !== index) {
        dispatch({ type: 'SWAP_TEAM', indexA: swapSource, indexB: index });
      }
      setSwapSource(null);
    }
  };

  // Clip a line endpoint from center (cx,cy) toward target (tx,ty) to the rectangle edge
  const clipToEdge = (cx: number, cy: number, tx: number, ty: number) => {
    const dx = tx - cx;
    const dy = ty - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const hw = NODE_W / 2;
    const hh = NODE_H / 2;
    const sx = hw / Math.abs(dx || 0.001);
    const sy = hh / Math.abs(dy || 0.001);
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  };

  // Build connection lines (clipped to node edges)
  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; reachable: boolean; completed: boolean }[] = [];
  for (const node of run.map.nodes) {
    const fromPos = nodePositions.get(node.id);
    if (!fromPos) continue;
    for (const connId of node.connections) {
      const toPos = nodePositions.get(connId);
      if (!toPos) continue;
      const toNode = nodeById.get(connId);
      const fromCx = fromPos.x + NODE_W / 2;
      const fromCy = fromPos.y + NODE_H / 2;
      const toCx = toPos.x + NODE_W / 2;
      const toCy = toPos.y + NODE_H / 2;
      connections.push({
        from: clipToEdge(fromCx, fromCy, toCx, toCy),
        to: clipToEdge(toCx, toCy, fromCx, fromCy),
        reachable: reachableIds.has(connId) && (node.completed || node.id === run.map.currentNodeId || !run.map.currentNodeId),
        completed: node.completed && (toNode?.completed ?? false),
      });
    }
  }

  const tribeCounts: Record<string, number> = {};
  for (const c of run.team) {
    if (c && !c.isDead) tribeCounts[c.type] = (tribeCounts[c.type] || 0) + 1;
  }

  const TRIBE_SYNERGIES: { tribe: string; thresholds: number[]; labels: string[] }[] = [
    { tribe: 'Flora', thresholds: [2, 3], labels: ['+2 HP', '+4 HP'] },
    { tribe: 'Fauna', thresholds: [2, 3, 5], labels: ['+1 ATK', '+2 ATK', '+3 ATK'] },
    { tribe: 'Kami', thresholds: [2, 3], labels: ['+1 gold/battle', '+2 gold/battle'] },
    { tribe: 'Spirit', thresholds: [2, 3, 5], labels: ['Bone (2/2)', 'Bone (3/3)', 'Bone (4/4)'] },
    { tribe: 'Dessert', thresholds: [2, 3, 5], labels: ['2 AoE', '3 AoE', '5 AoE all'] },
  ];

  // Only show tribes that are represented on the team
  const activeTribeInfo = TRIBE_SYNERGIES.filter((s) => (tribeCounts[s.tribe] ?? 0) > 0);

  return (
    <div className="run-map">
      <div className="run-map__team-summary">
        <div className="run-map__team-header">
          <h3>Your Team</h3>
          <span className="run-map__team-hint">Click two slots to swap positions</span>
        </div>

        {activeTribeInfo.length > 0 && (
          <div className="run-map__synergies">
            {activeTribeInfo.map((syn) => {
              const count = tribeCounts[syn.tribe] ?? 0;
              const activeLevel = syn.thresholds.filter((t) => count >= t).length;
              return (
                <div key={syn.tribe} className={`run-map__synergy ${activeLevel > 0 ? 'run-map__synergy--active' : ''}`}>
                  <span className="run-map__synergy-tribe">{syn.tribe}</span>
                  <span className="run-map__synergy-count">{count}</span>
                  <div className="run-map__synergy-pips">
                    {syn.thresholds.map((t, i) => (
                      <span
                        key={t}
                        className={`run-map__synergy-pip ${count >= t ? 'run-map__synergy-pip--filled' : ''}`}
                        title={syn.labels[i]}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  {activeLevel > 0 && (
                    <span className="run-map__synergy-bonus">{syn.labels[activeLevel - 1]}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="run-map__team-list">
          {run.team.map((creature, i) => {
            const isSwapSource = swapSource === i;
            const isSwapTarget = swapSource !== null && swapSource !== i;

            if (!creature) {
              return (
                <button
                  key={i}
                  className={`run-map__team-slot run-map__team-slot--empty ${isSwapSource ? 'run-map__team-slot--swap-source' : ''} ${isSwapTarget ? 'run-map__team-slot--swap-target' : ''}`}
                  onClick={() => handleSlotClick(i)}
                >
                  <span className="run-map__slot-label">{POSITION_LABELS[i]}</span>
                  Empty
                </button>
              );
            }
            return (
              <div
                key={creature.id}
                className="run-map__team-slot-wrapper"
                onMouseEnter={() => setHoveredSlot(i)}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                <button
                  className={`run-map__team-slot ${creature.isDead ? 'run-map__team-slot--dead' : ''} ${isSwapSource ? 'run-map__team-slot--swap-source' : ''} ${isSwapTarget ? 'run-map__team-slot--swap-target' : ''}`}
                  onClick={() => handleSlotClick(i)}
                >
                  <span className="run-map__slot-label">{POSITION_LABELS[i]}</span>
                  <span className="run-map__creature-name">{creature.name}</span>
                  <span className="run-map__creature-stats">
                    T{creature.tier} Lv{creature.level}
                  </span>
                  <div className="run-map__hp-bar">
                    <div
                      className="run-map__hp-fill"
                      style={{ width: `${creature.isDead ? 0 : (creature.currentHealth / creature.maxHealth * 100)}%` }}
                    />
                  </div>
                  <span className="run-map__hp-text">
                    {creature.isDead ? 'DEAD' : `${creature.currentHealth}/${creature.maxHealth}`}
                  </span>
                </button>
                {hoveredSlot === i && (
                  <CreatureTooltip creature={creature} tribeCounts={tribeCounts} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="run-map__path">
        <h3>Choose Your Path</h3>
        <div className="run-map__graph-scroll">
          <div className="run-map__graph" style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
            {/* SVG layer for connection lines */}
            <svg
              className="run-map__svg"
              width={svgWidth}
              height={svgHeight}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              {connections.map((conn, i) => (
                <line
                  key={i}
                  x1={conn.from.x}
                  y1={conn.from.y}
                  x2={conn.to.x}
                  y2={conn.to.y}
                  className={`run-map__line ${conn.reachable ? 'run-map__line--reachable' : ''} ${conn.completed ? 'run-map__line--completed' : ''}`}
                />
              ))}
            </svg>

            {/* Node buttons positioned absolutely */}
            {run.map.nodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;
              const isReachable = reachableIds.has(node.id);
              const isCurrent = node.id === run.map.currentNodeId;

              return (
                <button
                  key={node.id}
                  className={`run-map__node run-map__node--${node.type} ${node.completed ? 'run-map__node--completed' : ''} ${isReachable ? 'run-map__node--reachable' : ''} ${isCurrent ? 'run-map__node--current' : ''}`}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                  onClick={() => handleNodeClick(node)}
                  disabled={!isReachable}
                >
                  <span className="run-map__node-icon">{NODE_ICONS[node.type]}</span>
                  <span className="run-map__node-label">{NODE_LABELS[node.type]}</span>
                  {node.enemyPreview && (
                    <span className="run-map__node-preview">
                      {node.enemyPreview.count} foes
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
