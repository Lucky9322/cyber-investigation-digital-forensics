"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { GraphLink, GraphNode, ENTITY_TYPE_CONFIG } from "@/types/entityGraph";

interface Graph2DCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  onHoverNode: (node: GraphNode | null) => void;
}

export function Graph2DCanvas({
  nodes,
  links,
  selectedNode,
  hoveredNode,
  onSelectNode,
  onHoverNode,
}: Graph2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center the view on mount
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setTransform({
        x: clientWidth / 2,
        y: clientHeight / 2,
        scale: 14, // Scale 3D/2D coordinates to screen pixels
      });
    }
  }, []);

  // Map of nodes
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Neighbors
  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    const activeId = hoveredNode?.id || selectedNode?.id;
    if (!activeId) return set;

    links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      if (s === activeId) set.add(t);
      if (t === activeId) set.add(s);
    });
    return set;
  }, [links, hoveredNode, selectedNode]);

  const hasActiveFocus = !!(hoveredNode || selectedNode);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * zoomFactor, 4), 40),
    }));
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset 2D zoom & center
  const resetView = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setTransform({
        x: clientWidth / 2,
        y: clientHeight / 2,
        scale: 14,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none bg-[#090b10] overflow-hidden cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).tagName === "rect") {
          onSelectNode(null);
        }
      }}
    >
      {/* 2D Zoom / Controls overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.2, 40) }))}
          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale * 0.8, 4) }))}
          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition font-mono"
          title="Reset Center"
        >
          Reset View
        </button>
      </div>

      {/* SVG Canvas for 2D Node-Link rendering */}
      <svg className="w-full h-full">
        {/* Background Grid Pattern */}
        <defs>
          <pattern id="grid-pattern-2d" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern-2d)" />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* 1. Links / Edges */}
          {links.map((link) => {
            const sourceId = typeof link.source === "string" ? link.source : (link.source as any).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as any).id;

            const sNode = nodeMap.get(sourceId);
            const tNode = nodeMap.get(targetId);
            if (!sNode || !tNode) return null;

            const sx = sNode.x || 0;
            const sy = sNode.y || 0;
            const tx = tNode.x || 0;
            const ty = tNode.y || 0;

            const isConnectedToFocus =
              hoveredNode?.id === sourceId ||
              hoveredNode?.id === targetId ||
              selectedNode?.id === sourceId ||
              selectedNode?.id === targetId;

            const strokeColor = isConnectedToFocus
              ? link.risk === "critical"
                ? "#ff0055"
                : "#00f0ff"
              : hasActiveFocus
              ? "#1e293b"
              : link.risk === "critical"
              ? "#991b1b"
              : "#334155";

            const strokeWidth = isConnectedToFocus ? 0.35 : 0.16;

            // Midpoint coordinates for relationship badge
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;

            return (
              <g key={link.id} className="transition-all duration-200">
                <line
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isConnectedToFocus ? "0.6 0.3" : undefined}
                  opacity={hasActiveFocus && !isConnectedToFocus ? 0.2 : 0.9}
                />

                {/* Relationship Tag on hover or select */}
                {isConnectedToFocus && (
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect
                      x="-4"
                      y="-1.2"
                      width="8"
                      height="2.4"
                      rx="0.5"
                      fill="#020617"
                      stroke={strokeColor}
                      strokeWidth="0.1"
                    />
                    <text
                      x="0"
                      y="0.4"
                      fill={strokeColor}
                      fontSize="0.9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {link.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. Nodes */}
          {nodes.map((node) => {
            const config = ENTITY_TYPE_CONFIG[node.type] || ENTITY_TYPE_CONFIG.ip;
            const nx = node.x || 0;
            const ny = node.y || 0;

            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isNeighbor = neighborIds.has(node.id);
            const dimmed = hasActiveFocus && !isSelected && !isHovered && !isNeighbor;

            const baseRadius = node.risk === "critical" ? 1.8 : node.type === "suspect" ? 1.6 : 1.3;
            const r = isSelected ? baseRadius * 1.5 : isHovered ? baseRadius * 1.3 : baseRadius;

            return (
              <g
                key={node.id}
                transform={`translate(${nx}, ${ny})`}
                className="cursor-pointer transition-transform duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                onMouseEnter={() => onHoverNode(node)}
                onMouseLeave={() => onHoverNode(null)}
                opacity={dimmed ? 0.2 : 1.0}
              >
                {/* Outer Glow Halo */}
                {(isSelected || isHovered || node.risk === "critical") && (
                  <circle
                    r={r * 1.8}
                    fill="none"
                    stroke={config.color}
                    strokeWidth="0.15"
                    strokeDasharray={isSelected ? "0.8 0.4" : undefined}
                    opacity={isSelected ? 0.9 : 0.45}
                  />
                )}

                {/* Core Node Circle */}
                <circle
                  r={r}
                  fill={config.color}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? "0.35" : "0.1"}
                />

                {/* Node Label Text */}
                <g transform={`translate(0, ${r + 1.8})`}>
                  <rect
                    x="-6"
                    y="-1.3"
                    width="12"
                    height="2.6"
                    rx="0.6"
                    fill="#020617"
                    stroke={isSelected ? "#f59e0b" : isHovered ? "#00f0ff" : "#1e293b"}
                    strokeWidth="0.15"
                    opacity={dimmed ? 0.2 : 0.92}
                  />
                  <text
                    x="0"
                    y="0.4"
                    fill={isSelected ? "#fbbf24" : isHovered ? "#38bdf8" : "#f1f5f9"}
                    fontSize="1.0"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {node.label.length > 16 ? node.label.slice(0, 14) + ".." : node.label}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
