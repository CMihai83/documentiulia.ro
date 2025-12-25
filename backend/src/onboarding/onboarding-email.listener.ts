import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface OnboardingCompletedEvent {
  userId: string;
  organizationId: string;
  companyName: string;
  cui: string;
  teamSize: number;
}

interface EmailSendEvent {
  type: 'welcome' | 'team_invitation' | 'onboarding_reminder';
  userId?: string;
  email?: string;
  data: Record<string, unknown>;
}

@Injectable()
export class OnboardingEmailListener {
  private readonly logger = new Logger(OnboardingEmailListener.name);
  private readonly appUrl: string;
  private readonly fromEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get('APP_URL', 'https://documentiulia.ro');
    this.fromEmail = this.configService.get('EMAIL_FROM', 'noreply@documentiulia.ro');
  }

  /**
   * Handle onboarding completed event
   * Sends welcome email and logs the event
   */
  @OnEvent('onboarding.completed')
  async handleOnboardingCompleted(event: OnboardingCompletedEvent): Promise<void> {
    this.logger.log(`Onboarding completed for user ${event.userId}, org ${event.organizationId}`);

    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(`User ${event.userId} not found for welcome email`);
        return;
      }

      // Send welcome email
      await this.sendWelcomeEmail(user.email, user.name || 'User', event.companyName);

      // Log the event
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to handle onboarding completed: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle email send events from other services
   */
  @OnEvent('email.send')
  async handleEmailSend(event: EmailSendEvent): Promise<void> {
    this.logger.log(`Processing email event: ${event.type}`);

    try {
      switch (event.type) {
        case 'welcome':
          if (event.userId) {
            const user = await this.prisma.user.findUnique({
              where: { id: event.userId },
            });
            if (user) {
              await this.sendWelcomeEmail(
                user.email,
                user.name || 'User',
                (event.data.companyName as string) || 'DocumentIulia',
              );
            }
          }
          break;

        case 'team_invitation':
          if (event.email) {
            await this.sendTeamInvitationEmail(
              event.email,
              (event.data.name as string) || 'Team Member',
              (event.data.companyName as string) || 'DocumentIulia',
            );
          }
          break;

        case 'onboarding_reminder':
          if (event.userId) {
            const user = await this.prisma.user.findUnique({
              where: { id: event.userId },
            });
            if (user) {
              await this.sendOnboardingReminderEmail(user.email, user.name || 'User');
            }
          }
          break;

        default:
          this.logger.warn(`Unknown email type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
    }
  }

  /**
   * Send welcome email to new user
   */
  private async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName: string,
  ): Promise<void> {
    const subject = `Bine ați venit la DocumentIulia! 🎉`;
    const html = this.getWelcomeEmailTemplate(userName, companyName);

    await this.sendEmail(email, subject, html);
    this.logger.log(`Welcome email sent to ${email}`);
  }

  /**
   * Send team invitation email
   */
  private async sendTeamInvitationEmail(
    email: string,
    name: string,
    companyName: string,
  ): Promise<void> {
    const subject = `Invitație să vă alăturați ${companyName} pe DocumentIulia`;
    const html = this.getTeamInvitationTemplate(name, companyName);

    await this.sendEmail(email, subject, html);
    this.logger.log(`Team invitation sent to ${email}`);
  }

  /**
   * Send onboarding reminder email
   */
  private async sendOnboardingReminderEmail(email: string, userName: string): Promise<void> {
    const subject = `Finalizați configurarea contului DocumentIulia`;
    const html = this.getOnboardingReminderTemplate(userName);

    await this.sendEmail(email, subject, html);
    this.logger.log(`Onboarding reminder sent to ${email}`);
  }

  /**
   * Send email using configured transport
   * In production, this would use a real email service (SendGrid, AWS SES, etc.)
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // For now, just log the email (in production, integrate with actual email service)
    const emailProvider = this.configService.get('EMAIL_PROVIDER', 'console');

    if (emailProvider === 'console') {
      this.logger.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
      this.logger.debug(`[EMAIL BODY]:\n${html.substring(0, 200)}...`);
      return;
    }

    // TODO: Implement actual email sending based on provider
    // SendGrid, AWS SES, or SMTP
    this.logger.log(`Email queued for ${to}: ${subject}`);
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeEmailTemplate(userName: string, companyName: string): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bine ați venit la DocumentIulia</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .welcome-text { font-size: 18px; color: #1e40af; margin-bottom: 20px; }
    .feature-list { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { display: flex; align-items: center; margin: 15px 0; }
    .feature-icon { width: 40px; height: 40px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; color: white; font-size: 18px; }
    .cta-button { display: inline-block; background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #1e3a8a; }
    .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #64748b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bine ați venit la DocumentIulia!</h1>
    </div>
    <div class="content">
      <p class="welcome-text">Dragă ${userName},</p>
      <p>Felicitări! Contul pentru <strong>${companyName}</strong> a fost creat cu succes pe platforma DocumentIulia.</p>

      <p>Acum aveți acces la toate funcționalitățile platformei:</p>

      <div class="feature-list">
        <div class="feature-item">
          <div class="feature-icon">📄</div>
          <div>
            <strong>Facturare Electronică</strong><br>
            <span style="color: #64748b;">e-Factura conform legislației ANAF</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <div>
            <strong>Raportare SAF-T D406</strong><br>
            <span style="color: #64748b;">Generare automată XML conform Order 1783/2021</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🤖</div>
          <div>
            <strong>AI Document Processing</strong><br>
            <span style="color: #64748b;">OCR inteligent cu 99% acuratețe</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">💼</div>
          <div>
            <strong>Management HR</strong><br>
            <span style="color: #64748b;">Contracte, pontaj și rapoarte salariale</span>
          </div>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${this.appUrl}/dashboard" class="cta-button">Accesează Dashboard-ul</a>
      </p>

      <p>Dacă aveți întrebări, echipa noastră de suport este disponibilă 24/7.</p>

      <p>Cu stimă,<br>Echipa DocumentIulia</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} DocumentIulia. Toate drepturile rezervate.</p>
      <p>Această platformă este conformă cu legislația ANAF și GDPR.</p>
      <div class="social-links">
        <a href="#">LinkedIn</a> |
        <a href="#">Facebook</a> |
        <a href="#">YouTube</a>
      </div>
      <p style="margin-top: 20px; font-size: 12px;">
        <a href="${this.appUrl}/unsubscribe" style="color: #94a3b8;">Dezabonare</a> |
        <a href="${this.appUrl}/privacy" style="color: #94a3b8;">Politica de confidențialitate</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Team invitation email HTML template
   */
  private getTeamInvitationTemplate(name: string, companyName: string): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitație DocumentIulia</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .invite-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .company-name { font-size: 24px; color: #1e40af; font-weight: 700; }
    .cta-button { display: inline-block; background: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Ați fost invitat să vă alăturați echipei</h1>
    </div>
    <div class="content">
      <p>Dragă ${name},</p>

      <div class="invite-box">
        <p style="margin: 0; color: #64748b;">Ați fost invitat să faceți parte din</p>
        <p class="company-name">${companyName}</p>
        <p style="margin: 0; color: #64748b;">pe platforma DocumentIulia</p>
      </div>

      <p>DocumentIulia este platforma AI de contabilitate și ERP care vă ajută să:</p>
      <ul>
        <li>Gestionați facturile și documentele automat</li>
        <li>Raportați conform cerințelor ANAF</li>
        <li>Colaborați eficient cu echipa</li>
      </ul>

      <p style="text-align: center;">
        <a href="${this.appUrl}/invite/accept" class="cta-button">Acceptă Invitația</a>
      </p>

      <p style="color: #94a3b8; font-size: 13px;">Acest link este valabil 7 zile.</p>

      <p>Cu stimă,<br>Echipa DocumentIulia</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} DocumentIulia. Toate drepturile rezervate.</p>
      <p style="font-size: 12px; color: #94a3b8;">
        Dacă nu ați solicitat această invitație, puteți ignora acest email.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Onboarding reminder email HTML template
   */
  private getOnboardingReminderTemplate(userName: string): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finalizați configurarea</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #f59e0b; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 40px 30px; }
    .progress-bar { background: #e2e8f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden; }
    .progress-fill { background: linear-gradient(90deg, #1e40af, #3b82f6); height: 100%; width: 40%; border-radius: 10px; }
    .step-list { margin: 20px 0; }
    .step { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .step-check { width: 24px; height: 24px; border-radius: 50%; margin-right: 15px; display: flex; align-items: center; justify-content: center; }
    .step-done { background: #22c55e; color: white; }
    .step-pending { background: #e2e8f0; color: #94a3b8; }
    .cta-button { display: inline-block; background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Finalizați configurarea contului</h1>
    </div>
    <div class="content">
      <p>Dragă ${userName},</p>
      <p>Mai aveți câțiva pași pentru a finaliza configurarea contului DocumentIulia:</p>

      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <p style="text-align: center; color: #64748b;">40% completat</p>

      <div class="step-list">
        <div class="step">
          <div class="step-check step-done">✓</div>
          <div>
            <strong>Creare cont</strong><br>
            <span style="color: #22c55e;">Completat</span>
          </div>
        </div>
        <div class="step">
          <div class="step-check step-done">✓</div>
          <div>
            <strong>Datele companiei</strong><br>
            <span style="color: #22c55e;">Completat</span>
          </div>
        </div>
        <div class="step">
          <div class="step-check step-pending">3</div>
          <div>
            <strong>Configurare fiscală</strong><br>
            <span style="color: #f59e0b;">În așteptare</span>
          </div>
        </div>
        <div class="step">
          <div class="step-check step-pending">4</div>
          <div>
            <strong>Date bancare</strong><br>
            <span style="color: #94a3b8;">În așteptare</span>
          </div>
        </div>
        <div class="step">
          <div class="step-check step-pending">5</div>
          <div>
            <strong>Invitați echipa</strong><br>
            <span style="color: #94a3b8;">Opțional</span>
          </div>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${this.appUrl}/onboarding" class="cta-button">Continuă Configurarea</a>
      </p>

      <p>Finalizarea configurării vă va permite să accesați toate funcționalitățile platformei.</p>

      <p>Cu stimă,<br>Echipa DocumentIulia</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} DocumentIulia. Toate drepturile rezervate.</p>
      <p style="font-size: 12px;">
        <a href="${this.appUrl}/unsubscribe" style="color: #94a3b8;">Dezabonare de la reminder-uri</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}
