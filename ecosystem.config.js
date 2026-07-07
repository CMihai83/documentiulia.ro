module.exports = {
  apps: [
    {
      name: 'documentiulia-frontend',
      cwd: '/root/documentiulia.ro/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
    {
      name: 'documentiulia-backend',
      cwd: '/root/documentiulia.ro/backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      node_args: '--enable-source-maps --max-old-space-size=2048',
      env_file: '/root/documentiulia.ro/backend/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CORS_ORIGINS: 'https://documentiulia.ro,http://documentiulia.ro,http://localhost:3000',
        FRONTEND_URL: 'https://documentiulia.ro',
      },
    },
  ],
};
