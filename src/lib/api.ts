// API service layer for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("auth_token");
};

// API request helper (exported for use in components)
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  // Only set Content-Type for JSON, not for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      removeAuthToken();
      // Redirect to login or show error
      if (typeof window !== 'undefined') {
        // Don't redirect automatically - let the app handle it
        // window.location.href = '/auth';
      }
      throw new Error("Authentication failed. Please login again.");
    }
    let error: { detail?: string };
    try {
      error = await response.json();
    } catch {
      error = { detail: response.statusText };
    }
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content responses (like DELETE) - no body
  if (response.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON, but handle empty responses
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Response text:", text);
    throw new Error("Invalid JSON response from server");
  }
};

// Authentication API
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
  const response = await apiRequest<TokenResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAuthToken(response.access_token);
  return response;
};

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const response = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAuthToken(response.access_token);
  return response;
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  return apiRequest<UserResponse>("/auth/me");
};

export const logout = (): void => {
  removeAuthToken();
};

export interface DatasetResponse {
  id: number;
  name: string;
  type: 'pdf' | 'csv' | 'database';
  summary?: string;
  report?: string;
  questions?: string[];
  summary_generated?: boolean;
  questions_generated?: boolean;
  report_generated?: boolean;
  uploadedAt: string;
  size?: string;
  previewData?: any;
  _id?: string; // MongoDB ObjectId for API calls
}

// Dummy data generator
const generateDummyResponse = (name: string, type: 'pdf' | 'csv' | 'database'): DatasetResponse => {
  const baseResponse = {
    id: Math.floor(Math.random() * 10000),
    name,
    type,
    uploadedAt: new Date().toISOString(),
  };

  if (type === 'pdf') {
    return {
      ...baseResponse,
      summary: `This PDF document "${name}" contains comprehensive information about various topics. The document spans multiple pages and includes detailed analysis, charts, and references.`,
      report: `# PDF Analysis Report\n\n## Document Overview\nDocument: ${name}\nPages: 15\nSize: 2.5 MB\n\n## Key Findings\n- Important data points identified\n- Multiple sections analyzed\n- References to external sources\n\n## Recommendations\n- Further review recommended\n- Cross-reference with additional documents`,
      questions: [
        'What are the main topics covered in this document?',
        'Can you summarize the key findings?',
        'What are the recommendations mentioned?',
        'Are there any data points that stand out?',
        'What is the conclusion of this document?'
      ],
      size: '2.5 MB'
    };
  } else if (type === 'csv') {
    return {
      ...baseResponse,
      summary: `This dataset "${name}" contains structured data with multiple columns and rows. The data includes numerical values, categorical information, and timestamps suitable for analysis.`,
      report: `# CSV Analysis Report\n\n## Dataset Overview\nDataset: ${name}\nRows: 500\nColumns: 8\n\n## Statistical Summary\n- Average values calculated\n- Data distribution analyzed\n- Missing values: 2%\n\n## Insights\n- Strong correlation between variables\n- Seasonal patterns identified\n- Outliers detected and flagged`,
      questions: [
        'What is the average value of the numeric columns?',
        'Are there any missing values in the dataset?',
        'Can you identify any patterns or trends?',
        'What are the most significant correlations?',
        'Are there any outliers in the data?'
      ],
      size: '1.2 MB',
      previewData: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        category: ['Electronics', 'Clothing', 'Food', 'Books'][i % 4],
        price: (Math.random() * 1000).toFixed(2),
        quantity: Math.floor(Math.random() * 100),
        date: new Date(2024, 0, i + 1).toLocaleDateString(),
      }))
    };
  } else {
    return {
      ...baseResponse,
      summary: `Database "${name}" connected successfully. The database contains multiple tables with relational data structure. Initial analysis shows well-organized schema with proper indexing.`,
      report: `# Database Analysis Report\n\n## Database Overview\nDatabase: ${name}\nTables: 12\nTotal Records: 50,000+\n\n## Schema Analysis\n- Primary keys properly defined\n- Foreign key relationships established\n- Indexes optimized for queries\n\n## Performance Metrics\n- Query response time: <50ms\n- Connection pool: Healthy\n- Data integrity: Verified`,
      questions: [
        'How many tables are in this database?',
        'What is the total number of records?',
        'Can you show the schema relationships?',
        'What are the most frequently queried tables?',
        'Are there any performance bottlenecks?'
      ],
      size: '45 MB'
    };
  }
};

// API endpoints (dummy implementations)

export const uploadPDF = async (formData: FormData): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    uploaded_at: string;
    size: string;
  }>("/datasets/upload/pdf", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type with boundary for FormData
  });
  
  if (!response) {
    throw new Error("No response received from server");
  }
  
  if (!response.id) {
    console.error("Invalid response structure:", response);
    throw new Error("Invalid response: missing 'id' field");
  }
  
  // Convert to expected format
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: response.summary,
    report: response.report,
    questions: response.questions,
    summary_generated: response.summary_generated || false,
    questions_generated: response.questions_generated || false,
    report_generated: response.report_generated || false,
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id, // Store MongoDB ObjectId for navigation
  };
};

export const uploadCSV = async (formData: FormData): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    uploaded_at: string;
    size: string;
  }>("/datasets/upload/csv", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type with boundary for FormData
  });
  
  if (!response) {
    throw new Error("No response received from server");
  }
  
  if (!response.id) {
    console.error("Invalid response structure:", response);
    throw new Error("Invalid response: missing 'id' field");
  }
  
  // Convert to expected format
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: `CSV dataset "${response.name}" uploaded successfully.`,
    report: `# CSV Analysis Report\n\n## Dataset Overview\nDataset: ${response.name}\nSize: ${response.size}\n\n## Status\nUploaded and ready for analysis.`,
    questions: [
      'What is the structure of this dataset?',
      'Are there any missing values?',
      'Can you identify any patterns or trends?',
    ],
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id, // Store MongoDB ObjectId for navigation
  };
};

export const uploadDatabase = async (formData: FormData): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    uploaded_at: string;
    size: string;
  }>("/datasets/upload/database", {
    method: "POST",
    body: formData,
    headers: {},
  });

  if (!response || !response.id) {
    throw new Error("Invalid response from server");
  }

  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: `Database "${response.name}" connected successfully.`,
    report: `# Database Report\n\n## Overview\nDatabase: ${response.name}\nSize: ${response.size}\n\n## Status\nConnected and ready for analysis.`,
    questions: [],
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id,
  };
};

export const connectDatabase = async (data: {
  name: string;
  file?: File;
  useVCSAccess?: boolean;
}): Promise<DatasetResponse> => {
  // If file is provided, upload to backend
  if (data.file) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("file", data.file);
    return uploadDatabase(formData);
  }

  // VCS / no file: use mock for now (no backend for VCS yet)
  await new Promise(resolve => setTimeout(resolve, 1500));
  return generateDummyResponse(data.name, 'database');
};

export const getDatasets = async (): Promise<DatasetResponse[]> => {
  const response = await apiRequest<{ datasets: any[], total: number }>("/datasets/");
  
  // Convert to expected format
  // MongoDB ObjectIds are strings, so we use them directly
  return response.datasets.map((d, index) => ({
    id: index + 1, // Use index for display ID
    name: d.name,
    type: d.dataset_type as 'pdf' | 'csv' | 'database',
    summary: `${d.dataset_type.toUpperCase()} dataset "${d.name}"`,
    report: `# ${d.dataset_type.toUpperCase()} Analysis Report\n\nDataset: ${d.name}\nSize: ${d.size}`,
    questions: [],
    uploadedAt: new Date(d.uploaded_at).toISOString(),
    size: d.size,
    // Store the actual MongoDB ObjectId string for API calls
    _id: d.id,
  }));
};

export const getDatasetById = async (id: number | string): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    summary?: string;
    questions?: string[];
    report?: string;
    summary_generated?: boolean;
    questions_generated?: boolean;
    report_generated?: boolean;
    uploaded_at: string;
    size: string;
  }>(`/datasets/${id}`);
  
  // Convert to expected format
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: response.summary,
    report: response.report,
    questions: response.questions,
    summary_generated: response.summary_generated || false,
    questions_generated: response.questions_generated || false,
    report_generated: response.report_generated || false,
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id,
  };
};

export const deleteDataset = async (id: string): Promise<void> => {
  await apiRequest<void>(`/datasets/${id}`, {
    method: "DELETE",
  });
};

export interface SaveChangesRequest {
  columns: string[];
  data: any[];
}

export interface SaveChangesResponse {
  message: string;
  rows_saved: number;
  columns_saved: number;
}

export const saveDatasetChanges = async (
  datasetId: string,
  columns: string[],
  data: any[]
): Promise<SaveChangesResponse> => {
  return await apiRequest<SaveChangesResponse>(`/datasets/${datasetId}/save-changes`, {
    method: "POST",
    body: JSON.stringify({
      columns,
      data,
    }),
  });
};

export interface AddIntelligentColumnRequest {
  source_columns: string[];
  prompt: string;
  new_column_name: string;
}

export interface AddIntelligentColumnResponse {
  success: boolean;
  new_column_name: string;
  new_column_data: string[];
  message: string;
  row_count: number;
  column_count: number;
}

export const addIntelligentColumn = async (
  datasetId: string,
  payload: AddIntelligentColumnRequest
): Promise<AddIntelligentColumnResponse> => {
  return await apiRequest<AddIntelligentColumnResponse>(
    `/datasets/${datasetId}/add-intelligent-column`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

// Check if VCS special access is enabled
export const hasVCSAccess = (): boolean => {
  // Check environment variable or config
  // For now, return true for demonstration
  // TODO: Replace with actual check
  //   return import.meta.env.VITE_VCS_USER === 'true';
  return true; // Set to false to hide VCS access
};

// Generate content endpoints
export const generateSummary = async (datasetId: string | number): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    summary?: string;
    questions?: string[];
    report?: string;
    summary_generated: boolean;
    questions_generated: boolean;
    report_generated: boolean;
    uploaded_at: string;
    size: string;
  }>(`/datasets/${datasetId}/generate/summary`, {
    method: "POST",
  });
  
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: response.summary,
    report: response.report,
    questions: response.questions,
    summary_generated: response.summary_generated,
    questions_generated: response.questions_generated,
    report_generated: response.report_generated,
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id,
  };
};

export const generateQuestions = async (datasetId: string | number): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    summary?: string;
    questions?: string[];
    report?: string;
    summary_generated: boolean;
    questions_generated: boolean;
    report_generated: boolean;
    uploaded_at: string;
    size: string;
  }>(`/datasets/${datasetId}/generate/questions`, {
    method: "POST",
  });
  
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: response.summary,
    report: response.report,
    questions: response.questions,
    summary_generated: response.summary_generated,
    questions_generated: response.questions_generated,
    report_generated: response.report_generated,
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id,
  };
};

export const generateReport = async (datasetId: string | number): Promise<DatasetResponse> => {
  const response = await apiRequest<{
    id: string;
    name: string;
    dataset_type: 'pdf' | 'csv' | 'database';
    file_name: string;
    file_size: number;
    description?: string;
    summary?: string;
    questions?: string[];
    report?: string;
    summary_generated: boolean;
    questions_generated: boolean;
    report_generated: boolean;
    uploaded_at: string;
    size: string;
  }>(`/datasets/${datasetId}/generate/report`, {
    method: "POST",
  });
  
  return {
    id: parseInt(response.id.replace(/[^0-9]/g, '').slice(-8)) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: response.summary,
    report: response.report,
    questions: response.questions,
    summary_generated: response.summary_generated,
    questions_generated: response.questions_generated,
    report_generated: response.report_generated,
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
    _id: response.id,
  };
};
