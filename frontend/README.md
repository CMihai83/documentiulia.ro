# DocumentIulia.ro Frontend

A modern, responsive Next.js application for Romanian document management and invoicing.

## Features

### 🎨 Modern UI/UX Design
- **Tailwind CSS**: Utility-first styling with custom design system
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Smooth Animations**: Fade-in, slide, and hover effects for enhanced user experience
- **Gradient Backgrounds**: Subtle patterns and gradients for visual appeal
- **Interactive Elements**: Hover states, transforms, and micro-interactions

### 🌐 Internationalization (i18n)
- Multi-language support using Next.js internationalization
- Romanian and English translations
- Localized content for compliance badges, features, and pricing

### 📱 Component Architecture
- **Hero Section**: Eye-catching introduction with CTAs and compliance badges
- **Features Grid**: Highlighting key capabilities (VAT, OCR, SAF-T, E-Factura, AI, HR)
- **Testimonials**: Social proof with customer quotes
- **Pricing Cards**: Clear pricing tiers with feature comparisons

### 🎯 User Experience Enhancements
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Optimized images and lazy loading
- **SEO**: Meta tags and structured data
- **Progressive Enhancement**: Works without JavaScript

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React icons
- **Typography**: Inter font family
- **Internationalization**: next-intl

## Design System

### Colors
- **Primary**: Blue gradient (#2563eb to #1d4ed8)
- **Accent**: Purple (#9333ea)
- **Success**: Green (#22c55e)
- **Backgrounds**: Subtle grays and gradients

### Typography
- **Headings**: Bold, gradient text effects
- **Body**: Clean, readable Inter font
- **Hierarchy**: Consistent sizing and spacing

### Animations
- **Fade In**: Smooth entrance animations
- **Hover Effects**: Scale and shadow transitions
- **Staggered Loading**: Sequential element reveals

## Key UI Components

### Hero Section
- Large gradient background with subtle pattern overlay
- Animated compliance badges
- Dual CTA buttons with hover effects
- Responsive typography scaling

### Feature Cards
- Hover lift effects
- Animated icons
- Gradient icon backgrounds
- Staggered entrance animations

### Pricing Cards
- Popular plan highlighting
- Gradient buttons
- Feature checklists with icons
- Responsive grid layout

### Testimonials
- Card-based design
- Avatar placeholders
- Quote styling with decorative elements
- Hover animations

## Accessibility Features

- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance
- Focus management

## Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- CSS optimization with Tailwind
- Font loading optimization
- Bundle analysis and tree shaking

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Development Guidelines

### Adding New Animations
1. Define keyframes in `tailwind.config.ts`
2. Add animation classes to the config
3. Apply with `animate-*` classes in components

### Internationalization
1. Add keys to message files in `/messages`
2. Use `useTranslations()` hook in components
3. Follow existing key structure patterns

### Styling Conventions
1. Use Tailwind utility classes
2. Custom gradients for backgrounds
3. Consistent spacing with Tailwind scale
4. Hover states for interactive elements

## Deployment

The frontend is containerized with Docker and served through Nginx reverse proxy with SSL termination.