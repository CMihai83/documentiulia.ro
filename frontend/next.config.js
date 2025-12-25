const createNextIntlPlugin = require('next-intl/plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'documentiulia.b-cdn.net',
        pathname: '/**',
      },
    ],
    // Use modern image formats
    formats: ['image/avif', 'image/webp'],
    // Limit image sizes for optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Allow all dev origins to prevent cross-origin blocking
  // This is needed when accessing dev server via proxy/reverse proxy
  allowedDevOrigins: [
    'http://documentiulia.ro',
    'http://documentiulia.ro:80',
    'https://documentiulia.ro',
    'https://documentiulia.ro:443',
    'http://www.documentiulia.ro',
    'https://www.documentiulia.ro',
    'http://95.216.112.59',
    'http://95.216.112.59:3000',
    'http://95.216.112.59:80',
    'http://localhost:3000',
    'http://localhost',
  ],

  // Compiler options for production optimization
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable gzip/brotli compression
  compress: true,

  // Optimize package imports for tree-shaking
  modularizeImports: {
    // Optimize lodash imports
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    // Optimize date-fns imports
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    // Optimize lucide-react icons
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'date-fns',
      'lodash',
    ],
  },

  // Webpack configuration for bundle optimization
  webpack: (config, { isServer, dev }) => {
    // Production-only optimizations
    if (!dev && !isServer) {
      // Optimized split chunks - fewer initial chunks, more async loading
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'async', // Only split async chunks by default
          minSize: 25000,
          maxSize: 500000, // Larger chunks = fewer requests
          minChunks: 1,
          maxAsyncRequests: 20,
          maxInitialRequests: 10, // Limit initial requests
          cacheGroups: {
            // Framework - always sync, shared across all pages
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Chart library - async only (heavy, not needed on all pages)
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-shape|d3-scale|d3-path|d3-array|d3-color|d3-format|d3-interpolate|d3-time|d3-time-format)[\\/]/,
              chunks: 'async',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Common vendor libs - shared across pages that need them
            lib: {
              name: 'lib',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'async',
              priority: 20,
              minChunks: 2, // Only if used by 2+ chunks
              reuseExistingChunk: true,
            },
            // Common application code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'async',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
        // Module IDs for better caching
        moduleIds: 'deterministic',
      };
    }

    return config;
  },

  // Security and cache headers
  async headers() {
    return [
      // Next.js static assets (immutable with content hash)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public static assets
      {
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // HTML pages - comprehensive security headers
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // XSS protection (legacy but still useful)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // HSTS - force HTTPS for 2 years with preload
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://eu.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://documentiulia.b-cdn.net https://www.google-analytics.com",
              "connect-src 'self' https://api.documentiulia.ro https://www.google-analytics.com https://eu.posthog.com https://*.sentry.io wss://*.clerk.accounts.dev",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Permissions Policy - restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self), usb=()',
          },
          // Cross-Origin policies
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Cache control for dynamic pages
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },

  // Redirect trailing slashes
  trailingSlash: false,

  // Power by header removal
  poweredByHeader: false,

  // API rewrites to proxy to backend
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      // Auth API
      {
        source: '/api/v1/auth/:path*',
        destination: `${backendUrl}/api/v1/auth/:path*`,
      },
      // Blog API
      {
        source: '/api/v1/blog/:path*',
        destination: `${backendUrl}/api/v1/blog/:path*`,
      },
      // Courses API (content module)
      {
        source: '/api/v1/courses/:path*',
        destination: `${backendUrl}/api/v1/courses/:path*`,
      },
      {
        source: '/api/v1/courses',
        destination: `${backendUrl}/api/v1/courses`,
      },
      // LMS reference data
      {
        source: '/api/v1/lms/:path*',
        destination: `${backendUrl}/api/v1/lms/:path*`,
      },
      // Finance API
      {
        source: '/api/v1/finance/:path*',
        destination: `${backendUrl}/api/v1/finance/:path*`,
      },
      // ANAF API
      {
        source: '/api/v1/anaf/:path*',
        destination: `${backendUrl}/api/v1/anaf/:path*`,
      },
      // HR API
      {
        source: '/api/v1/hr/:path*',
        destination: `${backendUrl}/api/v1/hr/:path*`,
      },
      // Dashboard API
      {
        source: '/api/v1/dashboard/:path*',
        destination: `${backendUrl}/api/v1/dashboard/:path*`,
      },
      // Health check
      {
        source: '/api/v1/health/:path*',
        destination: `${backendUrl}/api/v1/health/:path*`,
      },
      // Generic API fallback
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
