module.exports = {
  apps: [{
    name: 'documentiulia-ml',
    script: 'venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000',
    cwd: '/var/www/documentiulia.ro/services/ml',
    interpreter: 'none',
    env: {
      DEBUG: 'false',
      ENVIRONMENT: 'production',
      TESSERACT_CMD: '/usr/bin/tesseract',
      DATABASE_URL: 'postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    error_file: '/var/www/documentiulia.ro/services/ml/logs/error.log',
    out_file: '/var/www/documentiulia.ro/services/ml/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
