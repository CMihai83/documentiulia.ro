import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          Politica de Confidențialitate
        </h1>
        <p className="text-slate-500 mb-8">
          Ultima actualizare: 1 Decembrie 2025
        </p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              1. Introducere
            </h2>
            <p className="text-slate-600 mb-4">
              DocumentIulia SRL (&quot;noi&quot;, &quot;al nostru&quot; sau &quot;Compania&quot;) respectă
              confidențialitatea datelor dumneavoastră personale. Această Politică de
              Confidențialitate explică modul în care colectăm, folosim, stocăm și protejăm
              informațiile dumneavoastră atunci când utilizați platforma noastră de contabilitate.
            </p>
            <p className="text-slate-600">
              Prin utilizarea serviciilor noastre, sunteți de acord cu practicile descrise
              în această politică, în conformitate cu Regulamentul General privind Protecția
              Datelor (GDPR) și legislația română în vigoare.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              2. Date pe care le colectăm
            </h2>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              2.1 Date furnizate direct
            </h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Nume, prenume și date de contact</li>
              <li>Date de identificare a companiei (CUI, Reg. Com.)</li>
              <li>Adresă de email și număr de telefon</li>
              <li>Date bancare (IBAN, nume bancă)</li>
              <li>Documente contabile (facturi, bonuri, extrase)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2">
              2.2 Date colectate automat
            </h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Adresa IP și locația geografică aproximativă</li>
              <li>Tipul browserului și dispozitivului</li>
              <li>Date de utilizare și preferințe</li>
              <li>Cookie-uri și tehnologii similare</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              3. Cum folosim datele
            </h2>
            <p className="text-slate-600 mb-4">
              Utilizăm datele dumneavoastră pentru:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Furnizarea serviciilor de contabilitate și facturare</li>
              <li>Comunicarea cu ANAF prin SPV pentru e-Factura</li>
              <li>Generarea rapoartelor financiare și fiscale</li>
              <li>Îmbunătățirea platformei și experienței utilizatorului</li>
              <li>Trimiterea notificărilor despre servicii și actualizări</li>
              <li>Respectarea obligațiilor legale și fiscale</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              4. Partajarea datelor
            </h2>
            <p className="text-slate-600 mb-4">
              Nu vindem și nu închiriem datele dumneavoastră terților. Putem partaja
              informații doar în următoarele situații:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Cu ANAF pentru transmiterea e-Facturilor (la cererea dumneavoastră)</li>
              <li>Cu procesatori de plăți pentru tranzacțiile financiare</li>
              <li>Cu furnizori de servicii cloud pentru stocarea datelor (în UE)</li>
              <li>Când este cerut de lege sau autorități competente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              5. Securitatea datelor
            </h2>
            <p className="text-slate-600 mb-4">
              Implementăm măsuri tehnice și organizatorice pentru protejarea datelor:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Criptare TLS/SSL pentru toate conexiunile</li>
              <li>Criptare AES-256 pentru datele stocate</li>
              <li>Autentificare în doi pași (2FA) disponibilă</li>
              <li>Backup zilnic automat</li>
              <li>Audit de securitate periodic</li>
              <li>Acces bazat pe roluri pentru angajați</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              6. Drepturile dumneavoastră
            </h2>
            <p className="text-slate-600 mb-4">
              Conform GDPR, aveți următoarele drepturi:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li><strong>Dreptul de acces</strong> - să solicitați o copie a datelor</li>
              <li><strong>Dreptul la rectificare</strong> - să corectați datele inexacte</li>
              <li><strong>Dreptul la ștergere</strong> - să cereți ștergerea datelor</li>
              <li><strong>Dreptul la portabilitate</strong> - să primiți datele într-un format structurat</li>
              <li><strong>Dreptul de opoziție</strong> - să vă opuneți prelucrării</li>
              <li><strong>Dreptul de retragere a consimțământului</strong></li>
            </ul>
            <p className="text-slate-600 mt-4">
              Pentru exercitarea acestor drepturi, contactați-ne la: privacy@documentiulia.ro
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              7. Retenția datelor
            </h2>
            <p className="text-slate-600">
              Păstrăm datele contabile conform legislației românești (10 ani pentru
              documente financiar-contabile). Datele de cont sunt păstrate pe durata
              utilizării serviciului plus 30 de zile după închiderea contului.
              La cerere, datele pot fi șterse mai devreme, cu excepția celor cerute
              legal să fie păstrate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              8. Cookie-uri
            </h2>
            <p className="text-slate-600">
              Utilizăm cookie-uri esențiale pentru funcționarea platformei și
              cookie-uri analitice pentru îmbunătățirea serviciilor. Puteți gestiona
              preferințele cookie din setările browserului. Cookie-urile esențiale
              nu pot fi dezactivate deoarece sunt necesare pentru autentificare și
              securitate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              9. Modificări ale politicii
            </h2>
            <p className="text-slate-600">
              Ne rezervăm dreptul de a actualiza această politică. Modificările
              semnificative vor fi comunicate prin email sau notificare în platformă
              cu cel puțin 30 de zile înainte de intrarea în vigoare.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              10. Contact
            </h2>
            <p className="text-slate-600 mb-4">
              Pentru întrebări despre această politică sau datele dumneavoastră:
            </p>
            <div className="bg-slate-50 p-6 rounded-xl">
              <p className="text-slate-700 font-medium">DocumentIulia SRL</p>
              <p className="text-slate-600">Responsabil Protecția Datelor</p>
              <p className="text-slate-600">Email: privacy@documentiulia.ro</p>
              <p className="text-slate-600">Telefon: +40 21 123 4567</p>
              <p className="text-slate-600">Adresă: București, România</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>© 2025 DocumentIulia. Toate drepturile rezervate.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/terms" className="hover:text-blue-600">Termeni și Condiții</Link>
            <Link href="/help" className="hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
