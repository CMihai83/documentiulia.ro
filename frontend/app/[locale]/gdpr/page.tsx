'use client';

import { useTranslations } from 'next-intl';
import { Shield, Lock, Eye, FileText, UserCheck, Database, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function GDPRPage() {
  const t = useTranslations();

  const rights = [
    {
      icon: Eye,
      title: 'Dreptul de Acces',
      description: 'Ai dreptul să soliciți o copie a datelor personale pe care le deținem despre tine.',
    },
    {
      icon: FileText,
      title: 'Dreptul la Rectificare',
      description: 'Poți solicita corectarea datelor incorecte sau incomplete.',
    },
    {
      icon: AlertTriangle,
      title: 'Dreptul la Ștergere',
      description: 'Poți solicita ștergerea datelor tale în anumite circumstanțe ("dreptul de a fi uitat").',
    },
    {
      icon: Lock,
      title: 'Dreptul la Restricționare',
      description: 'Poți solicita limitarea prelucrării datelor tale în anumite situații.',
    },
    {
      icon: Database,
      title: 'Dreptul la Portabilitate',
      description: 'Poți primi datele tale într-un format structurat, utilizat în mod curent.',
    },
    {
      icon: UserCheck,
      title: 'Dreptul la Opoziție',
      description: 'Te poți opune prelucrării datelor tale în scopuri de marketing direct.',
    },
  ];

  const dataCategories = [
    {
      category: 'Date de Identificare',
      examples: 'Nume, prenume, CUI/CNP, adresă',
      purpose: 'Identificare și comunicare',
      retention: '10 ani (obligație legală)',
    },
    {
      category: 'Date de Contact',
      examples: 'Email, telefon, adresă',
      purpose: 'Comunicare și suport',
      retention: 'Durata contractului + 3 ani',
    },
    {
      category: 'Date Financiare',
      examples: 'Facturi, plăți, conturi bancare',
      purpose: 'Facturare și contabilitate',
      retention: '10 ani (obligație fiscală)',
    },
    {
      category: 'Date de Utilizare',
      examples: 'Loguri acces, activitate platformă',
      purpose: 'Securitate și îmbunătățire servicii',
      retention: '2 ani',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Protecția Datelor GDPR</h1>
          <p className="text-xl opacity-90">
            Angajamentul nostru pentru confidențialitatea și securitatea datelor tale
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Introduction */}
        <section className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Despre GDPR și DocumentIulia</h2>
          <p className="text-gray-600 mb-4">
            DocumentIulia S.R.L. respectă Regulamentul General privind Protecția Datelor (GDPR)
            și legislația română privind protecția datelor cu caracter personal. Ne angajăm să
            protejăm confidențialitatea și securitatea datelor tale personale.
          </p>
          <p className="text-gray-600">
            Această pagină explică drepturile tale, ce date colectăm, cum le folosim și cum le protejăm.
          </p>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Drepturile Tale</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {rights.map((right) => (
              <div key={right.title} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <right.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{right.title}</h3>
                    <p className="text-sm text-gray-600">{right.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data We Collect */}
        <section className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Datele pe Care le Colectăm</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Categorie</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Exemple</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Scop</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Retenție</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataCategories.map((item) => (
                  <tr key={item.category}>
                    <td className="py-3 px-4 font-medium">{item.category}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.examples}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.purpose}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security Measures */}
        <section className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Măsuri de Securitate</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Criptare TLS/SSL pentru toate transmisiile de date</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Criptare AES-256 pentru datele stocate</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Autentificare cu doi factori (2FA) disponibilă</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Backup-uri zilnice cu retenție de 30 de zile</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Centre de date în UE certificate SOC 2 Type II</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Audit de securitate anual de către terți independenți</span>
            </li>
          </ul>
        </section>

        {/* Exercise Your Rights */}
        <section className="bg-primary-50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Exercită-ți Drepturile</h2>
          <p className="text-gray-600 mb-6">
            Pentru a-ți exercita oricare dintre drepturile tale privind protecția datelor,
            ne poți contacta prin următoarele canale:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium">Email DPO</p>
                <a href="mailto:dpo@documentiulia.ro" className="text-primary-600 hover:underline">
                  dpo@documentiulia.ro
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium">Formular Online</p>
                <Link href="/contact" className="text-primary-600 hover:underline">
                  Trimite o Solicitare
                </Link>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            Vom răspunde la solicitarea ta în termen de 30 de zile calendaristice.
          </p>
        </section>

        {/* ANSPDCP */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold mb-4">Autoritatea de Supraveghere</h2>
          <p className="text-gray-600 mb-4">
            Dacă consideri că prelucrarea datelor tale încalcă GDPR, ai dreptul să depui o
            plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium">ANSPDCP</p>
            <p className="text-sm text-gray-600">B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București</p>
            <p className="text-sm text-gray-600">Telefon: +40 318 059 211</p>
            <p className="text-sm text-gray-600">
              Website: <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">www.dataprotection.ro</a>
            </p>
          </div>
        </section>

        {/* Last Updated */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Ultima actualizare: 1 Decembrie 2025
        </p>
      </div>
    </div>
  );
}
