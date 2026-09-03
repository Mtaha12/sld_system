import axios from 'axios';

// Default to backend port 5000 in dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 0,
});

// Request interceptor to attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sld_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to automatically handle token renewal on expiry (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Detect authorization failure and prevent infinite loop retries
    if (
      error.response && 
      error.response.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('sld_refresh_token');
        if (!refreshToken) throw new Error('No refresh token available.');

        // Request a new access token
        const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh-token`, { 
          token: refreshToken 
        });

        if (refreshResponse.data && refreshResponse.data.accessToken) {
          const newAccessToken = refreshResponse.data.accessToken;
          localStorage.setItem('sld_access_token', newAccessToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('[API Client] Refresh token validation failed. Redirecting to login.', refreshErr);
        
        // Clear auth sessions on failure
        localStorage.removeItem('sld_access_token');
        localStorage.removeItem('sld_refresh_token');
        localStorage.removeItem('sld_auth_session');
        localStorage.removeItem('sld_user_profile');
        
        // Trigger hard reload to redirect to login route
        window.location.href = '/login';
      }
    }

    // Pass down API specific error message if available
    const apiError = error.response?.data?.message || error.message || 'API Request Failed';
    error.message = apiError;
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
