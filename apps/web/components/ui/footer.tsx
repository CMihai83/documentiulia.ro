'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type FooterVariant = 'default' | 'minimal' | 'centered' | 'bordered';

const variantClasses: Record<FooterVariant, string> = {
  default: 'bg-background border-t',
  minimal: 'bg-transparent',
  centered: 'bg-muted/50 border-t text-center',
  bordered: 'bg-background border-t-2 border-primary',
};

// ============================================================================
// Main Footer Component
// ============================================================================

interface FooterProps {
  children: React.ReactNode;
  className?: string;
  variant?: FooterVariant;
}

export function Footer({
  children,
  className,
  variant = 'default',
}: FooterProps) {
  return (
    <footer
      className={cn(
        'w-full py-6 px-4 lg:px-6',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </footer>
  );
}

// ============================================================================
// Footer Container
// ============================================================================

interface FooterContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function FooterContainer({ children, className }: FooterContainerProps) {
  return (
    <div className={cn('container mx-auto', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Footer Grid
// ============================================================================

interface FooterGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function FooterGrid({
  children,
  columns = 4,
  className,
}: FooterGridProps) {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-8', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Footer Section
// ============================================================================

interface FooterSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function FooterSection({
  title,
  children,
  className,
}: FooterSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h4 className="font-semibold text-sm uppercase tracking-wider">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Footer Links
// ============================================================================

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterLinksProps {
  links: FooterLink[];
  className?: string;
}

export function FooterLinks({ links, className }: FooterLinksProps) {
  return (
    <ul className={cn('space-y-2', className)}>
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
            {link.external && (
              <svg
                className="inline-block ml-1 w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Footer Logo
// ============================================================================

interface FooterLogoProps {
  children?: React.ReactNode;
  href?: string;
  className?: string;
}

export function FooterLogo({
  children,
  href,
  className,
}: FooterLogoProps) {
  const content = children || (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">D</span>
      </div>
      <span className="font-semibold text-lg">DocumentIulia</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className={cn('inline-flex', className)}>
        {content}
      </a>
    );
  }

  return <div className={cn('inline-flex', className)}>{content}</div>;
}

// ============================================================================
// Footer Description
// ============================================================================

interface FooterDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function FooterDescription({ children, className }: FooterDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground max-w-sm', className)}>
      {children}
    </p>
  );
}

// ============================================================================
// Footer Social Links
// ============================================================================

interface SocialLink {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface FooterSocialLinksProps {
  links: SocialLink[];
  className?: string;
}

export function FooterSocialLinks({ links, className }: FooterSocialLinksProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {links.map((link) => (
        <motion.a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {link.icon}
          <span className="sr-only">{link.name}</span>
        </motion.a>
      ))}
    </div>
  );
}

// ============================================================================
// Footer Newsletter
// ============================================================================

interface FooterNewsletterProps {
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  onSubscribe?: (email: string) => void;
  className?: string;
}

export function FooterNewsletter({
  title = 'Newsletter',
  description = 'Abonați-vă pentru noutăți și actualizări.',
  placeholder = 'Email-ul dumneavoastră',
  buttonText = 'Abonare',
  onSubscribe,
  className,
}: FooterNewsletterProps) {
  const [email, setEmail] = React.useState('');
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onSubscribe?.(email);
      setIsSubmitted(true);
      setEmail('');
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && <h4 className="font-semibold text-sm uppercase tracking-wider">{title}</h4>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className={cn(
            'flex-1 h-10 px-3 rounded-lg border bg-background',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'h-10 px-4 rounded-lg font-medium text-sm',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
        >
          {isSubmitted ? 'Trimis!' : buttonText}
        </motion.button>
      </form>
    </div>
  );
}

// ============================================================================
// Footer Bottom
// ============================================================================

interface FooterBottomProps {
  children: React.ReactNode;
  className?: string;
}

export function FooterBottom({ children, className }: FooterBottomProps) {
  return (
    <div
      className={cn(
        'mt-8 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Footer Copyright
// ============================================================================

interface FooterCopyrightProps {
  companyName?: string;
  startYear?: number;
  className?: string;
}

export function FooterCopyright({
  companyName = 'DocumentIulia',
  startYear,
  className,
}: FooterCopyrightProps) {
  const currentYear = new Date().getFullYear();
  const yearDisplay = startYear && startYear !== currentYear
    ? `${startYear}-${currentYear}`
    : currentYear;

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      © {yearDisplay} {companyName}. Toate drepturile rezervate.
    </p>
  );
}

// ============================================================================
// Footer Legal Links
// ============================================================================

interface FooterLegalLinksProps {
  links?: Array<{ label: string; href: string }>;
  className?: string;
}

export function FooterLegalLinks({
  links = [
    { label: 'Politica de Confidențialitate', href: '/privacy' },
    { label: 'Termeni și Condiții', href: '/terms' },
    { label: 'Cookie-uri', href: '/cookies' },
  ],
  className,
}: FooterLegalLinksProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-sm', className)}>
      {links.map((link, index) => (
        <React.Fragment key={link.href}>
          <a
            href={link.href}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </a>
          {index < links.length - 1 && (
            <span className="text-muted-foreground/50">|</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: App Footer
// ============================================================================

interface AppFooterProps {
  companyName?: string;
  description?: string;
  links?: {
    produs?: FooterLink[];
    companie?: FooterLink[];
    resurse?: FooterLink[];
    legal?: FooterLink[];
  };
  socialLinks?: SocialLink[];
  showNewsletter?: boolean;
  onNewsletterSubscribe?: (email: string) => void;
  className?: string;
}

const defaultSocialLinks: SocialLink[] = [
  {
    name: 'Facebook',
    href: 'https://facebook.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
    ),
  },
];

export function AppFooter({
  companyName = 'DocumentIulia',
  description = 'Platformă inteligentă de contabilitate pentru afaceri românești. Automatizare, conformitate și raportare în timp real.',
  links = {},
  socialLinks = defaultSocialLinks,
  showNewsletter = true,
  onNewsletterSubscribe,
  className,
}: AppFooterProps) {
  const defaultLinks = {
    produs: [
      { label: 'Funcționalități', href: '/features' },
      { label: 'Prețuri', href: '/pricing' },
      { label: 'Integrări', href: '/integrations' },
      { label: 'API', href: '/api', external: true },
    ],
    companie: [
      { label: 'Despre noi', href: '/about' },
      { label: 'Cariere', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
    resurse: [
      { label: 'Documentație', href: '/docs' },
      { label: 'Ghiduri', href: '/guides' },
      { label: 'Tutoriale', href: '/tutorials' },
      { label: 'Suport', href: '/support' },
    ],
    legal: [
      { label: 'Confidențialitate', href: '/privacy' },
      { label: 'Termeni', href: '/terms' },
      { label: 'GDPR', href: '/gdpr' },
      { label: 'Cookie-uri', href: '/cookies' },
    ],
  };

  const mergedLinks = {
    produs: links.produs || defaultLinks.produs,
    companie: links.companie || defaultLinks.companie,
    resurse: links.resurse || defaultLinks.resurse,
    legal: links.legal || defaultLinks.legal,
  };

  return (
    <Footer variant="default" className={className}>
      <FooterContainer>
        <FooterGrid columns={5}>
          <FooterSection className="sm:col-span-2">
            <FooterLogo href="/" />
            <FooterDescription>{description}</FooterDescription>
            <FooterSocialLinks links={socialLinks} />
          </FooterSection>

          <FooterSection title="Produs">
            <FooterLinks links={mergedLinks.produs} />
          </FooterSection>

          <FooterSection title="Companie">
            <FooterLinks links={mergedLinks.companie} />
          </FooterSection>

          {showNewsletter ? (
            <FooterNewsletter onSubscribe={onNewsletterSubscribe} />
          ) : (
            <FooterSection title="Resurse">
              <FooterLinks links={mergedLinks.resurse} />
            </FooterSection>
          )}
        </FooterGrid>

        <FooterBottom>
          <FooterCopyright companyName={companyName} startYear={2024} />
          <FooterLegalLinks />
        </FooterBottom>
      </FooterContainer>
    </Footer>
  );
}

// ============================================================================
// Simple Footer (for dashboard/app pages)
// ============================================================================

interface SimpleFooterProps {
  companyName?: string;
  className?: string;
}

export function SimpleFooter({
  companyName = 'DocumentIulia',
  className,
}: SimpleFooterProps) {
  return (
    <Footer variant="minimal" className={cn('py-4', className)}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {companyName}</p>
        <div className="flex items-center gap-4">
          <a href="/help" className="hover:text-foreground transition-colors">
            Ajutor
          </a>
          <a href="/privacy" className="hover:text-foreground transition-colors">
            Confidențialitate
          </a>
          <a href="/terms" className="hover:text-foreground transition-colors">
            Termeni
          </a>
        </div>
      </div>
    </Footer>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type FooterProps,
  type FooterContainerProps,
  type FooterGridProps,
  type FooterSectionProps,
  type FooterLink,
  type FooterLinksProps,
  type FooterLogoProps,
  type FooterDescriptionProps,
  type SocialLink,
  type FooterSocialLinksProps,
  type FooterNewsletterProps,
  type FooterBottomProps,
  type FooterCopyrightProps,
  type FooterLegalLinksProps,
  type AppFooterProps,
  type SimpleFooterProps,
};
