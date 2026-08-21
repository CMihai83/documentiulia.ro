import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupportService } from '../support/support.service';
import { v4 as uuidv4 } from 'uuid';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
}

@Injectable()
export class PublicContactService {
  private readonly logger = new Logger(PublicContactService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private support: SupportService,
  ) {}

  async processContactForm(data: ContactFormData): Promise<{ referenceId: string }> {
    const referenceId = `CONTACT-${Date.now()}-${uuidv4().slice(0, 8)}`;

    try {
      // Store contact submission in database
      await this.prisma.contactSubmission.create({
        data: {
          referenceId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          subject: data.subject,
          message: data.message,
          status: 'NEW',
          createdAt: new Date(),
        },
      });

      this.logger.log(`Contact form saved: ${referenceId}`);

      // REQ-049: the submission also becomes a ticket in the staff inbox, so
      // it is operated like any other client request instead of sitting in a
      // table nobody reads.
      try {
        await this.support.createForGuest({
          name: data.name, email: data.email, company: data.company,
          subject: data.subject, body: data.message,
        });
      } catch (e) {
        this.logger.warn(`Ticket creation from contact form failed: ${(e as Error).message}`);
      }

      // In production, would send email notification here
      // For now, just log it
      this.logger.log(`Contact form from ${data.name} <${data.email}>: ${data.subject}`);

    } catch (error) {
      // If DB fails, still return success to user (fail gracefully)
      this.logger.error(`Failed to save contact form: ${error.message}`);
    }

    return { referenceId };
  }
}
