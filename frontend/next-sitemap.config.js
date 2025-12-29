/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://documentiulia.ro',
  generateRobotsTxt: true,
  generateIndexSitemap: true,

  // Exclude private/authenticated routes
  exclude: [
    '/api/*',
    '/dashboard/*',
    '/settings/*',
    '/onboarding/*',
    '/*/dashboard/*',
    '/*/settings/*',
    '/*/onboarding/*',
    '/admin/*',
    '/*/admin/*',
  ],

  // Generate sitemaps for each locale
  alternateRefs: [
    {
      href: 'https://documentiulia.ro',
      hreflang: 'ro',
    },
    {
      href: 'https://documentiulia.ro/en',
      hreflang: 'en',
    },
    {
      href: 'https://documentiulia.ro/de',
      hreflang: 'de',
    },
  ],

  // Robots.txt configuration
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/settings/',
          '/onboarding/',
          '/admin/',
          '/*?*', // Exclude query strings
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/admin/'],
      },
    ],
    additionalSitemaps: [
      'https://documentiulia.ro/sitemap-0.xml',
    ],
  },

  // Transform function to customize sitemap entries
  transform: async (config, path) => {
    // Define priority based on path
    let priority = 0.7;
    let changefreq = 'weekly';

    // Home page - highest priority
    if (path === '/' || path === '/ro' || path === '/en' || path === '/de') {
      priority = 1.0;
      changefreq = 'daily';
    }

    // Main feature pages
    if (
      path.includes('/features') ||
      path.includes('/pricing') ||
      path.includes('/about')
    ) {
      priority = 0.9;
      changefreq = 'weekly';
    }

    // Blog and help content
    if (path.includes('/blog') || path.includes('/help') || path.includes('/faq')) {
      priority = 0.8;
      changefreq = 'weekly';
    }

    // Legal pages - lower priority
    if (path.includes('/privacy') || path.includes('/terms') || path.includes('/gdpr')) {
      priority = 0.3;
      changefreq = 'monthly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },

  // Additional paths to include
  additionalPaths: async (config) => {
    const result = [];

    // Add main public pages
    const publicPages = [
      '/',
      '/features',
      '/pricing',
      '/about',
      '/contact',
      '/blog',
      '/help',
      '/faq',
      '/privacy',
      '/terms',
      '/gdpr',
    ];

    // Generate for each locale
    const locales = ['', '/ro', '/en', '/de'];

    for (const locale of locales) {
      for (const page of publicPages) {
        const path = locale + page;
        if (path) {
          result.push(await config.transform(config, path));
        }
      }
    }

    return result;
  },
};
