import axios from 'axios';

// Resolve backend URL cleanly across local dev, Vercel env builds, and VPS static builds
const resolveDefaultApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('sldsystem.com')) return 'https://api.sldsystem.com';
    if (host.endsWith('sldsystemspk.com')) return 'https://api.sldsystemspk.com';
  }
  return 'http://localhost:5000';
};

const rawApiUrl = (import.meta.env.VITE_API_URL || resolveDefaultApiUrl()).trim().replace(/\/+$/, '');
const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

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
        console.warn('[API Client] Refresh token validation failed.', refreshErr);
        const hadSession = localStorage.getItem('sld_auth_session') === 'true';

        // Clear auth sessions on failure
        localStorage.removeItem('sld_access_token');
        localStorage.removeItem('sld_refresh_token');
        localStorage.removeItem('sld_auth_session');
        localStorage.removeItem('sld_user_profile');

        // Only trigger hard redirect for expired authenticated sessions off public landing routes
        const p = typeof window !== 'undefined' ? window.location.pathname : '';
        if (
          hadSession &&
          p !== '/' &&
          !p.startsWith('/login') &&
          !p.startsWith('/signup') &&
          !p.startsWith('/forgot-password') &&
          !p.startsWith('/verify-email')
        ) {
          window.location.href = '/login';
        }
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
