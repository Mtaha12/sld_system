import api from '../../../services/api.js';

export const authService = {
  /**
   * Performs standard username/email login
   * @param {Object} credentials { identifier, password }
   * @returns {Promise<Object>}
   */
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('sld_access_token', response.data.accessToken);
      localStorage.setItem('sld_refresh_token', response.data.refreshToken);
      localStorage.setItem('sld_auth_session', 'true');
      localStorage.setItem('sld_user_profile', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Registers a new administrator account
   * @param {Object} userData { fullName, username, email, password }
   * @returns {Promise<Object>}
   */
  signup: async (userData) => {
    const response = await api.post('/api/auth/signup', userData);
    if (response.data.success) {
      // Store email temporarily to bypass missing input parameters on verify code step
      localStorage.setItem('sld_pending_email', userData.email);
      if (response.data.data && response.data.data.otpCode) {
        console.log(
          '%c[SLD Portal OTP Code]: ' + response.data.data.otpCode + ' (Simulation Mode)',
          'color: #e55c41; font-weight: bold; font-size: 16px; background-color: #14151a; padding: 6px 12px; border-radius: 4px; border: 1px solid #e55c41;'
        );
      }
    }
    return response.data;
  },

  /**
   * Verifies the email address using the received 6-digit OTP code
   * @param {string} code 
   * @returns {Promise<Object>}
   */
  verifyEmail: async (code) => {
    const email = localStorage.getItem('sld_pending_email') || '';
    const response = await api.post('/api/auth/verify-email', { code, email });
    if (response.data.success) {
      localStorage.removeItem('sld_pending_email');
    }
    return response.data;
  },

  /**
   * Resends verification OTP code to the email address
   * @param {string} email 
   * @returns {Promise<Object>}
   */
  resendVerificationCode: async (email) => {
    const response = await api.post('/api/auth/resend-code', { email });
    if (response.data.success && response.data.data && response.data.data.otpCode) {
      console.log(
        '%c[SLD Portal Resent OTP Code]: ' + response.data.data.otpCode + ' (Simulation Mode)',
        'color: #e55c41; font-weight: bold; font-size: 16px; background-color: #14151a; padding: 6px 12px; border-radius: 4px; border: 1px solid #e55c41;'
      );
    }
    return response.data;
  },

  /**
   * Starts password reset flow (requests OTP)
   * @param {Object} data { identifier }
   * @returns {Promise<Object>}
   */
  forgotPassword: async (data) => {
    const response = await api.post('/api/auth/forgot-password', data);
    if (response.data.success && response.data.data && response.data.data.otpCode) {
      console.log(
        '%c[SLD Portal Password Reset Code]: ' + response.data.data.otpCode + ' (Simulation Mode)',
        'color: #e55c41; font-weight: bold; font-size: 16px; background-color: #14151a; padding: 6px 12px; border-radius: 4px; border: 1px solid #e55c41;'
      );
    }
    return response.data;
  },

  /**
   * Verifies the password reset OTP code
   * @param {Object} data { email, otp }
   * @returns {Promise<Object>}
   */
  verifyResetOtp: async (data) => {
    const response = await api.post('/api/auth/verify-reset-otp', data);
    return response.data;
  },

  /**
   * Resets the user password after OTP verification
   * @param {Object} data { email, token, newPassword, confirmPassword }
   * @returns {Promise<Object>}
   */
  resetPassword: async (data) => {
    const response = await api.post('/api/auth/reset-password', data);
    return response.data;
  },

  /**
   * Exchanges Google GIS credentials with backend JWT session tokens
   * @param {Object} googlePayload GIS payload
   * @returns {Promise<Object>}
   */
  loginWithGoogle: async (googlePayload) => {
    const response = await api.post('/api/auth/google/login', { 
      profile: googlePayload.profile || {
        email: 'advocate.demo@gmail.com',
        name: 'Advocate Demo User',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      },
      isSimulated: Boolean(googlePayload.isSimulated)
    });

    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('sld_access_token', response.data.accessToken);
      localStorage.setItem('sld_refresh_token', response.data.refreshToken);
      localStorage.setItem('sld_auth_session', 'true');
      localStorage.setItem('sld_user_profile', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Handles Google account registrations (delegated to googleLogin)
   * @param {Object} googlePayload 
   * @returns {Promise<Object>}
   */
  signupWithGoogle: async (googlePayload) => {
    return authService.loginWithGoogle(googlePayload);
  },
};
