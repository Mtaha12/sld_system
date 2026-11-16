import axios from 'axios';

// Resolve backend URL cleanly across local dev, Vercel env builds, and VPS static builds
export const getActiveApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // In any browser session on a production domain, strictly force production HTTPS API
    if (host.endsWith('sldsystem.com') || host.includes('sldsystem.com')) return 'https://api.sldsystem.com';
    if (host.endsWith('sldsystempk.com') || host.includes('sldsystempk.com')) return 'https://api.sldsystempk.com';
    if (host.endsWith('sldsystemspk.com') || host.includes('sldsystemspk.com')) return 'https://api.sldsystemspk.com';

    // If on localhost or custom domain
    const envUrl = String(import.meta.env.VITE_API_URL || '').trim();
    if (envUrl && (!envUrl.includes('localhost') || host.includes('localhost') || host.includes('127.0.0.1'))) {
      return envUrl.replace(/\/+$/, '');
    }
  }
  const envUrl = String(import.meta.env.VITE_API_URL || '').trim();
  return (envUrl || 'http://localhost:5000').replace(/\/+$/, '');
};

const rawApiUrl = getActiveApiBaseUrl();
const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 0,
});

// Request interceptor to attach JWT Access Token and dynamically guarantee production baseURL
api.interceptors.request.use(
  (config) => {
    const activeBase = getActiveApiBaseUrl();
    if (!config.baseURL || (config.baseURL.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))) {
      config.baseURL = activeBase;
    }
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
      !originalRequest.url.includes('/auth/logout') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('sld_refresh_token');
        if (!refreshToken) throw new Error('No refresh token available.');

        const activeBase = getActiveApiBaseUrl();
        // Request a new access token
        const refreshResponse = await axios.post(`${activeBase}/api/auth/refresh-token`, { 
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

        // Notify React UserContext synchronously so ProtectedRoute / HomeRoute transition cleanly without full-page reload
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sld:auth-cleared', { detail: { hadSession } }));
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
