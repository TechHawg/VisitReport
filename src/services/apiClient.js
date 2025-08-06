/**
 * Enhanced API Client for RSS Visit Report
 * Provides robust HTTP client with retry logic, error handling, and security features
 */

import { csrfProtection, securityUtils } from '../utils/security.js';

// Import error types and utilities
export class NetworkError extends Error {
  constructor(message, response = null, statusCode = null) {
    super(message);
    this.name = 'NetworkError';
    this.response = response;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class ServerError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ServerError';
    this.statusCode = statusCode;
  }
}

class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Default headers with security
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Fingerprint': securityUtils.generateFingerprint(),
      ...options.headers
    };
    
    // Enable CSRF protection for state-changing operations
    this.csrfEnabled = options.csrfEnabled !== false;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    // Add CSRF token for state-changing operations
    if (this.csrfEnabled && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase())) {
      const csrfToken = csrfProtection.getToken();
      if (csrfToken) {
        modifiedConfig.headers = modifiedConfig.headers || {};
        modifiedConfig.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    for (const interceptor of this.requestInterceptors) {
      try {
        modifiedConfig = await interceptor(modifiedConfig) || modifiedConfig;
      } catch (error) {
        console.warn('Request interceptor error:', error);
      }
    }
    
    return modifiedConfig;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response, config) {
    let modifiedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        modifiedResponse = await interceptor(modifiedResponse, config) || modifiedResponse;
      } catch (error) {
        console.warn('Response interceptor error:', error);
      }
    }
    
    return modifiedResponse;
  }

  /**
   * Create timeout controller
   */
  createTimeoutController(timeout = this.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return {
      controller,
      cleanup: () => clearTimeout(timeoutId)
    };
  }

  /**
   * Sleep for retry delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error, response) {
    // Network errors are retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error.name === 'AbortError') {
      return true;
    }
    
    // Some HTTP status codes are retryable
    if (response && response.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(response.status);
    }
    
    return false;
  }

  /**
   * Parse error response
   */
  async parseErrorResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      } else {
        // Try to get some text from HTML response
        const text = await response.text();
        const htmlMatch = text.match(/<title>(.*?)<\/title>/i);
        if (htmlMatch) {
          return `Server error: ${htmlMatch[1]}`;
        }
        return `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  /**
   * Create appropriate error based on response
   */
  async createError(response, originalError = null) {
    const errorMessage = await this.parseErrorResponse(response);
    
    switch (response.status) {
      case 401:
        return new AuthenticationError(errorMessage, response.status);
      case 400:
        return new ValidationError(errorMessage);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(errorMessage, response.status);
      default:
        return new NetworkError(errorMessage, response, response.status);
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Prepare request configuration
    let config = {
      method: 'GET',
      headers: { ...this.defaultHeaders },
      ...options,
      headers: { ...this.defaultHeaders, ...options.headers }
    };

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    // Attempt request with retries
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      const { controller, cleanup } = this.createTimeoutController();
      
      try {
        config.signal = controller.signal;
        
        const response = await fetch(url, config);
        cleanup();

        // Apply response interceptors
        const processedResponse = await this.applyResponseInterceptors(response, config);

        if (!processedResponse.ok) {
          const error = await this.createError(processedResponse);
          
          // Check if we should retry
          if (attempt < this.retryAttempts && this.isRetryableError(error, processedResponse)) {
            console.warn(`Request failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);
            await this.sleep(this.retryDelay * attempt); // Exponential backoff
            continue;
          }
          
          throw error;
        }

        // Parse successful response
        const contentType = processedResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await processedResponse.json();
        } else {
          return await processedResponse.text();
        }

      } catch (error) {
        cleanup();
        lastError = error;

        // Handle different error types
        if (error.name === 'AbortError') {
          lastError = new NetworkError('Request timeout', null, 408);
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new NetworkError('Unable to connect to server. Please check your connection.', null, 0);
        }

        // Check if we should retry
        if (attempt < this.retryAttempts && this.isRetryableError(lastError)) {
          console.warn(`Request failed (attempt ${attempt}/${this.retryAttempts}):`, lastError.message);
          await this.sleep(this.retryDelay * attempt);
          continue;
        }

        break;
      }
    }

    throw lastError;
  }

  /**
   * Convenience methods for HTTP verbs
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data = null, options = {}) {
    const config = { method: 'POST', ...options };
    if (data) {
      config.body = typeof data === 'string' ? data : JSON.stringify(data);
    }
    return this.request(endpoint, config);
  }

  put(endpoint, data = null, options = {}) {
    const config = { method: 'PUT', ...options };
    if (data) {
      config.body = typeof data === 'string' ? data : JSON.stringify(data);
    }
    return this.request(endpoint, config);
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  patch(endpoint, data = null, options = {}) {
    const config = { method: 'PATCH', ...options };
    if (data) {
      config.body = typeof data === 'string' ? data : JSON.stringify(data);
    }
    return this.request(endpoint, config);
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add any additional form fields
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const config = {
      method: 'POST',
      body: formData,
      headers: { ...this.defaultHeaders },
      ...options
    };

    // Remove Content-Type header to let browser set it with boundary
    delete config.headers['Content-Type'];

    return this.request(endpoint, config);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    try {
      const response = await this.get('/health');
      return { healthy: true, ...response };
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create default instance
const apiClient = new ApiClient({
  baseURL: (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, ''),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
});

export default apiClient;
export { ApiClient };