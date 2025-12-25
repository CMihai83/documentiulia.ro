'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle, MessageCircle, Mail } from 'lucide-react';
import Link from 'next/link';

export default function FAQPage() {
  const t = useTranslations();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'general',
      name: t('faq.categories.general'),
      icon: HelpCircle,
    },
    {
      id: 'billing',
      name: t('faq.categories.billing'),
      icon: HelpCircle,
    },
    {
      id: 'technical',
      name: t('faq.categories.technical'),
      icon: HelpCircle,
    },
    {
      id: 'compliance',
      name: t('faq.categories.compliance'),
      icon: HelpCircle,
    },
  ];

  // Get FAQ items from translations
  const getFaqItems = () => {
    try {
      const items = t.raw('faq.items');
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    } catch {
      return [];
    }
  };

  const faqItems = getFaqItems();

  const filteredFaqs = faqItems.filter((faq: { question: string; answer: string }) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('faq.pageTitle')}</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            {t('faq.pageSubtitle')}
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('faq.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-primary-500 hover:text-primary-600 transition text-sm font-medium"
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Items */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('faq.noResults')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq: { question: string; answer: string }, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition"
                  >
                    <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                    {openIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 bg-primary-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('faq.stillHaveQuestions')}</h2>
          <p className="text-gray-600 mb-8">{t('faq.contactUs')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              <Mail className="w-5 h-5" />
              {t('faq.contactButton')}
            </Link>
            <Link
              href="/forum"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold border border-primary-200 hover:bg-primary-50 transition"
            >
              <MessageCircle className="w-5 h-5" />
              {t('faq.forumButton')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
