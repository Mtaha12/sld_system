/**
 * Google Authentication & Identity Services (GIS) Service
 * Manages Google OAuth 2.0 / OIDC client-side authentication flow.
 */

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

    // 2. If VITE_GOOGLE_CLIENT_ID is not yet configured (e.g. local dev / pending GCP project setup),
    // provide an authentic client-side OIDC simulation flow so developers and QA can test the exact flow.
    return new Promise((resolve, reject) => {
      const email = window.prompt("Google Account Simulation:\nEnter the Gmail address you want to sign in/up with:", "your_email@gmail.com");
      if (!email) {
        reject(new Error("Google authentication was cancelled by the user."));
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert("Invalid email format. Google sign-in failed.");
        reject(new Error("Invalid email format."));
        return;
      }

      setTimeout(() => {
        const selectedEmail = email.trim().toLowerCase();
        const defaultName = selectedEmail.split('@')[0];
        const fullName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

        const simulatedPayload = {
          provider: 'google',
          mode,
          credential: 'mock_google_id_token_' + Math.random().toString(36).substring(2, 15),
          profile: {
            email: selectedEmail,
            name: fullName + ' (Google)',
            givenName: fullName,
            familyName: '(Google)',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            emailVerified: true
          },
          timestamp: new Date().toISOString(),
          isSimulated: true
        };

        resolve(simulatedPayload);
      }, 800);
    });
  }
};
