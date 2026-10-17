import { AuthUser, Case, CaseCreateInput, CaseUpdateInput, DownloadResponse, EvidenceItem, LoginResponse } from "@/types/case";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "cyber_forensics_access_token";
const USER_KEY = "cyber_forensics_user";

// Local storage session helpers
export function getSavedToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

// API methods
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Authentication failed. Please verify your credentials.");
  }

  return response.json();
}

export async function fetchCases(
  token: string,
  filters?: { status?: string; search?: string; priority?: string }
): Promise<Case[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.priority) params.append("priority", filters.priority);
  if (filters?.search) params.append("search", filters.search);

  const url = `${BACKEND_URL}/api/cases${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Authentication session expired or invalid. Please reconnect.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch cases (HTTP ${response.status})`);
  }

  return response.json();
}

export async function fetchCaseById(token: string, caseId: string): Promise<Case> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized. Please sign in.");
    }
    if (response.status === 404) {
      throw new Error("Case not found or you lack permission to view it.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to retrieve case details (HTTP ${response.status})`);
  }

  return response.json();
}

export async function createCase(token: string, input: CaseCreateInput): Promise<Case> {
  const response = await fetch(`${BACKEND_URL}/api/cases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create case (HTTP ${response.status})`);
  }

  return response.json();
}

export async function updateCase(
  token: string,
  caseId: string,
  input: CaseUpdateInput
): Promise<Case> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Forbidden: You do not have permission to update this case.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update case (HTTP ${response.status})`);
  }

  return response.json();
}

export async function deleteCase(token: string, caseId: string): Promise<{ message: string; case_id?: string }> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Cannot delete case with existing evidence or custody records.");
    }
    if (response.status === 403) {
      throw new Error("Forbidden: You do not have permission to delete this case.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete case (HTTP ${response.status})`);
  }

  return response.json();
}

export async function fetchCaseEvidence(token: string, caseId: string): Promise<EvidenceItem[]> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}/evidence`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch evidence (HTTP ${response.status})`);
  }

  return response.json();
}

export async function uploadCaseEvidence(
  token: string,
  caseId: string,
  file: File,
  description?: string
): Promise<EvidenceItem> {
  const formData = new FormData();
  formData.append("file", file);
  if (description && description.trim()) {
    formData.append("description", description.trim());
  }

  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}/evidence`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to upload evidence (HTTP ${response.status})`);
  }

  return response.json();
}

export async function getEvidenceDownloadUrl(
  token: string,
  caseId: string,
  evidenceId: string
): Promise<DownloadResponse> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}/evidence/${evidenceId}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to generate download URL (HTTP ${response.status})`);
  }

  return response.json();
}

export async function deleteCaseEvidence(
  token: string,
  caseId: string,
  evidenceId: string
): Promise<{ message: string }> {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}/evidence/${evidenceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete evidence (HTTP ${response.status})`);
  }

  return response.json();
}

export async function verifySession(token: string): Promise<{ user: AuthUser }> {
  const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Invalid or expired session");
  }

  return response.json();
}

