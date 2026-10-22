"use client";

import React, { useState } from "react";
import { EntityType, ENTITY_TYPE_CONFIG, GraphNode } from "@/types/entityGraph";

interface GraphToolbarProps {
  viewMode: "3d" | "2d";
  onToggleViewMode: (mode: "3d" | "2d") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSearchResult: (node: GraphNode) => void;
  activeTypeFilters: Set<EntityType>;
  onToggleTypeFilter: (type: EntityType) => void;
  allNodes: GraphNode[];
  onResetCamera: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  casesList: { id: string; title: string }[];
}

export function GraphToolbar({
  viewMode,
  onToggleViewMode,
  searchQuery,
  onSearchChange,
  onSelectSearchResult,
  activeTypeFilters,
  onToggleTypeFilter,
  allNodes,
  onResetCamera,
  autoRotate,
  onToggleAutoRotate,
  selectedCaseId,
  onSelectCase,
  casesList,
}: GraphToolbarProps) {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Search matches
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allNodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.value.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.evidence_hashes.some((h) => h.sha256.toLowerCase().includes(q) || h.file_name.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [searchQuery, allNodes]);

  // Node count by type
  const nodeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allNodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [allNodes]);

  const entityTypes: EntityType[] = ["ip", "domain", "phone", "suspect", "evidence", "email", "wallet"];

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
      {/* Top Bar: Case Selector + Search + 2D/3D Switch + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Case Selector & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
              Module 7 // Entity & Link Analysis
            </span>
          </div>

          <div className="hidden md:block h-4 w-px bg-slate-800" />

          {/* Case Dropdown */}
          <select
            value={selectedCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
          >
            {casesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Search with Auto-Complete */}
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search IP, Domain, Phone, Suspect, SHA-256..."
              className="w-full bg-slate-900/90 border border-slate-700 rounded-md pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange("");
                  setShowSearchDropdown(false);
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950/95 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
              {searchResults.map((res) => {
                const cfg = ENTITY_TYPE_CONFIG[res.type] || ENTITY_TYPE_CONFIG.ip;
                return (
                  <button
                    key={res.id}
                    onClick={() => {
                      onSelectSearchResult(res);
                      setShowSearchDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-900 flex items-center justify-between gap-2 text-xs font-mono transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="text-white font-semibold truncate">{res.label}</span>
                      <span className="text-[10px] text-slate-400">({cfg.displayName})</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 shrink-0">
                      Focus →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: 2D/3D Mode Toggle & Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => onToggleViewMode("3d")}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                viewMode === "3d"
                  ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              3D Neural View
            </button>
            <button
              onClick={() => onToggleViewMode("2d")}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                viewMode === "2d"
                  ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              2D Tactical View
            </button>
          </div>

          {/* Camera Reset */}
          <button
            onClick={onResetCamera}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-800 transition"
            title="Reset Camera View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Auto Rotate Toggle (3D only) */}
          {viewMode === "3d" && (
            <button
              onClick={onToggleAutoRotate}
              className={`px-2 py-1.5 rounded-md text-xs font-mono border transition flex items-center gap-1 ${
                autoRotate
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
              title="Auto-rotate 3D orbit"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRotate ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
              Orbit
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Entity Type Filters */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">
          Entity Filters:
        </span>
        {entityTypes.map((type) => {
          const cfg = ENTITY_TYPE_CONFIG[type];
          const count = nodeCounts[type] || 0;
          if (count === 0) return null;

          const isActive = activeTypeFilters.has(type);

          return (
            <button
              key={type}
              onClick={() => onToggleTypeFilter(type)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? `${cfg.tailwindBadge} border font-medium`
                  : "bg-slate-900/60 text-slate-500 border border-slate-800/80 hover:text-slate-300"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isActive ? cfg.color : "#475569" }}
              />
              <span>{cfg.displayName}</span>
              <span className="text-[10px] opacity-75 font-bold">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
