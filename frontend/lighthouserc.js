/**
 * Lighthouse CI Configuration - DocumentIulia.ro
 * Performance budgets and audit settings
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/ro',
        'http://localhost:3000/ro/dashboard',
        'http://localhost:3000/ro/login',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          // Simulate 3G connection for realistic Romanian user experience
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance budgets (critical for <1.5s LCP target)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],

        // Accessibility (WCAG 2.1 AA compliance)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',

        // Best Practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'is-on-https': 'error',
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',

        // SEO
        'categories:seo': ['error', { minScore: 0.9 }],
        'meta-description': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'hreflang': 'warn',

        // Performance (overall score)
        'categories:performance': ['warn', { minScore: 0.85 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB JS
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }], // 500KB images
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // 2MB total

        // Disable some less critical audits
        'unsized-images': 'warn',
        'uses-responsive-images': 'warn',
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
