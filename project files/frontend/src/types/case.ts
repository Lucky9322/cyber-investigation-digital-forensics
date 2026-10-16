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
