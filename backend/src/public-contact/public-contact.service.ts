import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
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
