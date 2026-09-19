const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public errors?: any[];

  constructor(message: string, statusCode = 400, code?: string, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export const apiClient = {
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; message: string; meta?: any }> {
    const token = localStorage.getItem('jaiva_crm_token');
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // If body is not FormData, default to application/json
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('jaiva_crm_token');
          localStorage.removeItem('jaiva_crm_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        throw new ApiError(
          json.message || `Request failed with status ${response.status}`,
          response.status,
          json.code,
          json.errors
        );
      }

      return {
        data: json.data,
        message: json.message,
        meta: json.meta,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || 'Network request failed', 500);
    }
  },

  get<T = any>(endpoint: string, params?: Record<string, any>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  },

  post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
