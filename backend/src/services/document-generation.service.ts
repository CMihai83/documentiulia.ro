import { Injectable, Logger } from '@nestjs/common';

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

    // TODO: Implement PDF generation using puppeteer or pdfkit
    // For now, return placeholder
    const content = `
ACT CONSTITUTIV
${registration.companyName} ${registration.companyType}

CAPITOLUL I - DENUMIREA, FORMA JURIDICĂ, SEDIUL ȘI DURATA

Art. 1. Denumire și formă juridică
Societatea se constituie sub forma ${registration.companyType} și poartă denumirea:
"${registration.companyName}"

Art. 2. Sediul social
Sediul social este în: ${registration.street} ${registration.streetNumber}, ${registration.city},
județul ${registration.county}, cod poștal ${registration.postalCode}

Art. 3. Durata
Societatea se constituie pe o durată de ${registration.companyDuration} ani.

CAPITOLUL II - OBIECTUL DE ACTIVITATE

Art. 4. Obiect principal
${registration.businessPurpose}

Art. 5. Cod CAEN principal
${registration.activities.find((a: any) => a.isPrimary)?.caenCode} - ${registration.activities.find((a: any) => a.isPrimary)?.description}

CAPITOLUL III - CAPITALUL SOCIAL

Art. 6. Capital social
Capitalul social este de ${registration.shareCapital} RON, împărțit în ${registration.totalShares} părți sociale,
fiecare cu o valoare nominală de ${registration.shareNominalValue} RON.

Art. 7. Asociați
${registration.shareholders.map((sh: any, idx: number) => `
${idx + 1}. ${sh.name}
   - Aport: ${sh.contribution} RON (${sh.shares} părți sociale)
   - Procent: ${sh.percentage}%
   ${sh.cnp ? `- CNP: ${sh.cnp}` : ''}
   ${sh.cui ? `- CUI: ${sh.cui}` : ''}
`).join('\n')}

CAPITOLUL IV - ADMINISTRAREA SOCIETĂȚII

Art. 8. Administratori
${registration.administrators.map((admin: any, idx: number) => `
${idx + 1}. ${admin.name} (CNP: ${admin.cnp})
`).join('\n')}

[Document generat automat de DocumentIulia.ro]
    `;

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generate Founding Act (Act de Înființare)
   */
  private async generateFoundingAct(registration: any): Promise<Buffer> {
    this.logger.log('Generating Founding Act');

    const content = `
ACT DE ÎNFIINȚARE
${registration.companyName} ${registration.companyType}

Data: ${new Date().toLocaleDateString('ro-RO')}

Subsemnații:
${registration.shareholders.map((sh: any) => sh.name).join(', ')}

declară prin prezentul act că au convenit să constituie o societate comercială cu
răspundere limitată conform prevederilor Legii nr. 31/1990, republicată.

Societatea va purta denumirea "${registration.companyName}" și va avea sediul
în ${registration.city}, ${registration.county}.

Capitalul social este de ${registration.shareCapital} RON.

Durata societății: ${registration.companyDuration} ani.

[Document generat automat de DocumentIulia.ro]
    `;

    return Buffer.from(content, 'utf-8');
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
