const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'documentiulia-api',
    script: './dist/main.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development', // Keep as development to enable Swagger docs
      PORT: 3001,
      DATABASE_URL: process.env.DATABASE_URL,
      CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_JWT_KEY: process.env.CLERK_JWT_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      DEV_AUTH_TOKEN: process.env.DEV_AUTH_TOKEN,
      ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
    }
  }]
};
