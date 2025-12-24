'use client';

import { useRouter } from 'next/navigation';
import { Construction, ArrowLeft } from 'lucide-react';

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-8 h-8 text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Filtrare export
        </h1>
        
        <p className="text-gray-600 mb-6">
          Această funcționalitate este în curs de dezvoltare și va fi disponibilă în curând.
        </p>
        
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi
        </button>
      </div>
    </div>
  );
}
