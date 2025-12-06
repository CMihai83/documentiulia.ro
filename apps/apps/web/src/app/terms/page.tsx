import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Termeni și Condiții
        </h1>
        <p className="text-slate-500 mb-8">
          Ultima actualizare: 1 Decembrie 2025
        </p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              1. Acceptarea termenilor
            </h2>
            <p className="text-slate-600 mb-4">
              Prin accesarea și utilizarea platformei DocumentIulia (&quot;Serviciul&quot;),
              acceptați să fiți legat de acești Termeni și Condiții. Dacă nu sunteți
              de acord cu oricare dintre acești termeni, vă rugăm să nu utilizați Serviciul.
            </p>
            <p className="text-slate-600">
              DocumentIulia SRL (&quot;Compania&quot;, &quot;noi&quot;) își rezervă dreptul de a
              modifica acești termeni în orice moment. Continuarea utilizării Serviciului
              după modificări constituie acceptarea noilor termeni.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              2. Descrierea serviciului
            </h2>
            <p className="text-slate-600 mb-4">
              DocumentIulia este o platformă de contabilitate online care oferă:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Gestionarea facturilor și cheltuielilor</li>
              <li>Integrare cu sistemul e-Factura ANAF</li>
              <li>Generarea rapoartelor financiare și SAF-T</li>
              <li>Calcul automat TVA</li>
              <li>Import bancar și OCR documente</li>
              <li>Cursuri și resurse educaționale</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              3. Înregistrarea contului
            </h2>
            <p className="text-slate-600 mb-4">
              Pentru a utiliza Serviciul, trebuie să:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Furnizați informații corecte și complete la înregistrare</li>
              <li>Mențineți securitatea contului și parolei</li>
              <li>Notificați imediat orice utilizare neautorizată</li>
              <li>Aveți cel puțin 18 ani sau vârsta legală în jurisdicția dumneavoastră</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Sunteți responsabil pentru toate activitățile desfășurate în contul dumneavoastră.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              4. Planuri și plăți
            </h2>
            <h3 className="text-lg font-medium text-slate-800 mb-2">4.1 Planuri de abonament</h3>
            <p className="text-slate-600 mb-4">
              Oferim planuri Gratuit, Professional și Business. Funcționalitățile și
              limitările fiecărui plan sunt descrise pe pagina de prețuri.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mb-2">4.2 Facturare</h3>
            <p className="text-slate-600 mb-4">
              Abonamentele plătite sunt facturate lunar sau anual, în avans.
              Prețurile sunt exprimate în RON și includ TVA unde este aplicabil.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mb-2">4.3 Rambursări</h3>
            <p className="text-slate-600">
              Oferim garanție de returnare a banilor în primele 14 zile pentru
              abonamentele noi. După această perioadă, plățile nu sunt rambursabile.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              5. Utilizare acceptabilă
            </h2>
            <p className="text-slate-600 mb-4">
              Vă angajați să NU utilizați Serviciul pentru:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Activități ilegale sau frauduloase</li>
              <li>Încărcarea de conținut malițios sau viruși</li>
              <li>Încercarea de a accesa neautorizat sistemele noastre</li>
              <li>Hărțuirea altor utilizatori</li>
              <li>Încălcarea drepturilor de proprietate intelectuală</li>
              <li>Generarea de informații financiare false</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              6. Proprietate intelectuală
            </h2>
            <p className="text-slate-600 mb-4">
              Serviciul, inclusiv software-ul, designul, logo-urile și conținutul
              sunt proprietatea DocumentIulia SRL și sunt protejate de legile
              drepturilor de autor.
            </p>
            <p className="text-slate-600">
              Datele pe care le încărcați rămân proprietatea dumneavoastră.
              Ne acordați o licență limitată pentru a procesa aceste date
              în scopul furnizării Serviciului.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              7. Integrare ANAF / e-Factura
            </h2>
            <p className="text-slate-600 mb-4">
              Prin utilizarea funcției e-Factura:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Sunteți responsabil pentru corectitudinea datelor transmise</li>
              <li>Certificatul digital utilizat trebuie să fie valid și autorizat</li>
              <li>Nu garantăm disponibilitatea continuă a serviciilor ANAF</li>
              <li>Respectați toate reglementările fiscale în vigoare</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              8. Limitarea răspunderii
            </h2>
            <p className="text-slate-600 mb-4">
              În măsura permisă de lege:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Serviciul este furnizat &quot;ca atare&quot; fără garanții</li>
              <li>Nu suntem responsabili pentru pierderi indirecte sau consecvente</li>
              <li>Răspunderea noastră maximă este limitată la suma plătită în ultimele 12 luni</li>
              <li>Nu garantăm că Serviciul va fi neîntrerupt sau fără erori</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Vă recomandăm să consultați un contabil sau consilier fiscal profesionist
              pentru decizii financiare importante.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              9. Suspendare și reziliere
            </h2>
            <p className="text-slate-600 mb-4">
              Ne rezervăm dreptul de a suspenda sau rezilia contul dumneavoastră dacă:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Încălcați acești Termeni și Condiții</li>
              <li>Există activități suspecte sau frauduloase</li>
              <li>Nu efectuați plățile la timp (pentru planuri plătite)</li>
            </ul>
            <p className="text-slate-600 mt-4">
              Puteți anula contul oricând din setări. După anulare, datele vor fi
              păstrate 30 de zile pentru recuperare, apoi vor fi șterse permanent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              10. Legea aplicabilă
            </h2>
            <p className="text-slate-600">
              Acești termeni sunt guvernați de legile României. Orice dispută va fi
              soluționată de instanțele competente din București, România.
              Pentru consumatori din UE, se aplică și legislația de protecție a
              consumatorilor din țara de reședință.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              11. Contact
            </h2>
            <p className="text-slate-600 mb-4">
              Pentru întrebări despre acești termeni:
            </p>
            <div className="bg-slate-50 p-6 rounded-xl">
              <p className="text-slate-700 font-medium">DocumentIulia SRL</p>
              <p className="text-slate-600">Email: legal@documentiulia.ro</p>
              <p className="text-slate-600">Telefon: +40 21 123 4567</p>
              <p className="text-slate-600">Adresă: București, România</p>
              <p className="text-slate-600 mt-2">CUI: RO12345678</p>
              <p className="text-slate-600">Reg. Com.: J40/1234/2020</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>© 2025 DocumentIulia. Toate drepturile rezervate.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-blue-600">Confidențialitate</Link>
            <Link href="/help" className="hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
