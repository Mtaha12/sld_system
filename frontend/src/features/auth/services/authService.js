export const authService = {
  login: async (credentials) => {
    console.log('Login credentials:', credentials)
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true })
      }, 1500)
    })
  },

  signup: async (userData) => {
    console.log('Signup data:', userData)
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
    console.log('Resending code to:', email)
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 500)
    })
  },

  forgotPassword: async (data) => {
    console.log('Forgot password request for:', data)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true })
      }, 1500)
    })
  },
}
