export type CaseStatus = "Open" | "In Progress" | "Closed";
export type CasePriority = "Low" | "Medium" | "High";

export interface Case {
  id: string;
  title: string;
  description: string | null;
  case_type: string | null;
  status: CaseStatus;
  priority: CasePriority;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseCreateInput {
  title: string;
  description?: string;
  case_type?: string;
  status?: CaseStatus;
  priority?: CasePriority;
}

export interface CaseUpdateInput {
  title?: string;
  description?: string;
  case_type?: string;
  status?: CaseStatus;
  priority?: CasePriority;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string | null;
  sha256_hash: string | null;
  description: string | null;
  uploaded_by: string;
  processing_status: string;
  uploaded_at: string;
}

export interface DownloadResponse {
  download_url: string;
  file_name: string;
  expires_in: number;
}
