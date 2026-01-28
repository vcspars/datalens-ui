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

// API request helper
const apiRequest = async <T>(
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
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
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
  summary: string;
  report: string;
  questions: string[];
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
  const response = await apiRequest<DatasetResponse>("/datasets/upload/pdf", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type with boundary for FormData
  });
  
  // Convert to expected format
  return {
    id: parseInt(response.id) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: `PDF document "${response.name}" uploaded successfully.`,
    report: `# PDF Analysis Report\n\n## Document Overview\nDocument: ${response.name}\nSize: ${response.size}\n\n## Status\nUploaded and ready for analysis.`,
    questions: [
      'What are the main topics covered in this document?',
      'Can you summarize the key findings?',
      'What are the recommendations mentioned?',
    ],
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
  };
};

export const uploadCSV = async (formData: FormData): Promise<DatasetResponse> => {
  const response = await apiRequest<DatasetResponse>("/datasets/upload/csv", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type with boundary for FormData
  });
  
  // Convert to expected format
  return {
    id: parseInt(response.id) || Math.floor(Math.random() * 10000),
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
  };
};

export const connectDatabase = async (data: {
  name: string;
  file?: File;
  useVCSAccess?: boolean;
}): Promise<DatasetResponse> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TODO: Replace with actual API call
  // const response = await fetch('/api/connect-database', {
  //   method: 'POST',
  //   body: JSON.stringify(data),
  //   headers: { 'Content-Type': 'application/json' }
  // });
  // return await response.json();
  
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
    uploaded_at: string;
    size: string;
  }>(`/datasets/${id}`);
  
  // Convert to expected format
  return {
    id: parseInt(response.id) || Math.floor(Math.random() * 10000),
    name: response.name,
    type: response.dataset_type as 'pdf' | 'csv' | 'database',
    summary: `${response.dataset_type.toUpperCase()} dataset "${response.name}". ${response.description || 'Uploaded and ready for analysis.'}`,
    report: `# ${response.dataset_type.toUpperCase()} Analysis Report\n\n## Dataset Overview\nDataset: ${response.name}\nFile: ${response.file_name}\nSize: ${response.size}\n\n## Status\nUploaded and ready for analysis.`,
    questions: response.dataset_type === 'csv' ? [
      'What is the structure of this dataset?',
      'Are there any missing values?',
      'Can you identify any patterns or trends?',
    ] : response.dataset_type === 'pdf' ? [
      'What are the main topics covered in this document?',
      'Can you summarize the key findings?',
      'What are the recommendations mentioned?',
    ] : [
      'How many tables are in this database?',
      'What is the total number of records?',
      'Can you show the schema relationships?',
    ],
    uploadedAt: new Date(response.uploaded_at).toISOString(),
    size: response.size,
  };
};

// Check if VCS special access is enabled
export const hasVCSAccess = (): boolean => {
  // Check environment variable or config
  // For now, return true for demonstration
  // TODO: Replace with actual check
  // return import.meta.env.VITE_VCS_USER === 'true';
  return true; // Set to false to hide VCS access
};
