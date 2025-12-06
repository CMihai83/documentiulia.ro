'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  FileText,
  Receipt,
  BarChart3,
  Wallet,
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  Menu,
  X,
  Globe,
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  const t = useTranslations();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: FileText,
      title: t('landing.features.efactura.title'),
      description: t('landing.features.efactura.description'),
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      icon: Sparkles,
      title: t('landing.features.ocr.title'),
      description: t('landing.features.ocr.description'),
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      icon: Receipt,
      title: t('landing.features.saft.title'),
      description: t('landing.features.saft.description'),
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      icon: BarChart3,
      title: t('landing.features.forecast.title'),
      description: t('landing.features.forecast.description'),
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      icon: Wallet,
      title: t('landing.features.bank.title'),
      description: t('landing.features.bank.description'),
      color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    },
    {
      icon: Building2,
      title: t('landing.features.reports.title'),
      description: t('landing.features.reports.description'),
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    },
  ];

  const stats = [
    { value: '10,000+', label: t('landing.stats.users') },
    { value: '2M+', label: t('landing.stats.invoices') },
    { value: '40%', label: t('landing.stats.savings') },
    { value: '98%', label: t('landing.stats.accuracy') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">{t('common.appName')}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {t('landing.features.title')}
              </Link>
              <Link
                href="#pricing"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {t('landing.pricing.title')}
              </Link>
              <Link
                href="/sign-in"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {t('auth.signIn')}
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                {t('landing.hero.cta')}
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Închide meniul' : 'Deschide meniul'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800"
            >
              <div className="flex flex-col gap-4">
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('landing.features.title')}
                </Link>
                <Link
                  href="#pricing"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('landing.pricing.title')}
                </Link>
                <Link
                  href="/sign-in"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('auth.signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-center hover:bg-primary/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('landing.hero.cta')}
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Romanian flag accent */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium mb-6"
            >
              <span className="w-5 h-3 romania-gradient rounded-sm" />
              <span>100% {t('landing.compliance.title')}</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance mb-6"
            >
              {t('landing.hero.title')}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('landing.hero.demo')}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('landing.features.title')}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 card-hover"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('landing.pricing.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-2">{t('landing.pricing.free.name')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('landing.pricing.free.description')}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t('landing.pricing.free.price')}</span>
                <span className="text-gray-600 dark:text-gray-400"> RON{t('landing.pricing.perMonth')}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(t.raw('landing.pricing.free.features') as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block w-full py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-center font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('landing.pricing.startTrial')}
              </Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-primary text-white relative"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-sm font-semibold rounded-full">
                Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('landing.pricing.pro.name')}</h3>
              <p className="text-white/80 mb-4">{t('landing.pricing.pro.description')}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t('landing.pricing.pro.price')}</span>
                <span className="text-white/80"> RON{t('landing.pricing.perMonth')}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(t.raw('landing.pricing.pro.features') as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block w-full py-3 rounded-xl bg-white text-primary text-center font-semibold hover:bg-white/90 transition-colors"
              >
                {t('landing.pricing.startTrial')}
              </Link>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-2">
                {t('landing.pricing.enterprise.name')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('landing.pricing.enterprise.description')}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t('landing.pricing.enterprise.price')}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(t.raw('landing.pricing.enterprise.features') as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="block w-full py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-center font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Contact
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-primary to-blue-700 text-white"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.cta.title')}</h2>
            <p className="text-white/80 mb-8">{t('landing.cta.subtitle')}</p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors"
            >
              {t('landing.cta.button')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">{t('common.appName')}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">
                {t('auth.terms')}
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
                {t('auth.privacy')}
              </Link>
              <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white">
                Contact
              </Link>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} {t('common.appName')}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
