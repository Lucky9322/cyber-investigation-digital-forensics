"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { GraphNode, GraphLink, EntityType, EntityGraphData, ENTITY_TYPE_CONFIG } from "@/types/entityGraph";
import { getCaseEntityGraph, MOCK_CASE_GRAPHS } from "@/lib/entityGraphApi";
import { warmUpSimulation } from "@/lib/forceSimulation3D";
import { GraphToolbar } from "./GraphToolbar";
import { EntityDetailPanel } from "./EntityDetailPanel";
import { Graph2DCanvas } from "./Graph2DCanvas";

// Dynamically import 3D Canvas to disable SSR for WebGL / Three.js
const DynamicGraph3DCanvas = dynamic(
  () => import("./Graph3DCanvas").then((mod) => mod.Graph3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#07080c] text-cyan-400 font-mono text-xs gap-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div className="tracking-widest uppercase animate-pulse">Initializing 3D Neural Cyber Graph...</div>
      </div>
    ),
  }
);

interface EntityGraphViewerProps {
  initialCaseId?: string;
  token?: string | null;
  onNavigateToCase?: (caseId: string) => void;
}

export function EntityGraphViewer({
  initialCaseId = "case-dark-nexus",
  token = null,
  onNavigateToCase,
}: EntityGraphViewerProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId);
  const [graphData, setGraphData] = useState<EntityGraphData | null>(null);
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Interaction State
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [focusTargetNode, setFocusTargetNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Filters State
  const [activeTypeFilters, setActiveTypeFilters] = useState<Set<EntityType>>(
    new Set(["ip", "domain", "phone", "suspect", "evidence", "email", "wallet"])
  );

  // Available cases list for the switcher
  const availableCases = useMemo(() => {
    return [
      {
        id: "case-dark-nexus",
        title: "Op Dark Nexus (Ransomware & Exfiltration)",
      },
      {
        id: "case-telecom-fraud",
        title: "Op Phantom Call (SS7 Intercept & Banking Fraud)",
      },
    ];
  }, []);

  // Load Graph Data
  const loadData = useCallback(async (caseId: string) => {
    setIsLoading(true);
    try {
      const data = await getCaseEntityGraph(caseId, token);
      setGraphData(data);

      // Pre-run 3D force physics simulation warm up
      const warmedNodes = warmUpSimulation(data.nodes, data.links, 90, {
        repulsion: 420,
        springLength: 28,
        springStrength: 0.05,
        gravity: 0.025,
        damping: 0.88,
        dimensions: 3,
      });

      setSimulatedNodes(warmedNodes);
    } catch (err) {
      console.error("Failed to load entity graph data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData(selectedCaseId);
  }, [selectedCaseId, loadData]);

  // Sync if initialCaseId prop changes
  useEffect(() => {
    if (initialCaseId && initialCaseId !== selectedCaseId) {
      setSelectedCaseId(initialCaseId);
    }
  }, [initialCaseId, selectedCaseId]);

  // Filtered nodes and links based on active filters
  const filteredNodes = useMemo(() => {
    return simulatedNodes.filter((node) => activeTypeFilters.has(node.type));
  }, [simulatedNodes, activeTypeFilters]);

  const filteredLinks = useMemo(() => {
    if (!graphData) return [];
    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    return graphData.links.filter((link) => {
      const s = typeof link.source === "string" ? link.source : (link.source as any).id;
      const t = typeof link.target === "string" ? link.target : (link.target as any).id;
      return validNodeIds.has(s) && validNodeIds.has(t);
    });
  }, [graphData, filteredNodes]);

  // Toggle entity type filter
  const handleToggleTypeFilter = (type: EntityType) => {
    setActiveTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Select Search result
  const handleSelectSearchResult = (node: GraphNode) => {
    setSelectedNode(node);
    setFocusTargetNode(node);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    setFocusTargetNode(null);
    setSelectedNode(null);
  };

  // Handle case switch
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setSelectedNode(null);
    setFocusTargetNode(null);
    if (onNavigateToCase) onNavigateToCase(caseId);
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-8.5rem)] min-h-[640px] bg-[#07080c] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* 1. TOP TOOLBAR */}
      <GraphToolbar
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSearchResult={handleSelectSearchResult}
        activeTypeFilters={activeTypeFilters}
        onToggleTypeFilter={handleToggleTypeFilter}
        allNodes={simulatedNodes}
        onResetCamera={handleResetCamera}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        selectedCaseId={selectedCaseId}
        onSelectCase={handleSelectCase}
        casesList={availableCases}
      />

      {/* 2. PRIMARY VISUALIZATION CANVAS */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#07080c] text-cyan-400 font-mono text-xs gap-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <div className="tracking-widest uppercase animate-pulse">Running Force Layout Physics...</div>
          </div>
        ) : viewMode === "3d" ? (
          <DynamicGraph3DCanvas
            nodes={filteredNodes}
            links={filteredLinks}
            selectedNode={selectedNode}
            hoveredNode={hoveredNode}
            focusTargetNode={focusTargetNode}
            onSelectNode={setSelectedNode}
            onHoverNode={setHoveredNode}
            autoRotate={autoRotate}
          />
        ) : (
          <Graph2DCanvas
            nodes={filteredNodes}
            links={filteredLinks}
            selectedNode={selectedNode}
            hoveredNode={hoveredNode}
            onSelectNode={setSelectedNode}
            onHoverNode={setHoveredNode}
          />
        )}

        {/* HUD OVERLAY: TOP-LEFT CASE METRICS */}
        {graphData && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-2">
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg p-3 max-w-xs shadow-xl space-y-1.5 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Live Neural Topology
                </span>
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight truncate">
                {graphData.case_info.case_title}
              </h3>
              <div className="text-[10px] text-slate-400 truncate">
                Lead: {graphData.case_info.investigator}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-[10px]">
                <div>
                  <span className="text-slate-500">Nodes: </span>
                  <span className="text-cyan-400 font-bold">{filteredNodes.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Links: </span>
                  <span className="text-purple-400 font-bold">{filteredLinks.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Density: </span>
                  <span className="text-amber-400 font-bold">{graphData.stats.threat_density}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HUD OVERLAY: BOTTOM-RIGHT CONTROLS CHEATSHEET */}
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden md:block">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-md px-3 py-2 text-[10px] font-mono text-slate-400 space-y-0.5 shadow-lg">
            <div>
              <span className="text-cyan-400 font-bold">Left Drag:</span> Rotate 3D Camera / Pan 2D
            </div>
            <div>
              <span className="text-cyan-400 font-bold">Right Drag:</span> Pan 3D Workspace
            </div>
            <div>
              <span className="text-cyan-400 font-bold">Mouse Wheel:</span> Zoom In / Out
            </div>
            <div>
              <span className="text-cyan-400 font-bold">Left Click:</span> Inspect Node Dossier & Evidence
            </div>
          </div>
        </div>

        {/* 3. SLIDE-OVER DETAIL DOSSIER PANEL */}
        <EntityDetailPanel
          node={selectedNode}
          links={graphData?.links || []}
          allNodes={simulatedNodes}
          onClose={() => setSelectedNode(null)}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setFocusTargetNode(node);
          }}
        />
      </div>
    </div>
  );
}
