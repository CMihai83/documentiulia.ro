/**
 * Schema.org structured data for SEO
 * DocumentIulia.ro - AI-Powered ERP/Accounting Platform
 */

export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    '@type': 'ContactPoint';
    telephone: string;
    contactType: string;
    areaServed: string;
    availableLanguage: string[];
  };
  address: {
    '@type': 'PostalAddress';
    addressCountry: string;
    addressLocality: string;
  };
}

export interface SoftwareApplicationSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    '@type': 'AggregateOffer';
    lowPrice: string;
    highPrice: string;
    priceCurrency: string;
    offerCount: number;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    ratingCount: string;
  };
}

export interface WebPageSchema {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  isPartOf: {
    '@type': 'WebSite';
    name: string;
    url: string;
  };
  breadcrumb?: {
    '@type': 'BreadcrumbList';
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      name: string;
      item: string;
    }>;
  };
}

export interface FAQPageSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  author: {
    '@type': 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  image: string;
}

// Organization schema for DocumentIulia
export const organizationSchema: OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'DocumentIulia',
  url: 'https://documentiulia.ro',
  logo: 'https://documentiulia.ro/logo.png',
  description: 'Platformă ERP/Contabilitate cu Inteligență Artificială pentru afaceri din România și internațional. Facturare, TVA, e-Factura ANAF, SAF-T D406, HR, Payroll.',
  sameAs: [
    'https://www.linkedin.com/company/documentiulia',
    'https://twitter.com/documentiulia',
    'https://www.facebook.com/documentiulia',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+40-XXX-XXX-XXX',
    contactType: 'customer service',
    areaServed: 'RO',
    availableLanguage: ['Romanian', 'English'],
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'RO',
    addressLocality: 'București',
  },
};

// Software application schema
export const softwareApplicationSchema: SoftwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DocumentIulia ERP',
  description: 'Platformă ERP/Contabilitate cu AI pentru facturare, TVA, e-Factura ANAF, SAF-T D406, HR și payroll. Conformitate 100% cu legislația românească.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '149',
    priceCurrency: 'RON',
    offerCount: 3,
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '250',
  },
};

// Generate WebPage schema
export function generateWebPageSchema(
  name: string,
  description: string,
  url: string,
  language: string = 'ro',
  breadcrumbs?: Array<{ name: string; url: string }>,
): WebPageSchema {
  const schema: WebPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    inLanguage: language,
    isPartOf: {
      '@type': 'WebSite',
      name: 'DocumentIulia',
      url: 'https://documentiulia.ro',
    },
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }

  return schema;
}

// Generate FAQ schema
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>,
): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Generate Article schema
export function generateArticleSchema(
  headline: string,
  description: string,
  datePublished: string,
  dateModified: string,
  image: string,
): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    author: {
      '@type': 'Organization',
      name: 'DocumentIulia',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DocumentIulia',
      logo: {
        '@type': 'ImageObject',
        url: 'https://documentiulia.ro/logo.png',
      },
    },
    datePublished,
    dateModified,
    image,
  };
}

// Pricing page FAQ schema
export const pricingFAQSchema = generateFAQSchema([
  {
    question: 'Ce include planul Gratuit?',
    answer: 'Planul Gratuit include calculul TVA de bază, 5 facturi/lună, și 10 pagini OCR/lună. Perfect pentru începători și freelanceri.',
  },
  {
    question: 'Pot anula abonamentul oricând?',
    answer: 'Da, poți anula abonamentul oricând. Nu există angajamente pe termen lung și nu se percep taxe de anulare.',
  },
  {
    question: 'Cum funcționează integrarea cu ANAF?',
    answer: 'DocumentIulia se integrează direct cu SPV ANAF pentru e-Factura și SAF-T D406. Totul este automatizat și conform cu legislația românească.',
  },
  {
    question: 'Este platforma conformă cu GDPR?',
    answer: 'Da, DocumentIulia respectă pe deplin GDPR și toate regulamentele de protecție a datelor. Datele sunt stocate în UE și criptate.',
  },
  {
    question: 'Oferiti suport în limba română?',
    answer: 'Da, oferim suport complet în limba română prin email și chat. Clienții Business și Enterprise beneficiază de suport prioritar.',
  },
]);

// Home page local business schema for Romanian targeting
export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://documentiulia.ro/#organization',
  name: 'DocumentIulia',
  image: 'https://documentiulia.ro/logo.png',
  priceRange: '0 RON - 149 RON/lună',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'RO',
    addressRegion: 'București',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 44.4268,
    longitude: 26.1025,
  },
  url: 'https://documentiulia.ro',
  telephone: '+40-XXX-XXX-XXX',
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '18:00',
  },
  areaServed: [
    {
      '@type': 'Country',
      name: 'Romania',
    },
    {
      '@type': 'Country',
      name: 'Republic of Moldova',
    },
  ],
};

// Service schema for main features
export const servicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Cloud Accounting Software',
  provider: {
    '@type': 'Organization',
    name: 'DocumentIulia',
  },
  areaServed: 'Romania',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Pachete DocumentIulia',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Gratuit',
          description: 'Plan gratuit cu funcționalități de bază',
        },
        price: '0',
        priceCurrency: 'RON',
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Pro',
          description: 'Plan profesional cu facturare nelimitată și HR',
        },
        price: '49',
        priceCurrency: 'RON',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '49',
          priceCurrency: 'RON',
          billingDuration: 'P1M',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Business',
          description: 'Plan complet cu API și integrări SAGA/ANAF',
        },
        price: '149',
        priceCurrency: 'RON',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '149',
          priceCurrency: 'RON',
          billingDuration: 'P1M',
        },
      },
    ],
  },
};

// Helper to render schema as script tag
export function renderSchemaScript(schema: object): string {
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 0)}</script>`;
}
