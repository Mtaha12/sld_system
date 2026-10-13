// ==============================================================================
// PM2 ECOSYSTEM PRODUCTION CONFIGURATION - SUPREME LAW DIGEST BACKEND
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'sld-backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      kill_timeout: 5000,
      listen_timeout: 8000,
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
