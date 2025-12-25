import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceType } from '@prisma/client';
// @ts-ignore
import * as xml2js from 'xml2js';

export interface D394Transaction {
  tip: 'L' | 'A' | 'AI' | 'AC' | 'V' | 'C' | 'N'; // Livrare, Achizitie, etc.
  cuiPartener: string;
  denumirePartener: string;
  tara: string;
  bazaImpozabila: number;
  tvaColectata: number;
  tvaDeductibila: number;
  numarDocumente: number;
}

export interface D394Totals {
  totalBazaLivrari: number;
  totalTVAColectata: number;
  totalBazaAchizitii: number;
  totalTVADeductibila: number;
  diferentaTVA: number; // TVA de plata sau de recuperat
  numarTranzactii: number;
}

export interface D394Submission {
  id: string;
  userId: string;
  period: string;
  fileName: string;
  submittedAt: Date;
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  errorMessage?: string;
  totals: D394Totals;
  xmlContent: string;
}

@Injectable()
export class D394Service {
  private readonly logger = new Logger(D394Service.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate D394 XML for transaction declaration to ANAF
   * Format: ANAF D394 XML schema (Declaratie informativa privind livrarile/prestarile si achizitiile)
   */
  async generateD394Xml(
    userId: string,
    period: string,
    transactions: D394Transaction[],
    companyData: {
      cui: string;
      denumire: string;
      judet: string;
      localitate: string;
      strada: string;
      numar: string;
    },
  ): Promise<string> {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    const [year, month] = period.split('-');
    const totals = this.calculateTotals(transactions);

    // Group transactions by type
    const livrari = transactions.filter(t => ['L', 'V', 'C', 'N'].includes(t.tip));
    const achizitii = transactions.filter(t => ['A', 'AI', 'AC'].includes(t.tip));

    const d394Data = {
      D394: {
        $: {
          xmlns: 'mfp:anaf:dgti:d394:declaratie:v4',
          versiune: '4.0.3',
        },
        ANTET: {
          CUI_PLATITOR: companyData.cui.replace('RO', ''),
          DENUMIRE_PLATITOR: companyData.denumire,
          ADRESA: {
            JUDET: companyData.judet,
            LOCALITATE: companyData.localitate,
            STRADA: companyData.strada,
            NUMAR: companyData.numar,
          },
          AN: year,
          LUNA: month,
          D_REC: 0,
        },
        REZUMAT: {
          TOTAL_BAZA_L: Math.round(totals.totalBazaLivrari * 100) / 100,
          TOTAL_TVA_L: Math.round(totals.totalTVAColectata * 100) / 100,
          TOTAL_BAZA_A: Math.round(totals.totalBazaAchizitii * 100) / 100,
          TOTAL_TVA_A: Math.round(totals.totalTVADeductibila * 100) / 100,
          TVA_PLATA: totals.diferentaTVA > 0 ? Math.round(totals.diferentaTVA * 100) / 100 : 0,
          TVA_RECUPERAT: totals.diferentaTVA < 0 ? Math.round(Math.abs(totals.diferentaTVA) * 100) / 100 : 0,
        },
        LIVRARI: {
          OP: livrari.map((tr, index) => ({
            $: { nr: index + 1 },
            TIP: tr.tip,
            CUI_P: tr.cuiPartener,
            DEN_P: tr.denumirePartener,
            TARA: tr.tara,
            BAZA: tr.bazaImpozabila,
            TVA: tr.tvaColectata,
            NR_DOC: tr.numarDocumente,
          })),
        },
        ACHIZITII: {
          OP: achizitii.map((tr, index) => ({
            $: { nr: index + 1 },
            TIP: tr.tip,
            CUI_P: tr.cuiPartener,
            DEN_P: tr.denumirePartener,
            TARA: tr.tara,
            BAZA: tr.bazaImpozabila,
            TVA: tr.tvaDeductibila,
            NR_DOC: tr.numarDocumente,
          })),
        },
        DECLARATIE: {
          DATA_GENERARE: new Date().toISOString().split('T')[0],
          NUMAR_OPERATIUNI: transactions.length,
        },
      },
    };

    return builder.buildObject(d394Data);
  }

  /**
   * Get transactions for D394 from invoices and documents
   */
  async getTransactionsForD394(
    userId: string,
    period: string,
  ): Promise<D394Transaction[]> {
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get all invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group invoices by partner for D394
    const partnerMap = new Map<string, D394Transaction>();

    for (const invoice of invoices) {
      const cui = invoice.partnerCui || 'UNKNOWN';
      const isSent = invoice.type === InvoiceType.ISSUED;
      const key = `${cui}-${isSent ? 'L' : 'A'}`;

      if (!partnerMap.has(key)) {
        partnerMap.set(key, {
          tip: isSent ? 'L' : 'A',
          cuiPartener: cui,
          denumirePartener: invoice.partnerName || 'Unknown',
          tara: 'RO',
          bazaImpozabila: 0,
          tvaColectata: 0,
          tvaDeductibila: 0,
          numarDocumente: 0,
        });
      }

      const tr = partnerMap.get(key)!;
      tr.bazaImpozabila += Number(invoice.netAmount);

      if (isSent) {
        tr.tvaColectata += Number(invoice.vatAmount);
      } else {
        tr.tvaDeductibila += Number(invoice.vatAmount);
      }

      tr.numarDocumente += 1;
    }

    return Array.from(partnerMap.values()).map(tr => ({
      ...tr,
      bazaImpozabila: Math.round(tr.bazaImpozabila * 100) / 100,
      tvaColectata: Math.round(tr.tvaColectata * 100) / 100,
      tvaDeductibila: Math.round(tr.tvaDeductibila * 100) / 100,
    }));
  }

  /**
   * Calculate D394 totals
   */
  calculateTotals(transactions: D394Transaction[]): D394Totals {
    const totals = transactions.reduce(
      (acc, tr) => {
        if (['L', 'V', 'C', 'N'].includes(tr.tip)) {
          acc.totalBazaLivrari += tr.bazaImpozabila;
          acc.totalTVAColectata += tr.tvaColectata;
        } else {
          acc.totalBazaAchizitii += tr.bazaImpozabila;
          acc.totalTVADeductibila += tr.tvaDeductibila;
        }
        acc.numarTranzactii += 1;
        return acc;
      },
      {
        totalBazaLivrari: 0,
        totalTVAColectata: 0,
        totalBazaAchizitii: 0,
        totalTVADeductibila: 0,
        diferentaTVA: 0,
        numarTranzactii: 0,
      },
    );

    // TVA de plata = TVA colectata - TVA deductibila
    totals.diferentaTVA = totals.totalTVAColectata - totals.totalTVADeductibila;

    return {
      ...totals,
      totalBazaLivrari: Math.round(totals.totalBazaLivrari * 100) / 100,
      totalTVAColectata: Math.round(totals.totalTVAColectata * 100) / 100,
      totalBazaAchizitii: Math.round(totals.totalBazaAchizitii * 100) / 100,
      totalTVADeductibila: Math.round(totals.totalTVADeductibila * 100) / 100,
      diferentaTVA: Math.round(totals.diferentaTVA * 100) / 100,
    };
  }

  /**
   * Submit D394 to ANAF
   */
  async submitToANAF(
    userId: string,
    period: string,
    xmlContent: string,
    totals: D394Totals,
  ): Promise<D394Submission> {
    const submission: D394Submission = {
      id: `D394-${period}-${Date.now()}`,
      userId,
      period,
      fileName: `d394_${period}.xml`,
      submittedAt: new Date(),
      status: 'PENDING',
      totals,
      xmlContent,
    };

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'D394_SUBMISSION',
        entity: 'COMPLIANCE',
        entityId: submission.id,
        details: JSON.parse(JSON.stringify({
          period: submission.period,
          fileName: submission.fileName,
          totals: submission.totals,
          status: submission.status,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(
      `D394 submission created: ${submission.id} for period ${period}`,
    );

    submission.status = 'SUBMITTED';

    return submission;
  }

  /**
   * Get submission history
   */
  async getSubmissionHistory(userId: string): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: 'D394_SUBMISSION',
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });

    return logs.map(log => ({
      id: log.entityId,
      submittedAt: log.createdAt,
      ...(log.details as object || {}),
    }));
  }

  /**
   * Validate D394 data
   */
  validateD394Data(
    transactions: D394Transaction[],
    period: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const [year, month] = period.split('-');

    if (!year || !month || parseInt(month) < 1 || parseInt(month) > 12) {
      errors.push('Perioada invalida (format: YYYY-MM)');
    }

    transactions.forEach((tr, index) => {
      if (!tr.cuiPartener || tr.cuiPartener === 'UNKNOWN') {
        errors.push(`Tranzactie ${index + 1}: CUI partener lipsa`);
      }
      if (!tr.denumirePartener) {
        errors.push(`Tranzactie ${index + 1}: Denumire partener lipsa`);
      }
      if (tr.bazaImpozabila < 0) {
        errors.push(`Tranzactie ${index + 1}: Baza impozabila negativa`);
      }
      if (!['L', 'A', 'AI', 'AC', 'V', 'C', 'N'].includes(tr.tip)) {
        errors.push(`Tranzactie ${index + 1}: Tip operatiune invalid`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get D394 status for a period
   */
  async getStatus(userId: string, period: string): Promise<any> {
    const transactions = await this.getTransactionsForD394(userId, period);
    const totals = this.calculateTotals(transactions);
    const history = await this.getSubmissionHistory(userId);
    const periodSubmission = history.find(h => h.period === period);

    return {
      period,
      transactionCount: transactions.length,
      totals,
      submitted: !!periodSubmission,
      lastSubmission: periodSubmission || null,
      deadline: this.getDeadline(period),
      tvaStatus: totals.diferentaTVA > 0 ? 'DE_PLATA' : 'DE_RECUPERAT',
    };
  }

  private getDeadline(period: string): string {
    // D394 deadline is 25th of the following month
    const [year, month] = period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-25`;
  }
}
