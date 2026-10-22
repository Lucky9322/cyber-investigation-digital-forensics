"use client";

import React, { useState } from "react";
import { GraphNode, GraphLink, ENTITY_TYPE_CONFIG, RISK_LEVEL_CONFIG } from "@/types/entityGraph";

interface EntityDetailPanelProps {
  node: GraphNode | null;
  links: GraphLink[];
  allNodes: GraphNode[];
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
}

export function EntityDetailPanel({
  node,
  links,
  allNodes,
  onClose,
  onSelectNode,
}: EntityDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"evidence" | "metadata" | "relations">("evidence");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!node) return null;

  const typeConfig = ENTITY_TYPE_CONFIG[node.type] || ENTITY_TYPE_CONFIG.ip;
  const riskConfig = RISK_LEVEL_CONFIG[node.risk] || RISK_LEVEL_CONFIG.info;

  // Find all links touching this node
  const connectedLinks = links.filter((l) => {
    const s = typeof l.source === "string" ? l.source : (l.source as any).id;
    const t = typeof l.target === "string" ? l.target : (l.target as any).id;
    return s === node.id || t === node.id;
  });

  const nodeMap = new Map<string, GraphNode>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const copyNodeJson = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-[#0c0e14]/95 border-l border-slate-800 text-slate-100 z-30 flex flex-col shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-250">
      {/* Top Banner / Dossier Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${typeConfig.tailwindBadge}`}
              >
                {typeConfig.displayName}
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${riskConfig.badgeClass}`}>
                {riskConfig.label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: typeConfig.color }} />
              {node.label}
            </h2>
            <p className="text-xs text-slate-400 font-mono break-all">{node.value}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
            title="Close dossier"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60 text-center font-mono">
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800/50">
            <div className="text-[10px] text-slate-400 uppercase">Confidence</div>
            <div className="text-sm font-bold text-cyan-400">{node.confidence}%</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800/50">
            <div className="text-[10px] text-slate-400 uppercase">Linked Evid</div>
            <div className="text-sm font-bold text-purple-400">{node.evidence_ids.length} files</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800/50">
            <div className="text-[10px] text-slate-400 uppercase">Relations</div>
            <div className="text-sm font-bold text-amber-400">{connectedLinks.length} links</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium">
        <button
          onClick={() => setActiveTab("evidence")}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === "evidence"
              ? "border-purple-400 text-purple-300 bg-purple-500/10 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Evidence & SHA-256 ({node.evidence_hashes.length})
        </button>
        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === "metadata"
              ? "border-cyan-400 text-cyan-300 bg-cyan-500/10 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Extracted Metadata
        </button>
        <button
          onClick={() => setActiveTab("relations")}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === "relations"
              ? "border-amber-400 text-amber-300 bg-amber-500/10 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Connected Nodes ({connectedLinks.length})
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
        {/* TAB 1: EVIDENCE FILES & SHA-256 HASHES */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Forensic Custody Items
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Verified Integrity
              </span>
            </div>

            {node.evidence_hashes.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-slate-800 text-center text-slate-500">
                No direct file artifacts associated with this entity.
              </div>
            ) : (
              node.evidence_hashes.map((item) => (
                <div
                  key={item.evidence_id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-lg p-3 space-y-2.5 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold border border-purple-500/20">
                        {item.evidence_id}
                      </span>
                      <h4 className="text-white font-semibold text-xs mt-1">{item.file_name}</h4>
                    </div>
                    {item.file_size && (
                      <span className="text-[10px] text-slate-400">
                        {(item.file_size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                  </div>

                  {/* SHA-256 Hash Box with 1-click copy */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>SHA-256 Cryptographic Hash:</span>
                      <button
                        onClick={() => copyToClipboard(item.sha256, item.evidence_id)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedHash === item.evidence_id ? (
                          <span className="text-emerald-400 font-bold">Copied!</span>
                        ) : (
                          <span>Copy Hash</span>
                        )}
                      </button>
                    </div>
                    <div className="bg-black/60 p-2 rounded border border-slate-800 text-[10px] text-slate-300 break-all select-all font-mono">
                      {item.sha256}
                    </div>
                  </div>

                  {/* Custody details */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <div>
                      <span className="text-slate-500">Officer: </span>
                      {item.custody_officer || "Investigator Vance"}
                    </div>
                    <div>
                      <span className="text-slate-500">Type: </span>
                      {item.mime_type || "Binary Artifact"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: EXTRACTED METADATA */}
        {activeTab === "metadata" && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Entity Attributes & Forensics
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800/80">
              <div className="p-2.5 flex items-center justify-between bg-slate-950/40">
                <span className="text-slate-400">Primary Category</span>
                <span className="text-white font-semibold">{node.category}</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-400">Entity ID</span>
                <span className="text-slate-300">{node.id}</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-400">Case ID</span>
                <span className="text-slate-300">{node.case_id}</span>
              </div>
              {node.first_seen && (
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-slate-400">First Observed</span>
                  <span className="text-slate-300">{node.first_seen}</span>
                </div>
              )}
              {node.last_seen && (
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-slate-400">Last Active</span>
                  <span className="text-slate-300">{node.last_seen}</span>
                </div>
              )}

              {/* Dynamic Metadata Attributes */}
              {Object.entries(node.metadata).map(([key, val]) => (
                <div key={key} className="p-2.5 flex items-start justify-between gap-4">
                  <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-cyan-300 font-medium text-right break-all">
                    {Array.isArray(val) ? val.join(", ") : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CONNECTED NEIGHBORS / RELATIONS */}
        {activeTab === "relations" && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Direct Link Topology ({connectedLinks.length})
            </div>

            <div className="space-y-2">
              {connectedLinks.map((link) => {
                const sId = typeof link.source === "string" ? link.source : (link.source as any).id;
                const tId = typeof link.target === "string" ? link.target : (link.target as any).id;
                const otherId = sId === node.id ? tId : sId;
                const otherNode = nodeMap.get(otherId);

                if (!otherNode) return null;
                const otherConfig = ENTITY_TYPE_CONFIG[otherNode.type] || ENTITY_TYPE_CONFIG.ip;

                return (
                  <div
                    key={link.id}
                    className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg hover:border-cyan-500/50 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: otherConfig.color }}
                        />
                        <span className="text-white font-semibold group-hover:text-cyan-300 transition">
                          {otherNode.label}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">
                          ({otherConfig.displayName})
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono">
                        Relation: <span className="font-bold">{link.label}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectNode(otherNode)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded border border-slate-700 transition cursor-pointer"
                      title="Pivot and focus neighbor node"
                    >
                      Pivot →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
        <button
          onClick={copyNodeJson}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
        >
          {copiedJson ? (
            <span className="text-emerald-400 font-bold">JSON Copied!</span>
          ) : (
            <span>Export Node JSON</span>
          )}
        </button>

        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
