'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">DocumentIulia.ro</h3>
            <p className="text-gray-400 text-sm">
              Platformă ERP/contabilitate cu AI pentru afaceri românești. 100% conformitate ANAF.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Platformă</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/features" className="hover:text-white">Funcționalități</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Prețuri</Link></li>
              <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
              <li><Link href="/api-docs" className="hover:text-white">API</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resurse</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              <li><Link href="/courses" className="hover:text-white">Cursuri</Link></li>
              <li><Link href="/forum" className="hover:text-white">Forum</Link></li>
              <li><Link href="/help" className="hover:text-white">Centru Ajutor</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="text-white font-medium">S.C. DOCUMENT&IULIA S.R.L.</li>
              <li><a href="tel:+40754924464" className="hover:text-white">+40 754 924 464</a></li>
              <li><a href="mailto:contact@documentiulia.ro" className="hover:text-white">contact@documentiulia.ro</a></li>
              <li><Link href="/contact" className="hover:text-white">Formular Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/terms" className="hover:text-white">{t('terms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-white">{t('privacy')}</Link></li>
              <li><Link href="/gdpr" className="hover:text-white">GDPR</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">{t('copyright')}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">ANAF Compliant</span>
            <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">GDPR Ready</span>
            <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">SOC 2</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
