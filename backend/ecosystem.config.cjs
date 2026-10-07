module.exports = {
  apps: [
    {
      name: 'sld-backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
