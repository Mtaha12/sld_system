export const authService = {
  login: async (credentials) => {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, user: { username: credentials?.username || 'admin' } })
      }, 1500)
    })
  },

  signup: async (userData) => {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, email: userData.email })
      }, 1500)
    })
  },

  verifyEmail: async (code) => {
    // Mock API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        if (code === '123456') {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Invalid verification code' })
        }
      }, 800)
    })
  },

  resendVerificationCode: async (email) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, email }), 500)
    })
  },

  forgotPassword: async (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, email: data?.email })
      }, 1500)
    })
  },

  /**
   * Dedicated backend integration point for Google Login.
   * When the backend OAuth endpoint is ready, this will dispatch POST /api/auth/google/login.
   * @param {Object} googlePayload - Standardized credential payload from googleAuthService
   */
  loginWithGoogle: async (googlePayload) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          provider: 'google',
          mode: 'login',
          payload: googlePayload,
          user: {
            email: googlePayload.profile?.email || 'google.user@example.com',
            fullName: googlePayload.profile?.name || 'Google User',
            username: googlePayload.profile?.email?.split('@')[0] || 'google_user'
          },
          message: 'Google authorization received. Ready for backend session exchange.'
        });
      }, 800);
    });
  },

  /**
   * Dedicated backend integration point for Google Sign Up.
   * When the backend OAuth endpoint is ready, this will dispatch POST /api/auth/google/signup.
   * @param {Object} googlePayload - Standardized credential payload from googleAuthService
   */
  signupWithGoogle: async (googlePayload) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          provider: 'google',
          mode: 'signup',
          payload: googlePayload,
          user: {
            email: googlePayload.profile?.email || 'google.user@example.com',
            fullName: googlePayload.profile?.name || 'Google User',
            username: googlePayload.profile?.email?.split('@')[0] || 'google_user'
          },
          message: 'Google registration received. Ready for backend account creation.'
        });
      }, 800);
    });
  },
}
