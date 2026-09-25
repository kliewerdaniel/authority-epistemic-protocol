/**
 * Knowledge Graph Visualization Component
 * 
 * A simple SVG-based graph visualization for the knowledge graph.
 * Nodes are positionable and clickable to reveal details.
 */

import { KnowledgeGraph, GraphNode, GraphEdge } from '@/lib/graph';
import { GraphNodeType } from '@/schemas/types';

interface GraphVisualizationProps {
  graph: KnowledgeGraph;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

// Node colors by type
const nodeColors: Record<GraphNodeType, { fill: string; stroke: string; text: string }> = {
  CLAIM: { fill: '#1e293b', stroke: '#3b82f6', text: '#93c5fd' },
  EVIDENCE: { fill: '#1e293b', stroke: '#10b981', text: '#6ee7b7' },
  AUTHORITY: { fill: '#1e293b', stroke: '#8b5cf6', text: '#c4b5fd' },
  SOURCE: { fill: '#1e293b', stroke: '#f59e0b', text: '#fcd34d' },
  IDENTITY: { fill: '#1e293b', stroke: '#ec4899', text: '#f9a8d4' },
  ARTIFACT: { fill: '#1e293b', stroke: '#64748b', text: '#94a3b8' },
};

// Edge colors by type
const edgeColors: Record<string, string> = {
  ASSERTS: '#3b82f6',
  SUPPORTS: '#10b981',
  CONTRADICTS: '#ef4444',
  AUTHORIZES: '#8b5cf6',
  SUPERSEDES: '#f59e0b',
  DERIVES_FROM: '#64748b',
  SCOPED_TO: '#06b6d4',
  ISSUED_BY: '#ec4899',
};

export function GraphVisualization({
  graph,
  selectedNodeId,
  onNodeSelect,
  onNodeDoubleClick,
}: GraphVisualizationProps) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <p className="text-slate-500 text-sm">No graph data available</p>
      </div>
    );
  }

  // Calculate bounds
  const nodesWithPosition = graph.nodes.filter(n => n.x !== undefined && n.y !== undefined);
  if (nodesWithPosition.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <p className="text-slate-500 text-sm">Graph nodes need positioning</p>
      </div>
    );
  }

  const minX = Math.min(...nodesWithPosition.map(n => n.x!)) - 60;
  const maxX = Math.max(...nodesWithPosition.map(n => n.x!)) + 60;
  const minY = Math.min(...nodesWithPosition.map(n => n.y!)) - 60;
  const maxY = Math.max(...nodesWithPosition.map(n => n.y!)) + 60;

  const width = Math.max(maxX - minX, 400);
  const height = Math.max(maxY - minY, 300);

  // Offset all positions
  const offsetX = -minX + 20;
  const offsetY = -minY + 20;

  const getNodePosition = (node: GraphNode) => ({
    x: (node.x || 0) + offsetX,
    y: (node.y || 0) + offsetY,
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-slate-900/50 rounded-lg border border-slate-700/50"
      style={{ minHeight: 300 }}
    >
      {/* Edges */}
      {graph.edges.map((edge, i) => {
        const source = graph.nodes.find(n => n.id === edge.source);
        const target = graph.nodes.find(n => n.id === edge.target);
        if (!source || !target) return null;

        const sourcePos = getNodePosition(source);
        const targetPos = getNodePosition(target);

        const color = edgeColors[edge.type] || '#64748b';
        const isHighlighted = selectedNodeId === edge.source || selectedNodeId === edge.target;

        return (
          <g key={`edge-${i}`}>
            <line
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke={color}
              strokeWidth={isHighlighted ? 3 : 2}
              strokeOpacity={isHighlighted ? 1 : 0.6}
              className="transition-all duration-200"
            />
            {/* Edge label */}
            {edge.label && (
              <text
                x={(sourcePos.x + targetPos.x) / 2}
                y={(sourcePos.y + targetPos.y) / 2 - 5}
                fill={color}
                fontSize={10}
                textAnchor="middle"
                className="pointer-events-none"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = getNodePosition(node);
        const colors = nodeColors[node.type] || nodeColors.ARTIFACT;
        const isSelected = selectedNodeId === node.id;
        const isHighlighted = selectedNodeId && 
          graph.edges.some(e => 
            (e.source === selectedNodeId && e.target === node.id) ||
            (e.target === selectedNodeId && e.source === node.id)
          );

        return (
          <g
            key={`node-${node.id}`}
            className="cursor-pointer transition-all duration-200"
            onClick={() => onNodeSelect?.(node.id)}
            onDoubleClick={() => onNodeDoubleClick?.(node.id)}
            role="button"
            tabIndex={0}
          >
            {/* Node circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isSelected ? 22 : 18}
              fill={colors.fill}
              stroke={isSelected ? colors.stroke : isHighlighted ? colors.stroke : colors.stroke}
              strokeWidth={isSelected ? 3 : isHighlighted ? 2.5 : 2}
              strokeOpacity={isSelected ? 1 : isHighlighted ? 0.9 : 0.7}
              className="transition-all duration-200"
            />
            
            {/* Node type indicator */}
            <text
              x={pos.x}
              y={pos.y + 4}
              fill={colors.text}
              fontSize={12}
              textAnchor="middle"
              fontWeight="bold"
              className="pointer-events-none"
            >
              {node.type[0]}
            </text>

            {/* Node label (if provided) */}
            {node.label && (
              <text
                x={pos.x}
                y={pos.y + 30}
                fill={colors.text}
                fontSize={11}
                textAnchor="middle"
                className="pointer-events-none truncate"
              >
                {node.label.length > 18 ? node.label.slice(0, 15) + '...' : node.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${width - 120}, 10)`}>
        <rect
          x={0}
          y={0}
          width={115}
          height={100}
          fill="#0f172a"
          stroke="#334155"
          strokeWidth={1}
          rx={4}
        />
        <text
          x={8}
          y={16}
          fill="#94a3b8"
          fontSize={10}
          fontWeight="bold"
        >
          LEGEND
        </text>
        {Object.entries(nodeColors).map(([type, colors]) => (
          <g key={`legend-${type}`} transform={`translate(8, ${24 + Object.keys(nodeColors).indexOf(type) * 14})`}>
            <circle
              cx={6}
              cy={0}
              r={5}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={1}
            />
            <text
              x={14}
              y={4}
              fill={colors.text}
              fontSize={9}
            >
              {type}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
