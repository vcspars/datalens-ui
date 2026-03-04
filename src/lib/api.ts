// API service layer for backend communication

import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------
export const getAuthToken = (): string | null => localStorage.getItem("auth_token");
export const setAuthToken = (token: string): void => localStorage.setItem("auth_token", token);
export const removeAuthToken = (): void => localStorage.removeItem("auth_token");

const AUTH_REDIRECT_URL = "http://localhost:8080/auth";

/**
 * Call after fetch(); on 401 shows session-expired toast, then removes token and redirects to login.
 * Throw so caller does not continue with expired session.
 */
function handleAuthError(response: Response): void {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      toast({
        title: "Session expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        removeAuthToken();
        window.location.href = AUTH_REDIRECT_URL;
      }, 1500);
    } else {
      removeAuthToken();
    }
    throw new Error("Session expired. Redirecting to login...");
  }
}

// ---------------------------------------------------------------------------
// Generic request helper
// ---------------------------------------------------------------------------
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  console.log(`[API] ${options.method || "GET"} ${endpoint}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      const isAuthEndpoint = endpoint === "/auth/login" || endpoint === "/auth/signup";
      if (!isAuthEndpoint && typeof window !== "undefined") {
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          removeAuthToken();
          window.location.href = AUTH_REDIRECT_URL;
        }, 1500);
      } else if (!isAuthEndpoint) {
        removeAuthToken();
      }
      let message = "Authentication failed. Please login again.";
      try {
        const errBody = await response.json();
        message = errBody.detail || message;
      } catch {
        if (isAuthEndpoint) message = "Invalid email or password.";
      }
      throw new Error(message);
    }
    let error: { detail?: string };
    try {
      error = await response.json();
    } catch {
      error = { detail: response.statusText };
    }
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("[API] Failed to parse JSON response:", e);
    throw new Error("Invalid JSON response from server");
  }
};

// ---------------------------------------------------------------------------
// Auth types & endpoints
// ---------------------------------------------------------------------------
export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  confirm_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
}

export const signup = async (data: SignupRequest): Promise<TokenResponse> => {
  console.log("[API] signup:", data.email);
  const response = await apiRequest<TokenResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAuthToken(response.access_token);
  return response;
};

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  console.log("[API] login:", data.email);
  const response = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAuthToken(response.access_token);
  return response;
};

export const getCurrentUser = async (): Promise<UserResponse> =>
  apiRequest<UserResponse>("/auth/me");

export const logout = (): void => {
  console.log("[API] logout");
  removeAuthToken();
};

// ---------------------------------------------------------------------------
// Chat types & endpoints
// ---------------------------------------------------------------------------
export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  has_table: boolean;
  table_data: Record<string, string>[];
  table_columns: string[];
  tables?: { columns: string[]; data: Record<string, string>[] }[];
  sql_query?: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessageItem[];
  session_id: string;
}

export const getChatHistory = async (): Promise<ChatHistoryResponse> => {
  console.log("[API] getChatHistory");
  return apiRequest<ChatHistoryResponse>("/chat/history");
};

export const clearChatHistory = async (): Promise<void> => {
  console.log("[API] clearChatHistory");
  await apiRequest<void>("/chat/history", { method: "DELETE" });
};

// ---------------------------------------------------------------------------
// Bookmarks — persisted per user in MongoDB chat_sessions
// ---------------------------------------------------------------------------

export interface BookmarkItem {
  id: string;
  question: string;
  created_at: string;
}

export const getBookmarks = async (): Promise<BookmarkItem[]> => {
  console.log("[API] getBookmarks");
  const res = await apiRequest<{ bookmarks: BookmarkItem[] }>("/chat/bookmarks");
  return res.bookmarks;
};

export const addBookmark = async (question: string): Promise<BookmarkItem> => {
  console.log("[API] addBookmark:", question.slice(0, 60));
  return apiRequest<BookmarkItem>("/chat/bookmarks", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
};

export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
  console.log("[API] deleteBookmark:", bookmarkId);
  await apiRequest<void>(`/chat/bookmarks/${bookmarkId}`, { method: "DELETE" });
};

// ---------------------------------------------------------------------------
// DB Overview — persisted per user in MongoDB
// ---------------------------------------------------------------------------

export interface DbOverview {
  summary: string;
  questions: string[];
  report: string;
}

export const getDbOverview = async (): Promise<DbOverview> => {
  console.log("[API] getDbOverview");
  return apiRequest<DbOverview>("/chat/db/overview");
};

export const clearDbOverview = async (): Promise<void> => {
  console.log("[API] clearDbOverview");
  await apiRequest<void>("/chat/db/overview", { method: "DELETE" });
};

// ---------------------------------------------------------------------------
// DB Graphs tab — persisted per user in MongoDB chat_sessions
// ---------------------------------------------------------------------------

export interface DbGraphInstance {
  id: string;
  table_data: Record<string, string>[];
  table_columns: string[];
  graph_type: string;
  xKey: string;
  yKey: string;
  source_label?: string;
}

export const getDbGraphs = async (): Promise<DbGraphInstance[]> => {
  console.log("[API] getDbGraphs");
  const res = await apiRequest<{ graphs: DbGraphInstance[] }>("/chat/db/graphs");
  return res.graphs ?? [];
};

export const saveDbGraphs = async (graphs: DbGraphInstance[]): Promise<void> => {
  console.log("[API] saveDbGraphs count=", graphs.length);
  await apiRequest<{ message: string; count: number }>("/chat/db/graphs", {
    method: "PUT",
    body: JSON.stringify({ graphs }),
  });
};

export const streamDbReport = async (): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const token = getAuthToken();
  console.log("[API] streamDbReport");
  const response = await fetch(`${API_BASE_URL}/chat/db/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  handleAuthError(response);
  if (!response.ok) throw new Error(response.statusText);
  if (!response.body) throw new Error("No response body");
  return response.body.getReader();
};

export const downloadDbReportPdf = async (): Promise<Blob> => {
  const token = getAuthToken();
  console.log("[API] downloadDbReportPdf");
  const response = await fetch(`${API_BASE_URL}/chat/db/report/pdf`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  handleAuthError(response);
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return await response.blob();
};

export const streamDbSummary = async (): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const token = getAuthToken();
  console.log("[API] streamDbSummary");
  const response = await fetch(`${API_BASE_URL}/chat/db/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  handleAuthError(response);
  if (!response.ok) throw new Error(response.statusText);
  if (!response.body) throw new Error("No response body");
  return response.body.getReader();
};

export const streamDbQuestions = async (): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const token = getAuthToken();
  console.log("[API] streamDbQuestions");
  const response = await fetch(`${API_BASE_URL}/chat/db/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  handleAuthError(response);
  if (!response.ok) throw new Error(response.statusText);
  if (!response.body) throw new Error("No response body");
  return response.body.getReader();
};

/**
 * Open an SSE stream for chat with database.
 * Returns a ReadableStreamDefaultReader to consume events.
 */
export const streamChat = async (
  question: string
): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const token = getAuthToken();
  console.log("[API] streamChat question:", question.slice(0, 80));

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
  });

  handleAuthError(response);
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }

  if (!response.body) throw new Error("No response body");
  console.log("[API] streamChat SSE stream opened");
  return response.body.getReader();
};

// ---------------------------------------------------------------------------
// Dashboard item types & endpoints
// ---------------------------------------------------------------------------
export interface DashboardItemOut {
  id: string;
  item_type: "table" | "graph" | "report";
  name: string;
  table_data: Record<string, string>[];
  table_columns: string[];
  graph_type?: string;
  graph_config?: Record<string, unknown>;
  report_content?: string;
  report_template?: string;
  source_question?: string;
  source_prompt?: string;
  source_response?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export const getDashboardItems = async (): Promise<DashboardItemOut[]> => {
  console.log("[API] getDashboardItems");
  const response = await apiRequest<{ items: DashboardItemOut[]; total: number }>("/dashboard/items");
  return response.items;
};

export const saveDashboardTable = async (payload: {
  name: string;
  table_data: Record<string, string>[];
  table_columns: string[];
  source_question?: string;
  source_prompt?: string;
  source_response?: string;
}): Promise<{ id: string; message: string }> => {
  console.log("[API] saveDashboardTable:", payload.name);
  return apiRequest<{ id: string; message: string }>("/dashboard/items/table", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const saveDashboardGraph = async (payload: {
  name: string;
  graph_type: string;
  graph_config: Record<string, unknown>;
  table_data?: Record<string, string>[];
  table_columns?: string[];
  source_question?: string;
  source_prompt?: string;
  source_response?: string;
}): Promise<{ id: string; message: string }> => {
  console.log("[API] saveDashboardGraph:", payload.name, payload.graph_type);
  return apiRequest<{ id: string; message: string }>("/dashboard/items/graph", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const deleteDashboardItem = async (id: string): Promise<void> => {
  console.log("[API] deleteDashboardItem:", id);
  await apiRequest<void>(`/dashboard/items/${id}`, { method: "DELETE" });
};

// ---------------------------------------------------------------------------
// Dashboard reports
// ---------------------------------------------------------------------------
export const getDashboardReports = async (): Promise<DashboardItemOut[]> => {
  console.log("[API] getDashboardReports");
  const response = await apiRequest<{ reports: DashboardItemOut[]; total: number }>("/dashboard/reports");
  return response.reports;
};

export const deleteDashboardReport = async (id: string): Promise<void> => {
  console.log("[API] deleteDashboardReport:", id);
  await apiRequest<void>(`/dashboard/reports/${id}`, { method: "DELETE" });
};

export const saveDashboardReport = async (payload: {
  name: string;
  content: string;
  template: string;
  item_ids?: string[];
}): Promise<{ id: string; message: string }> => {
  console.log("[API] saveDashboardReport:", payload.name);
  return apiRequest<{ id: string; message: string }>("/dashboard/reports/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const downloadDashboardReportPdf = async (reportId: string): Promise<Blob> => {
  const token = getAuthToken();
  console.log("[API] downloadDashboardReportPdf:", reportId);
  const response = await fetch(`${API_BASE_URL}/dashboard/reports/${reportId}/pdf`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  handleAuthError(response);
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return await response.blob();
};

/**
 * Open an SSE stream for report generation.
 */
export const streamGenerateReport = async (payload: {
  name: string;
  item_ids: string[];
  template: string;
  prompt: string;
}): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const token = getAuthToken();
  console.log("[API] streamGenerateReport:", payload.name);

  const response = await fetch(`${API_BASE_URL}/dashboard/reports/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  handleAuthError(response);
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }

  if (!response.body) throw new Error("No response body");
  console.log("[API] streamGenerateReport SSE stream opened");
  return response.body.getReader();
};

// ---------------------------------------------------------------------------
// Legacy dataset helpers kept for backward compat (upload routes, etc.)
// ---------------------------------------------------------------------------
export interface DatasetResponse {
  id: number;
  name: string;
  type: "pdf" | "csv" | "database";
  summary?: string;
  report?: string;
  questions?: string[];
  summary_generated?: boolean;
  questions_generated?: boolean;
  report_generated?: boolean;
  uploadedAt: string;
  size?: string;
  previewData?: unknown;
  _id?: string;
}

export const getDatasets = async (): Promise<DatasetResponse[]> => {
  const response = await apiRequest<{ datasets: unknown[]; total: number }>("/datasets/");
  return (response.datasets as Record<string, unknown>[]).map((d, index) => ({
    id: index + 1,
    name: d.name as string,
    type: (d.dataset_type as "pdf" | "csv" | "database") || "csv",
    uploadedAt: new Date((d.uploaded_at as string) || Date.now()).toISOString(),
    size: d.size as string,
    _id: d.id as string,
  }));
};

export const deleteDataset = async (id: string): Promise<void> => {
  await apiRequest<void>(`/datasets/${id}`, { method: "DELETE" });
};
