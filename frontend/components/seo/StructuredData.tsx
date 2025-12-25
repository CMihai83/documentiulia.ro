import { memo } from 'react';

/**
 * Structured Data Components - DocumentIulia.ro
 * JSON-LD schemas for SEO rich snippets
 */

// Organization schema for company pages
interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  socialProfiles?: string[];
}

export const OrganizationSchema = memo(function OrganizationSchema({
  data,
}: {
  data: OrganizationData;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    email: data.email,
    telephone: data.phone,
    address: data.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: data.address.street,
          addressLocality: data.address.city,
          postalCode: data.address.postalCode,
          addressCountry: data.address.country,
        }
      : undefined,
    sameAs: data.socialProfiles,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// Software Application schema for the ERP product
export const SoftwareApplicationSchema = memo(function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DocumentIulia.ro',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Platforma ERP de contabilitate cu inteligenta artificiala pentru afaceri din Romania',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RON',
      description: 'Plan gratuit disponibil',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
    featureList: [
      'Facturare electronica',
      'e-Factura ANAF',
      'Rapoarte financiare',
      'Gestionare clienti',
      'Validare CUI/IBAN',
      'Export SAF-T',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// Invoice schema for invoice pages
interface InvoiceData {
  number: string;
  series: string;
  issuedAt: string;
  dueDate: string;
  total: number;
  currency: string;
  status: string;
  customer: {
    name: string;
    cui?: string;
  };
  seller: {
    name: string;
    cui?: string;
  };
}

export const InvoiceSchema = memo(function InvoiceSchema({
  data,
}: {
  data: InvoiceData;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Invoice',
    identifier: `${data.series}-${data.number}`,
    description: `Factura ${data.series}-${data.number}`,
    confirmationNumber: data.number,
    paymentDueDate: data.dueDate,
    totalPaymentDue: {
      '@type': 'PriceSpecification',
      price: data.total,
      priceCurrency: data.currency,
    },
    paymentStatus: data.status === 'paid' ? 'PaymentComplete' : 'PaymentDue',
    customer: {
      '@type': 'Organization',
      name: data.customer.name,
      taxID: data.customer.cui,
    },
    provider: {
      '@type': 'Organization',
      name: data.seller.name,
      taxID: data.seller.cui,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// FAQ schema for help/FAQ pages
interface FAQItem {
  question: string;
  answer: string;
}

export const FAQSchema = memo(function FAQSchema({
  items,
}: {
  items: FAQItem[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// Breadcrumb schema for navigation
interface BreadcrumbItem {
  name: string;
  url: string;
}

export const BreadcrumbSchema = memo(function BreadcrumbSchema({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// WebSite schema with search action
export const WebSiteSchema = memo(function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DocumentIulia.ro',
    url: 'https://documentiulia.ro',
    description: 'Platforma ERP de contabilitate cu AI pentru Romania',
    inLanguage: 'ro-RO',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://documentiulia.ro/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// LocalBusiness schema for Romanian business presence
export const LocalBusinessSchema = memo(function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'DocumentIulia.ro',
    description: 'Servicii de contabilitate si ERP cu inteligenta artificiala',
    url: 'https://documentiulia.ro',
    telephone: '+40-XXX-XXX-XXX',
    email: 'contact@documentiulia.ro',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bucuresti',
      addressCountry: 'RO',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '44.4268',
      longitude: '26.1025',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    priceRange: '$$',
    areaServed: {
      '@type': 'Country',
      name: 'Romania',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

// Product schema for pricing plans
interface PricingPlan {
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
}

export const PricingSchema = memo(function PricingSchema({
  plans,
}: {
  plans: PricingPlan[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: plans.map((plan, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: plan.name,
        description: plan.description,
        offers: {
          '@type': 'Offer',
          price: plan.price,
          priceCurrency: plan.currency,
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
});

export default {
  OrganizationSchema,
  SoftwareApplicationSchema,
  InvoiceSchema,
  FAQSchema,
  BreadcrumbSchema,
  WebSiteSchema,
  LocalBusinessSchema,
  PricingSchema,
};
