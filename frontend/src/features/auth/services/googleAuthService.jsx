import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X, AlertCircle } from 'lucide-react';

let googleScriptLoadingPromise = null;

/**
 * Dynamically loads the official Google Identity Services (GIS) JavaScript SDK.
 * @returns {Promise<boolean>}
 */
export const loadGoogleSdk = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
    return Promise.resolve(true);
  }

  if (googleScriptLoadingPromise) {
    return googleScriptLoadingPromise;
  }

  googleScriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services SDK.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      googleScriptLoadingPromise = null;
      reject(new Error('Unable to connect to Google Identity Services. Please check your network connection.'));
    };

    document.head.appendChild(script);
  });

  return googleScriptLoadingPromise;
};

/**
 * Decodes a Google JWT ID Token without requiring an external library
 * (Safe for extracting public profile claims on the frontend).
 * @param {string} token 
 * @returns {Object|null}
 */
export const parseGoogleJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('[GoogleAuthService] Could not parse JWT payload', err);
    return null;
  }
};

const GoogleLogo = () => (
  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GoogleMockModal = ({ mode, onSelect, onClose }) => {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleCustomEmailSubmit = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setEmailError('');
    const defaultName = email.split('@')[0];
    const fullName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    const simulatedPayload = {
      provider: 'google',
      mode,
      credential: 'mock_google_id_token_' + Math.random().toString(36).substring(2, 15),
      profile: {
        email: email.toLowerCase(),
        name: fullName + ' (Google)',
        givenName: fullName,
        familyName: '(Google)',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        emailVerified: true
      },
      timestamp: new Date().toISOString(),
      isSimulated: true
    };
    onSelect(simulatedPayload);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-[390px] bg-white dark:bg-[#14151A] border border-gray-200 dark:border-[#262833] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 transition-all transform scale-100 duration-200">
        
        {/* Close Button */}
        <button
          onClick={() => onClose()}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1E2028] transition-all"
          title="Cancel Sign-In"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Container */}
        <div className="p-6 pb-4 flex flex-col items-center">
          <GoogleLogo />
          
          <div className="w-full mt-4">
            <h2 className="text-xl font-medium tracking-tight text-gray-800 dark:text-gray-100 text-center">
              {mode === 'signup' ? 'Create Account' : 'Sign in'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6 text-center">
              with your Google Account to continue to <span className="text-brand-orange font-medium">SLD System</span>
            </p>

            <form onSubmit={handleCustomEmailSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Email or phone *"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0B0C10] border text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-all ${
                    emailError
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-200 dark:border-[#262833] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
                  }`}
                  autoFocus
                />
                {emailError && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">
                To sign up or sign in, enter any valid email address. We will simulate the Google profile authorization payload.
              </p>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] mt-2"
              >
                Next
              </button>
            </form>
          </div>
        </div>

        {/* Footer Warning */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#1A1C23]/40 border-t border-gray-100 dark:border-[#262833] text-[11px] text-gray-400 dark:text-gray-500 leading-normal">
          <p>
            To continue, Google will share your name, email address, language preference, and profile picture with SLD System.
          </p>
          <div className="flex gap-2 mt-2 font-medium text-brand-orange">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">Terms of Service</a>
          </div>
        </div>

      </div>
    </div>
  );
};

export const googleAuthService = {
  /**
   * Initiates the Google OAuth/OIDC authorization flow
   * @param {Object} options
   * @param {'signin'|'signup'} options.mode - Indicates whether user is logging in or signing up
   * @returns {Promise<Object>} Formatted Google credential payload ready for backend exchange
   */
  initiateGoogleAuth: async ({ mode = 'signin' } = {}) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // 1. If Google Client ID is configured, perform the standard Google Identity Services flow
    if (clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID') {
      try {
        await loadGoogleSdk();
        
        return new Promise((resolve, reject) => {
          if (!window.google?.accounts?.oauth2 && !window.google?.accounts?.id) {
            reject(new Error('Google Identity Services SDK unavailable.'));
            return;
          }

          // Use OAuth2 Token Client for popup-based account selection
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: (tokenResponse) => {
              if (tokenResponse.error) {
                if (tokenResponse.error === 'access_denied' || tokenResponse.error_subtype === 'access_denied') {
                  reject(new Error('Google authorization was cancelled by the user.'));
                } else {
                  reject(new Error(`Google authorization error: ${tokenResponse.error_description || tokenResponse.error}`));
                }
                return;
              }

              // Standardized payload prepared for backend verification endpoint
              const authPayload = {
                provider: 'google',
                mode,
                accessToken: tokenResponse.access_token,
                expiresIn: tokenResponse.expires_in,
                tokenType: tokenResponse.token_type,
                scope: tokenResponse.scope,
                timestamp: new Date().toISOString()
              };

              resolve(authPayload);
            },
            error_callback: (err) => {
              if (err.type === 'popup_closed') {
                reject(new Error('Google sign-in popup was closed before completing authorization.'));
              } else if (err.type === 'popup_blocked') {
                reject(new Error('Sign-in popup was blocked by browser. Please allow popups for SLD System.'));
              } else {
                reject(new Error(err.message || 'Google authentication failed. Please try again.'));
              }
            }
          });

          tokenClient.requestAccessToken({ prompt: 'select_account' });
        });
      } catch (sdkError) {
        console.error('[GoogleAuthService] SDK initialization failed:', sdkError);
        throw sdkError;
      }
    }

    // 2. Mock simulation modal flow
    return new Promise((resolve, reject) => {
      // Create mount target in the DOM
      const modalContainer = document.createElement('div');
      modalContainer.id = 'google-mock-modal-root';
      document.body.appendChild(modalContainer);

      const root = createRoot(modalContainer);

      const handleClose = (errorMsg) => {
        root.unmount();
        modalContainer.remove();
        reject(new Error(errorMsg || 'Google authentication was cancelled by the user.'));
      };

      const handleSelect = (payload) => {
        root.unmount();
        modalContainer.remove();
        resolve(payload);
      };

      root.render(
        <GoogleMockModal
          mode={mode}
          onSelect={handleSelect}
          onClose={handleClose}
        />
      );
    });
  }
};
