import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { CreateD300DeclarationDto } from '../dto/create-d300-declaration.dto';
import { CreateD394DeclarationDto, EuTransactionDto } from '../dto/create-d394-declaration.dto';

/**
 * VAT XML Generator Service
 *
 * Generates XML files for ANAF VAT declarations:
 * - D300 (Monthly VAT Return)
 * - D394 (Quarterly EU Transactions Summary)
 *
 * Format: RO_CIUS UBL 2.1 standard for ANAF SPV submission
 * Validation: DUKIntegrator-compatible
 *
 * References:
 * - Order 1783/2021 (SAF-T standard)
 * - ANAF SPV documentation
 * - Legea 141/2025 (VAT rate changes)
 */
@Injectable()
export class VatXmlGeneratorService {
  private readonly logger = new Logger(VatXmlGeneratorService.name);

  /**
   * Generate D300 XML for ANAF submission
   */
  generateD300Xml(declaration: CreateD300DeclarationDto): string {
    this.logger.log(`Generating D300 XML for CUI ${declaration.cui}, period ${declaration.month}/${declaration.year}`);

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('DeclaratieD300', {
        xmlns: 'mfp:anaf:dgti:d300:declaratie:v1',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      })
      .ele('antet')
      .ele('cif').txt(declaration.cui.replace(/^RO/, '')).up()
      .ele('den').txt(declaration.companyName).up()
      .ele('luna').txt(declaration.month.toString().padStart(2, '0')).up()
      .ele('an').txt(declaration.year.toString()).up()
      .ele('d_rec').txt(new Date().toISOString().split('T')[0]).up() // Data recapitulative
      .up() // Close antet

      // SECTIUNEA A - TVA COLECTAT
      .ele('sectiuneaA')
      .ele('subsectiunea1') // Livrări/prestări impozabile

      // Cota 19%/21%
      .ele('rand')
      .ele('nrRand').txt('A1').up()
      .ele('bazaImpozabila').txt(declaration.outputTaxableBase19.toFixed(2)).up()
      .ele('tva').txt(declaration.outputVat19.toFixed(2)).up()
      .up()

      // Cota 9%/11%
      .ele('rand')
      .ele('nrRand').txt('A2').up()
      .ele('bazaImpozabila').txt(declaration.outputTaxableBase9.toFixed(2)).up()
      .ele('tva').txt(declaration.outputVat9.toFixed(2)).up()
      .up()

      // Cota 5%
      .ele('rand')
      .ele('nrRand').txt('A3').up()
      .ele('bazaImpozabila').txt(declaration.outputTaxableBase5.toFixed(2)).up()
      .ele('tva').txt(declaration.outputVat5.toFixed(2)).up()
      .up()

      .up() // Close subsectiunea1

      .ele('subsectiunea2') // Livrări scutite

      // Scutite cu drept de deducere
      .ele('rand')
      .ele('nrRand').txt('A4').up()
      .ele('valoare').txt(declaration.exemptWithDeduction.toFixed(2)).up()
      .up()

      // Scutite fără drept de deducere
      .ele('rand')
      .ele('nrRand').txt('A5').up()
      .ele('valoare').txt(declaration.exemptWithoutDeduction.toFixed(2)).up()
      .up()

      .up() // Close subsectiunea2

      .ele('subsectiunea3') // Operațiuni speciale

      // Taxare inversă
      .ele('rand')
      .ele('nrRand').txt('A6').up()
      .ele('bazaImpozabila').txt(declaration.reverseChargeBase.toFixed(2)).up()
      .up()

      // Livrări intracomunitare
      .ele('rand')
      .ele('nrRand').txt('A7').up()
      .ele('valoare').txt(declaration.intraCommunityDeliveries.toFixed(2)).up()
      .up()

      // Export
      .ele('rand')
      .ele('nrRand').txt('A8').up()
      .ele('valoare').txt(declaration.exports.toFixed(2)).up()
      .up()

      .up() // Close subsectiunea3
      .up() // Close sectiuneaA

      // SECTIUNEA B - TVA DEDUCTIBIL
      .ele('sectiuneaB')

      // TVA deductibil 19%/21%
      .ele('rand')
      .ele('nrRand').txt('B1').up()
      .ele('tva').txt(declaration.inputVat19.toFixed(2)).up()
      .up()

      // TVA deductibil 9%/11%
      .ele('rand')
      .ele('nrRand').txt('B2').up()
      .ele('tva').txt(declaration.inputVat9.toFixed(2)).up()
      .up()

      // TVA deductibil 5%
      .ele('rand')
      .ele('nrRand').txt('B3').up()
      .ele('tva').txt(declaration.inputVat5.toFixed(2)).up()
      .up()

      // Import
      .ele('rand')
      .ele('nrRand').txt('B4').up()
      .ele('tva').txt(declaration.importVat.toFixed(2)).up()
      .up()

      // Achiziții intracomunitare
      .ele('rand')
      .ele('nrRand').txt('B5').up()
      .ele('bazaImpozabila').txt(declaration.intraCommunityAcquisitionsBase.toFixed(2)).up()
      .ele('tva').txt(declaration.intraCommunityAcquisitionsVat.toFixed(2)).up()
      .up()

      // Taxare inversă
      .ele('rand')
      .ele('nrRand').txt('B6').up()
      .ele('tva').txt(declaration.reverseChargeInputVat.toFixed(2)).up()
      .up()

      .up() // Close sectiuneaB

      // SECTIUNEA C - TVA DE PLATA/RECUPERAT
      .ele('sectiuneaC')
      .ele('totalTvaColectat').txt((declaration.totalOutputVat || 0).toFixed(2)).up()
      .ele('totalTvaDeductibil').txt((declaration.totalInputVat || 0).toFixed(2)).up()
      .ele('tvaDePlata').txt(
        declaration.vatPayable && declaration.vatPayable > 0
          ? declaration.vatPayable.toFixed(2)
          : '0.00',
      ).up()
      .ele('tvaDeRecuperat').txt(
        declaration.vatPayable && declaration.vatPayable < 0
          ? Math.abs(declaration.vatPayable).toFixed(2)
          : '0.00',
      ).up()
      .up() // Close sectiuneaC

      // SECTIUNEA D - Operațiuni intracomunitare (detalii)
      .ele('sectiuneaD');

    // Add intra-community transaction details
    if (declaration.intraCommunityTransactions && declaration.intraCommunityTransactions.length > 0) {
      declaration.intraCommunityTransactions.forEach((transaction, index) => {
        xml
          .ele('tranzactie')
          .ele('nrCrt').txt((index + 1).toString()).up()
          .ele('tipOperatiune').txt(transaction.type).up()
          .ele('bazaImpozabila').txt(transaction.taxableBase.toFixed(2)).up()
          .ele('tva').txt(transaction.vatAmount.toFixed(2)).up();

        if (transaction.invoiceNumber) {
          xml.ele('nrFactura').txt(transaction.invoiceNumber).up();
        }

        if (transaction.invoiceDate) {
          xml.ele('dataFactura').txt(transaction.invoiceDate).up();
        }

        if (transaction.partnerCui) {
          xml.ele('cuiPartener').txt(transaction.partnerCui).up();
        }

        if (transaction.partnerName) {
          xml.ele('denumirePartener').txt(transaction.partnerName).up();
        }

        xml.up(); // Close tranzactie
      });
    }

    xml.up(); // Close sectiuneaD

    // Additional information
    if (declaration.notes) {
      xml.ele('observatii').txt(declaration.notes).up();
    }

    if (declaration.legalRepresentativeName) {
      xml
        .ele('reprezentantLegal')
        .ele('nume').txt(declaration.legalRepresentativeName).up()
        .ele('cnp').txt(declaration.legalRepresentativeCnp || '').up()
        .up();
    }

    const xmlString = xml.end({ prettyPrint: true });

    this.logger.log(`D300 XML generated successfully for CUI ${declaration.cui}`);
    return xmlString;
  }

  /**
   * Generate D394 XML for ANAF submission
   */
  generateD394Xml(declaration: CreateD394DeclarationDto): string {
    this.logger.log(
      `Generating D394 XML for CUI ${declaration.cui}, Q${declaration.quarter}/${declaration.year}`,
    );

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('DeclaratieD394', {
        xmlns: 'mfp:anaf:dgti:d394:declaratie:v1',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      })
      .ele('antet')
      .ele('cif').txt(declaration.cui.replace(/^RO/, '')).up()
      .ele('den').txt(declaration.companyName).up()
      .ele('trimestru').txt(declaration.quarter.toString()).up()
      .ele('an').txt(declaration.year.toString()).up()
      .ele('d_rec').txt(new Date().toISOString().split('T')[0]).up()
      .up() // Close antet

      // SECTIUNEA 1 - Achiziții intracomunitare
      .ele('sectiunea1')
      .ele('totalAchizitii')
      .ele('bazaImpozabila').txt(declaration.totalAcquisitionsBase.toFixed(2)).up()
      .ele('tva').txt(declaration.totalAcquisitionsVat.toFixed(2)).up()
      .up(); // Close totalAchizitii

    // Add acquisition details by country
    if (declaration.acquisitions && declaration.acquisitions.length > 0) {
      const acquisitionsByCountry = this.groupByCountry(declaration.acquisitions);
      Object.entries(acquisitionsByCountry).forEach(([countryCode, transactions]) => {
        const countryTotal = transactions.reduce(
          (sum, t) => ({
            base: sum.base + t.totalValue,
            vat: sum.vat + t.vatAmount,
            count: sum.count + (t.invoiceCount || 1),
          }),
          { base: 0, vat: 0, count: 0 },
        );

        xml
          .ele('achizitiiPeTara')
          .ele('codTara').txt(countryCode).up()
          .ele('bazaImpozabila').txt(countryTotal.base.toFixed(2)).up()
          .ele('tva').txt(countryTotal.vat.toFixed(2)).up()
          .ele('nrFacturi').txt(countryTotal.count.toString()).up()
          .up();
      });
    }

    xml.up(); // Close sectiunea1

    // SECTIUNEA 2 - Livrări intracomunitare
    xml
      .ele('sectiunea2')
      .ele('totalLivrari')
      .ele('valoare').txt(declaration.totalDeliveriesValue.toFixed(2)).up()
      .up(); // Close totalLivrari

    // Add delivery details by country
    if (declaration.deliveries && declaration.deliveries.length > 0) {
      const deliveriesByCountry = this.groupByCountry(declaration.deliveries);
      Object.entries(deliveriesByCountry).forEach(([countryCode, transactions]) => {
        const countryTotal = transactions.reduce(
          (sum, t) => ({
            value: sum.value + t.totalValue,
            count: sum.count + (t.invoiceCount || 1),
          }),
          { value: 0, count: 0 },
        );

        xml
          .ele('livrariPeTara')
          .ele('codTara').txt(countryCode).up()
          .ele('valoare').txt(countryTotal.value.toFixed(2)).up()
          .ele('nrFacturi').txt(countryTotal.count.toString()).up()
          .up();
      });
    }

    xml.up(); // Close sectiunea2

    // SECTIUNEA 3 - Servicii
    xml
      .ele('sectiunea3')
      .ele('serviciiPrestate')
      .ele('valoare').txt(declaration.totalServicesProvidedValue.toFixed(2)).up()
      .up()
      .ele('serviciiPrimite')
      .ele('bazaImpozabila').txt(declaration.totalServicesReceivedBase.toFixed(2)).up()
      .ele('tva').txt(declaration.totalServicesReceivedVat.toFixed(2)).up()
      .up()
      .up(); // Close sectiunea3

    // SECTIUNEA 4 - Operațiuni triunghiulare
    if (
      declaration.triangularSimplification ||
      declaration.triangularDeliveries ||
      declaration.triangularAcquisitions
    ) {
      xml
        .ele('sectiunea4')
        .ele('simplificare').txt((declaration.triangularSimplification || 0).toFixed(2)).up()
        .ele('livrari').txt((declaration.triangularDeliveries || 0).toFixed(2)).up()
        .ele('achizitii').txt((declaration.triangularAcquisitions || 0).toFixed(2)).up()
        .up(); // Close sectiunea4
    }

    // SECTIUNEA 5 - Corecții
    if (
      declaration.acquisitionsCorrectionsBase ||
      declaration.deliveriesCorrectionsValue ||
      declaration.servicesReceivedCorrectionsBase
    ) {
      xml.ele('sectiunea5');

      if (declaration.acquisitionsCorrectionsBase || declaration.acquisitionsCorrectionsVat) {
        xml
          .ele('corectiiAchizitii')
          .ele('bazaImpozabila').txt((declaration.acquisitionsCorrectionsBase || 0).toFixed(2)).up()
          .ele('tva').txt((declaration.acquisitionsCorrectionsVat || 0).toFixed(2)).up()
          .up();
      }

      if (declaration.deliveriesCorrectionsValue) {
        xml
          .ele('corectiiLivrari')
          .ele('valoare').txt(declaration.deliveriesCorrectionsValue.toFixed(2)).up()
          .up();
      }

      if (declaration.servicesReceivedCorrectionsBase || declaration.servicesReceivedCorrectionsVat) {
        xml
          .ele('corectiiServicii')
          .ele('bazaImpozabila').txt((declaration.servicesReceivedCorrectionsBase || 0).toFixed(2)).up()
          .ele('tva').txt((declaration.servicesReceivedCorrectionsVat || 0).toFixed(2)).up()
          .up();
      }

      xml.up(); // Close sectiunea5
    }

    // VIES validation information
    if (declaration.viesValidated) {
      xml
        .ele('validareVIES')
        .ele('validat').txt('DA').up()
        .ele('dataValidare').txt(declaration.viesValidationDate || new Date().toISOString().split('T')[0]).up();

      if (declaration.invalidVatIds && declaration.invalidVatIds.length > 0) {
        xml.ele('codTvaInvalide');
        declaration.invalidVatIds.forEach((vatId) => {
          xml.ele('codTva').txt(vatId).up();
        });
        xml.up(); // Close codTvaInvalide
      }

      xml.up(); // Close validareVIES
    }

    // References to monthly D300 declarations
    if (declaration.monthlyD300Ids && declaration.monthlyD300Ids.length > 0) {
      xml.ele('referinteD300');
      declaration.monthlyD300Ids.forEach((d300Id) => {
        xml.ele('idD300').txt(d300Id).up();
      });
      xml.up(); // Close referinteD300
    }

    // Additional information
    if (declaration.notes) {
      xml.ele('observatii').txt(declaration.notes).up();
    }

    if (declaration.isAmendment) {
      xml
        .ele('rectificativa')
        .ele('estRectificativa').txt('DA').up()
        .ele('nrDeclaratieOriginala').txt(declaration.originalDeclarationNumber || '').up()
        .up();
    }

    if (declaration.legalRepresentativeName) {
      xml
        .ele('reprezentantLegal')
        .ele('nume').txt(declaration.legalRepresentativeName).up()
        .ele('cnp').txt(declaration.legalRepresentativeCnp || '').up()
        .up();
    }

    const xmlString = xml.end({ prettyPrint: true });

    this.logger.log(`D394 XML generated successfully for CUI ${declaration.cui}`);
    return xmlString;
  }

  /**
   * Validate XML against ANAF schema (basic validation)
   */
  validateXml(xml: string, declarationType: 'D300' | 'D394'): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation checks
    if (!xml || xml.trim().length === 0) {
      errors.push('XML is empty');
      return { isValid: false, errors };
    }

    // Check XML structure
    if (!xml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }

    if (declarationType === 'D300' && !xml.includes('DeclaratieD300')) {
      errors.push('Missing D300 root element');
    }

    if (declarationType === 'D394' && !xml.includes('DeclaratieD394')) {
      errors.push('Missing D394 root element');
    }

    // Check required sections
    if (!xml.includes('<antet>')) {
      errors.push('Missing header section');
    }

    if (!xml.includes('<cif>')) {
      errors.push('Missing CIF/CUI');
    }

    // Check size (ANAF limit: 500MB, but warn at 100MB)
    const xmlSizeBytes = Buffer.byteLength(xml, 'utf8');
    const xmlSizeMB = xmlSizeBytes / (1024 * 1024);

    if (xmlSizeMB > 500) {
      errors.push(`XML exceeds ANAF limit of 500MB (current: ${xmlSizeMB.toFixed(2)}MB)`);
    } else if (xmlSizeMB > 100) {
      this.logger.warn(`XML size is large: ${xmlSizeMB.toFixed(2)}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Group EU transactions by country code
   */
  private groupByCountry(transactions: EuTransactionDto[]): Record<string, EuTransactionDto[]> {
    return transactions.reduce((acc, transaction) => {
      const country = transaction.countryCode;
      if (!acc[country]) {
        acc[country] = [];
      }
      acc[country].push(transaction);
      return acc;
    }, {} as Record<string, EuTransactionDto[]>);
  }

  /**
   * Format CUI (remove RO prefix for XML)
   */
  private formatCuiForXml(cui: string): string {
    return cui.replace(/^RO/, '');
  }
}
