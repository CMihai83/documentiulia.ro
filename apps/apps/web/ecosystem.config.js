const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

module.exports = {
  apps: [{
    name: 'documentiulia-web-v2',
    script: '../../node_modules/.bin/next',
    args: 'start -p 3005',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://documentiulia.ro/api/v2',
      NEXT_PUBLIC_ML_API_URL: process.env.NEXT_PUBLIC_ML_API_URL || 'https://documentiulia.ro/api/ml',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
      NEXT_PUBLIC_APP_NAME: 'DocumentIulia',
      NEXT_PUBLIC_APP_URL: 'https://documentiulia.ro',
    }
  }]
};
