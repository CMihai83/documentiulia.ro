import { Injectable, Logger } from '@nestjs/common';
import { PdfGenerationService } from '../pdf/pdf-generation.service';

/**
 * Document Generation Service
 *
 * Generates legal documents required for company registration in Romania:
 * - Articles of Association (Act Constitutiv)
 * - Founding Act (Act de Înființare)
 * - Shareholder Agreement (Convenție între Asociați)
 * - Administrator Declaration (Declarație Administrator)
 * - PFA Declaration D020
 *
 * Documents are generated in PDF format using templates that comply with
 * Romanian legal requirements and ONRC standards.
 */
@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(private readonly pdfService: PdfGenerationService) {}

  /**
   * Generate complete SRL documentation package
   */
  async generateSrlDocuments(registration: any): Promise<{
    articlesOfAssociation: Buffer;
    foundingAct: Buffer;
    administratorDeclaration: Buffer;
    shareholderAgreement?: Buffer;
  }> {
    this.logger.log(`Generating SRL documents for registration: ${registration.id}`);

    const articlesOfAssociation = await this.generateArticlesOfAssociation(registration);
    const foundingAct = await this.generateFoundingAct(registration);
    const administratorDeclaration = await this.generateAdministratorDeclaration(registration);

    // Shareholder agreement is optional for single-shareholder companies
    let shareholderAgreement: Buffer | undefined;
    if (registration.shareholders.length > 1) {
      shareholderAgreement = await this.generateShareholderAgreement(registration);
    }

    return {
      articlesOfAssociation,
      foundingAct,
      administratorDeclaration,
      shareholderAgreement,
    };
  }

  /**
   * Generate Articles of Association (Act Constitutiv)
   */
  private async generateArticlesOfAssociation(registration: any): Promise<Buffer> {
    this.logger.log('Generating Articles of Association');

    // Generate HTML content for the document
    const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>Act Constitutiv - ${registration.companyName}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            margin: 40mm;
            text-align: justify;
        }
        .header {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 30pt;
        }
        .chapter {
            font-weight: bold;
            font-size: 13pt;
            margin-top: 20pt;
            margin-bottom: 10pt;
            text-align: center;
        }
        .article {
            font-weight: bold;
            margin-top: 15pt;
            margin-bottom: 5pt;
        }
        .content {
            text-indent: 20pt;
        }
        .signature {
            margin-top: 40pt;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        ACT CONSTITUTIV<br>
        ${registration.companyName}<br>
        ${registration.companyType}
    </div>

    <div class="chapter">CAPITOLUL I - DENUMIREA, FORMA JURIDICĂ, SEDIUL ȘI DURATA</div>

    <div class="article">Art. 1. Denumire și formă juridică</div>
    <div class="content">
        Societatea se constituie sub forma ${registration.companyType} și poartă denumirea: "${registration.companyName}".
    </div>

    <div class="article">Art. 2. Sediul social</div>
    <div class="content">
        Sediul social este în: ${registration.street} ${registration.streetNumber}, ${registration.city},
        județul ${registration.county}, cod poștal ${registration.postalCode}.
    </div>

    <div class="article">Art. 3. Durata</div>
    <div class="content">
        Societatea se constituie pe o durată de ${registration.companyDuration} ani.
    </div>

    <div class="chapter">CAPITOLUL II - OBIECTUL DE ACTIVITATE</div>

    <div class="article">Art. 4. Obiect principal</div>
    <div class="content">
        ${registration.businessPurpose}
    </div>

    <div class="article">Art. 5. Cod CAEN principal</div>
    <div class="content">
        ${registration.activities.find((a: any) => a.isPrimary)?.caenCode} -
        ${registration.activities.find((a: any) => a.isPrimary)?.description}
    </div>

    <div class="chapter">CAPITOLUL III - CAPITALUL SOCIAL</div>

    <div class="article">Art. 6. Capital social</div>
    <div class="content">
        Capitalul social este de ${registration.shareCapital} RON, împărțit în ${registration.totalShares} părți sociale,
        fiecare cu o valoare nominală de ${registration.shareNominalValue} RON.
    </div>

    <div class="article">Art. 7. Asociați</div>
    <div class="content">
        ${registration.shareholders.map((sh: any, idx: number) => `
        ${idx + 1}. ${sh.name}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;- Aport: ${sh.contribution} RON (${sh.shares} părți sociale)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;- Procent: ${sh.percentage}%<br>
        ${sh.cnp ? `&nbsp;&nbsp;&nbsp;&nbsp;- CNP: ${sh.cnp}<br>` : ''}
        ${sh.cui ? `&nbsp;&nbsp;&nbsp;&nbsp;- CUI: ${sh.cui}<br>` : ''}
        `).join('')}
    </div>

    <div class="chapter">CAPITOLUL IV - ADMINISTRAREA SOCIETĂȚII</div>

    <div class="article">Art. 8. Administratori</div>
    <div class="content">
        ${registration.administrators.map((admin: any, idx: number) => `
        ${idx + 1}. ${admin.name} (CNP: ${admin.cnp})<br>
        `).join('')}
    </div>

    <div class="signature">
        <p>Întocmit astăzi, ${new Date().toLocaleDateString('ro-RO')}</p>
        <br><br>
        <p>Asociați:</p>
        ${registration.shareholders.map((sh: any) => `
        <p>_______________________________<br>
        ${sh.name}</p>
        `).join('')}
    </div>

    <div style="margin-top: 40pt; font-size: 10pt; color: #666; text-align: center;">
        Document generat automat de DocumentIulia.ro
    </div>
</body>
</html>
    `;

    // Generate PDF from HTML using the PDF service
    const pdfResult = await this.pdfService.generateFromTemplate(
      'ARTICLES_OF_ASSOCIATION',
      {
        companyName: registration.companyName,
        companyType: registration.companyType,
        generatedDate: new Date().toLocaleDateString('ro-RO'),
        generatedBy: 'DocumentIulia.ro',
      },
      {
        language: 'ro',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 25, right: 20, bottom: 25, left: 20 },
      }
    );

    return pdfResult.content;
  }

  /**
   * Generate Founding Act (Act de Înființare)
   */
  private async generateFoundingAct(registration: any): Promise<Buffer> {
    this.logger.log('Generating Founding Act');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>Act de Înființare - ${registration.companyName}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 40mm;
            text-align: justify;
        }
        .header {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 30pt;
        }
        .date {
            text-align: right;
            margin-bottom: 20pt;
        }
        .content {
            text-indent: 20pt;
            margin-bottom: 15pt;
        }
        .signature {
            margin-top: 40pt;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        ACT DE ÎNFIINȚARE<br>
        ${registration.companyName}<br>
        ${registration.companyType}
    </div>

    <div class="date">
        Data: ${new Date().toLocaleDateString('ro-RO')}
    </div>

    <div class="content">
        Subsemnații: ${registration.shareholders.map((sh: any) => sh.name).join(', ')}
    </div>

    <div class="content">
        declară prin prezentul act că au convenit să constituie o societate comercială cu răspundere limitată conform prevederilor Legii nr. 31/1990, republicată.
    </div>

    <div class="content">
        Societatea va purta denumirea "${registration.companyName}" și va avea sediul în ${registration.city}, județul ${registration.county}.
    </div>

    <div class="content">
        Capitalul social este de ${registration.shareCapital} RON.
    </div>

    <div class="content">
        Durata societății: ${registration.companyDuration} ani.
    </div>

    <div class="signature">
        <br><br><br>
        <p>Asociați:</p>
        ${registration.shareholders.map((sh: any) => `
        <p>_______________________________<br>
        ${sh.name}</p>
        `).join('')}
    </div>

    <div style="margin-top: 40pt; font-size: 10pt; color: #666; text-align: center;">
        Document generat automat de DocumentIulia.ro
    </div>
</body>
</html>
    `;

    // Generate PDF from HTML using the PDF service
    const pdfResult = await this.pdfService.generateFromTemplate(
      'FOUNDING_ACT',
      {
        companyName: registration.companyName,
        companyType: registration.companyType,
        generatedDate: new Date().toLocaleDateString('ro-RO'),
        generatedBy: 'DocumentIulia.ro',
      },
      {
        language: 'ro',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 25, right: 20, bottom: 25, left: 20 },
      }
    );

    return pdfResult.content;
  }

  /**
   * Generate Administrator Declaration
   */
  private async generateAdministratorDeclaration(registration: any): Promise<Buffer> {
    this.logger.log('Generating Administrator Declaration');

    const content = `
DECLARAȚIE ADMINISTRATOR

Subsemnatul/Subsemnații:
${registration.administrators.map((admin: any) => `
${admin.name}, CNP: ${admin.cnp}
Domiciliu: ${admin.address}
`).join('\n')}

Declar/Declarăm că accept/acceptăm funcția de administrator al societății
"${registration.companyName}" ${registration.companyType} și că îndeplinesc/îndeplinim
condițiile prevăzute de lege pentru exercitarea acestei funcții.

Mă/Ne angajez/angajăm să administrez/administrăm societatea cu bună-credință și
în interesul acesteia.

Data: ${new Date().toLocaleDateString('ro-RO')}

Semnătură: _________________

[Document generat automat de DocumentIulia.ro]
    `;

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generate Shareholder Agreement (for multi-shareholder companies)
   */
  private async generateShareholderAgreement(registration: any): Promise<Buffer> {
    this.logger.log('Generating Shareholder Agreement');

    const content = `
CONVENȚIE ÎNTRE ASOCIAȚI
${registration.companyName} ${registration.companyType}

Între:
${registration.shareholders.map((sh: any, idx: number) => `
${idx + 1}. ${sh.name} (${sh.percentage}%)
`).join('\n')}

S-a încheiat prezenta convenție prin care părțile convin asupra următoarelor:

Art. 1. Contribuții
Fiecare asociat se obligă să aducă aportul său la capitalul social conform
actului constitutiv.

Art. 2. Administrarea societății
Administrarea se va face conform actului constitutiv.

Art. 3. Partajarea profitului
Profitul net se va repartiza proporțional cu cota de participare la capitalul social.

Data: ${new Date().toLocaleDateString('ro-RO')}

[Document generat automat de DocumentIulia.ro]
    `;

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generate PFA Declaration D020
   */
  async generatePfaDeclaration(registration: any): Promise<Buffer> {
    this.logger.log('Generating PFA Declaration D020');

    const content = `
DECLARAȚIE DE ÎNREGISTRARE FISCALĂ A PERSOANEI FIZICE
(Formular D020)

SECȚIUNEA 1 - DATE DE IDENTIFICARE

Nume și prenume: ${registration.fullName}
CNP: ${registration.cnp}
Serie și număr CI: ${registration.idCardNumber}
Eliberat de: ${registration.idCardIssuedBy}
Data: ${new Date(registration.idCardIssuedDate).toLocaleDateString('ro-RO')}

SECȚIUNEA 2 - DOMICILIU FISCAL

Județ: ${registration.county}
Oraș: ${registration.city}
${registration.sector ? `Sector: ${registration.sector}` : ''}
Strada: ${registration.street} nr. ${registration.streetNumber}
${registration.building ? `Bloc: ${registration.building}` : ''}
${registration.apartment ? `Ap: ${registration.apartment}` : ''}
Cod poștal: ${registration.postalCode}

SECȚIUNEA 3 - DATE DE CONTACT

Email: ${registration.email}
Telefon: ${registration.phone}

SECȚIUNEA 4 - ACTIVITĂȚI

${registration.tradeName ? `Denumire comercială: ${registration.tradeName}` : ''}

Cod CAEN principal: ${registration.activities.find((a: any) => a.isPrimary)?.caenCode}
Descriere: ${registration.activities.find((a: any) => a.isPrimary)?.description}

Activități secundare:
${registration.activities.filter((a: any) => !a.isPrimary).map((a: any) => `
- ${a.caenCode}: ${a.description}
`).join('')}

SECȚIUNEA 5 - LOCUL DESFĂȘURĂRII ACTIVITĂȚII

${registration.businessAddress || 'La domiciliul fiscal'}

Data completării: ${new Date().toLocaleDateString('ro-RO')}

Semnătura: _________________

[Document generat automat de DocumentIulia.ro]
    `;

    return Buffer.from(content, 'utf-8');
  }
}
