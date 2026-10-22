export type EntityType =
  | "ip"
  | "domain"
  | "phone"
  | "suspect"
  | "evidence"
  | "email"
  | "wallet";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "info";

export interface EvidenceReference {
  evidence_id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  sha256: string;
  uploaded_at?: string;
  custody_officer?: string;
  storage_path?: string;
}

export interface GraphNode {
  id: string;
  case_id: string;
  type: EntityType;
  label: string;
  value: string;
  category: string;
  risk: RiskLevel;
  confidence: number; // 0 - 100
  first_seen?: string;
  last_seen?: string;
  evidence_ids: string[];
  evidence_hashes: EvidenceReference[];
  metadata: Record<string, string | number | boolean | (string | number)[]>;
  // Dynamic Simulation coordinates
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  radius?: number;
}

export interface GraphLink {
  id: string;
  case_id: string;
  source: string; // source node id
  target: string; // target node id
  relationship: string;
  label: string;
  risk: RiskLevel;
  confidence: number;
  protocol?: string;
  evidence_id?: string;
  supporting_evidence_count?: number;
  timestamp?: string;
  bidirectional?: boolean;
}

export interface CaseGraphMetadata {
  case_id: string;
  case_title: string;
  investigator: string;
  classification: string;
  last_analyzed: string;
}

export interface EntityGraphData {
  case_info: CaseGraphMetadata;
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    total_nodes: number;
    total_links: number;
    threat_density: number; // 0 - 100%
    clusters_count: number;
  };
}

export interface NodeStyleConfig {
  color: string;
  emissive: string;
  glowColor: string;
  tailwindBorder: string;
  tailwindBadge: string;
  tailwindText: string;
  iconName: string;
  displayName: string;
}

export const ENTITY_TYPE_CONFIG: Record<EntityType, NodeStyleConfig> = {
  ip: {
    color: "#00f0ff",
    emissive: "#008ba3",
    glowColor: "rgba(0, 240, 255, 0.4)",
    tailwindBorder: "border-cyan-400",
    tailwindBadge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    tailwindText: "text-cyan-400",
    iconName: "Network",
    displayName: "IP Address",
  },
  domain: {
    color: "#10b981",
    emissive: "#065f46",
    glowColor: "rgba(16, 185, 129, 0.4)",
    tailwindBorder: "border-emerald-400",
    tailwindBadge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    tailwindText: "text-emerald-400",
    iconName: "Globe",
    displayName: "Domain / URL",
  },
  phone: {
    color: "#f59e0b",
    emissive: "#92400e",
    glowColor: "rgba(245, 158, 11, 0.4)",
    tailwindBorder: "border-amber-400",
    tailwindBadge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    tailwindText: "text-amber-400",
    iconName: "PhoneCall",
    displayName: "CDR / Phone",
  },
  suspect: {
    color: "#ff0055",
    emissive: "#9f1239",
    glowColor: "rgba(255, 0, 85, 0.4)",
    tailwindBorder: "border-rose-500",
    tailwindBadge: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    tailwindText: "text-rose-400",
    iconName: "UserX",
    displayName: "Suspect / Actor",
  },
  evidence: {
    color: "#a855f7",
    emissive: "#581c87",
    glowColor: "rgba(168, 85, 247, 0.4)",
    tailwindBorder: "border-purple-400",
    tailwindBadge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    tailwindText: "text-purple-400",
    iconName: "FileKey2",
    displayName: "Evidence File",
  },
  email: {
    color: "#fb923c",
    emissive: "#9a3412",
    glowColor: "rgba(251, 146, 60, 0.4)",
    tailwindBorder: "border-orange-400",
    tailwindBadge: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    tailwindText: "text-orange-400",
    iconName: "Mail",
    displayName: "Email Account",
  },
  wallet: {
    color: "#eab308",
    emissive: "#854d0e",
    glowColor: "rgba(234, 179, 8, 0.4)",
    tailwindBorder: "border-yellow-400",
    tailwindBadge: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    tailwindText: "text-yellow-400",
    iconName: "Coins",
    displayName: "Crypto Wallet",
  },
};

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; badgeClass: string; color: string }> = {
  critical: {
    label: "CRITICAL THREAT",
    badgeClass: "bg-red-500/20 text-red-400 border border-red-500/40",
    color: "#ef4444",
  },
  high: {
    label: "HIGH SUSPICION",
    badgeClass: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
    color: "#f97316",
  },
  medium: {
    label: "ELEVATED",
    badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    color: "#f59e0b",
  },
  low: {
    label: "LOW RISK",
    badgeClass: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    color: "#3b82f6",
  },
  info: {
    label: "INFORMATIONAL",
    badgeClass: "bg-slate-500/20 text-slate-300 border border-slate-500/40",
    color: "#94a3b8",
  },
};
