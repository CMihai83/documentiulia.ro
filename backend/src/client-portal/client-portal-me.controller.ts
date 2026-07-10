import { Controller, Get, NotFoundException, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REQ-040 — honest "me" resolution for the client portal.
 * A portal "client" is a real Partner record of the tenant whose email matches
 * the logged-in user. No mock-store lookup, no fabricated fallback: absent
 * record => 404 with a clear message.
 */
@Controller('client-portal/me')
@UseGuards(JwtAuthGuard)
export class ClientPortalMeController {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePartner(req: any) {
    const email: string | undefined = req.user?.email;
    if (!email) throw new NotFoundException('Niciun profil de client asociat contului dvs.');
    const partner = await this.prisma.partner.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, anonymizedAt: null },
    });
    if (!partner) {
      throw new NotFoundException('Niciun profil de client asociat contului dvs. / No client profile linked to your account.');
    }
    return partner;
  }

  @Get('profile')
  async profile(@Request() req: any) {
    const p = await this.resolvePartner(req);
    return {
      id: p.id,
      name: p.name,
      cui: p.cui,
      email: p.email,
      phone: p.phone,
      address: p.address,
      city: p.city,
      county: p.county,
    };
  }

  @Get('dashboard')
  async dashboard(@Request() req: any) {
    const p = await this.resolvePartner(req);
    const invoices = await this.prisma.invoice.findMany({
      where: { OR: [{ partnerName: p.name }, ...(p.cui ? [{ partnerCui: p.cui }] : [])] },
      orderBy: { invoiceDate: 'desc' },
      take: 20,
      select: { id: true, invoiceNumber: true, invoiceDate: true, grossAmount: true, paymentStatus: true, type: true },
    });
    const outstanding = invoices
      .filter((i) => i.paymentStatus !== 'PAID')
      .reduce((s, i) => s + Number(i.grossAmount || 0), 0);
    return {
      client: { id: p.id, name: p.name, cui: p.cui },
      invoices,
      totals: {
        invoiceCount: invoices.length,
        outstandingRon: Math.round(outstanding * 100) / 100,
      },
    };
  }

  @Get('documents')
  async documents(@Request() req: any) {
    const p = await this.resolvePartner(req);
    // Honest scope: only invoice documents attributable to this partner exist today.
    const invoices = await this.prisma.invoice.findMany({
      where: { OR: [{ partnerName: p.name }, ...(p.cui ? [{ partnerCui: p.cui }] : [])] },
      orderBy: { invoiceDate: 'desc' },
      take: 50,
      select: { id: true, invoiceNumber: true, invoiceDate: true, type: true, grossAmount: true },
    });
    return invoices.map((i) => ({
      id: i.id,
      name: `Factura ${i.invoiceNumber}`,
      kind: 'invoice',
      date: i.invoiceDate,
      amountRon: Number(i.grossAmount || 0),
    }));
  }
}
