import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppSmsService } from './whatsapp-sms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WhatsAppSmsService', () => {
  let service: WhatsAppSmsService;

  const mockUserId = 'user-123';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        TWILIO_ACCOUNT_SID: 'mock_sid',
        TWILIO_AUTH_TOKEN: 'mock_token',
        TWILIO_PHONE_NUMBER: '+491234567890',
        TWILIO_WHATSAPP_NUMBER: 'whatsapp:+491234567890',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WhatsAppSmsService>(WhatsAppSmsService);
    // Reset rate limits between tests to avoid test pollution
    service.resetRateLimits();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSms', () => {
    it('should send SMS with template', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        templateType: 'DELIVERY_UPDATE',
        variables: {
          recipientName: 'Max Müller',
          trackingNumber: 'JJD123456789',
          estimatedTime: '14:30',
          trackingUrl: 'https://track.example.com/JJD123456789',
        },
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');
      expect(result.to).toBe('+491761234567');
      expect(result.status).toBe('QUEUED');
    });

    it('should send SMS with custom body', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Your package is on its way!',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');
    });

    it('should normalize German phone numbers', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '01761234567', // German format without +49
        channel: 'SMS',
        body: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.to).toBe('+491761234567');
    });

    it('should reject invalid phone numbers', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '123',
        channel: 'SMS',
        body: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_PHONE');
    });

    it('should fail without body or template', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_MESSAGE');
    });

    it('should use German template by default', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        templateType: 'DELIVERY_CONFIRMATION',
        variables: {
          trackingNumber: 'JJD123',
          address: 'Marienplatz 1, München',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should use English template when specified', async () => {
      const result = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        templateType: 'DELIVERY_CONFIRMATION',
        variables: {
          trackingNumber: 'JJD123',
          address: 'Marienplatz 1, Munich',
        },
        language: 'en',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendWhatsApp', () => {
    it('should send WhatsApp with template', async () => {
      const result = await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        templateType: 'DELIVERY_UPDATE',
        variables: {
          recipientName: 'Max Müller',
          trackingNumber: 'JJD123456789',
          estimatedTime: '14:30',
          trackingUrl: 'https://track.example.com/JJD123456789',
        },
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('WHATSAPP');
      expect(result.status).toBe('QUEUED');
    });

    it('should send WhatsApp with free-form message', async () => {
      const result = await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        body: 'Hallo! Ihre Lieferung ist unterwegs.',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('WHATSAPP');
    });

    it('should reject invalid phone numbers', async () => {
      const result = await service.sendWhatsApp(mockUserId, {
        to: 'invalid',
        channel: 'WHATSAPP',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_PHONE');
    });

    it('should handle arrival notification template', async () => {
      const result = await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        templateType: 'ARRIVAL_NOTIFICATION',
        variables: {
          trackingNumber: 'JJD123',
          driverName: 'Thomas',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should handle delivery failed template', async () => {
      const result = await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        templateType: 'DELIVERY_FAILED',
        variables: {
          trackingNumber: 'JJD123',
          failureReason: 'Niemand anwesend',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendDeliveryNotification', () => {
    it('should send delivery notification via WhatsApp', async () => {
      const result = await service.sendDeliveryNotification(
        mockUserId,
        {
          recipientName: 'Max Müller',
          recipientPhone: '+491761234567',
          trackingNumber: 'JJD123456789',
          address: 'Marienplatz 1, 80331 München',
          estimatedTime: '14:30',
          driverName: 'Thomas',
          trackingUrl: 'https://track.example.com/JJD123456789',
        },
        'DELIVERY_UPDATE',
        'WHATSAPP',
        'de',
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('WHATSAPP');
    });

    it('should send delivery notification via SMS', async () => {
      const result = await service.sendDeliveryNotification(
        mockUserId,
        {
          recipientName: 'Max Müller',
          recipientPhone: '+491761234567',
          trackingNumber: 'JJD123456789',
          address: 'Marienplatz 1, 80331 München',
        },
        'DELIVERY_CONFIRMATION',
        'SMS',
        'de',
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');
    });

    it('should use high priority for failed deliveries', async () => {
      const result = await service.sendDeliveryNotification(
        mockUserId,
        {
          recipientName: 'Max Müller',
          recipientPhone: '+491761234567',
          trackingNumber: 'JJD123456789',
          address: 'Marienplatz 1',
          failureReason: 'Niemand anwesend',
        },
        'DELIVERY_FAILED',
        'WHATSAPP',
        'de',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendBulkMessages', () => {
    it('should send bulk SMS messages', async () => {
      const result = await service.sendBulkMessages(mockUserId, {
        recipients: [
          { to: '+491761111111', variables: { recipientName: 'Max' } },
          { to: '+491762222222', variables: { recipientName: 'Anna' } },
          { to: '+491763333333', variables: { recipientName: 'Hans' } },
        ],
        channel: 'SMS',
        templateType: 'DELIVERY_UPDATE',
        language: 'de',
      });

      expect(result.totalSent).toBeGreaterThan(0);
      expect(result.batchId).toBeDefined();
      expect(result.results.length).toBe(3);
    });

    it('should handle bulk WhatsApp messages', async () => {
      const result = await service.sendBulkMessages(mockUserId, {
        recipients: [
          { to: '+491761111111' },
          { to: '+491762222222' },
        ],
        channel: 'WHATSAPP',
        templateType: 'TRACKING_LINK',
        language: 'de',
      });

      expect(result.totalSent + result.totalFailed).toBe(2);
      expect(result.batchId).toBeDefined();
    });

    it('should track failed messages in bulk', async () => {
      const result = await service.sendBulkMessages(mockUserId, {
        recipients: [
          { to: '+491761111111' },
          { to: 'invalid-number' },
        ],
        channel: 'SMS',
        body: 'Test message',
      });

      expect(result.totalFailed).toBe(1);
      expect(result.results.some(r => !r.success)).toBe(true);
    });
  });

  describe('scheduleMessage', () => {
    it('should schedule a message for future delivery', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const result = await service.scheduleMessage(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        templateType: 'DELIVERY_UPDATE',
        variables: {
          recipientName: 'Max',
          trackingNumber: 'JJD123',
          estimatedTime: '15:00',
          trackingUrl: 'https://track.example.com/JJD123',
        },
        scheduleAt: futureDate,
      });

      expect(result.scheduled).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(result.scheduledFor).toEqual(futureDate);
    });

    it('should reject past schedule times', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);

      await expect(
        service.scheduleMessage(mockUserId, {
          to: '+491761234567',
          channel: 'SMS',
          body: 'Test',
          scheduleAt: pastDate,
        }),
      ).rejects.toThrow('Geplante Zeit muss in der Zukunft liegen');
    });
  });

  describe('getMessageHistory', () => {
    beforeEach(async () => {
      // Send some test messages first
      await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Test 1',
      });
      await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        body: 'Test 2',
      });
    });

    it('should return message history', async () => {
      const result = await service.getMessageHistory(mockUserId);

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by channel', async () => {
      const result = await service.getMessageHistory(mockUserId, {
        channel: 'SMS',
      });

      result.messages.forEach(msg => {
        expect(msg.channel).toBe('SMS');
      });
    });

    it('should support pagination', async () => {
      const result = await service.getMessageHistory(mockUserId, {
        limit: 10,
        offset: 0,
      });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('getMessageStats', () => {
    beforeEach(async () => {
      // Send some test messages
      await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Test',
      });
      await service.sendWhatsApp(mockUserId, {
        to: '+491761234567',
        channel: 'WHATSAPP',
        body: 'Test',
      });
    });

    it('should return daily stats', async () => {
      const stats = await service.getMessageStats(mockUserId, 'day');

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalDelivered');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('deliveryRate');
      expect(stats).toHaveProperty('byChannel');
      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('currency');
    });

    it('should return weekly stats', async () => {
      const stats = await service.getMessageStats(mockUserId, 'week');

      expect(stats.byChannel).toHaveProperty('SMS');
      expect(stats.byChannel).toHaveProperty('WHATSAPP');
    });

    it('should return monthly stats', async () => {
      const stats = await service.getMessageStats(mockUserId, 'month');

      expect(typeof stats.deliveryRate).toBe('number');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return German templates by default', () => {
      const templates = service.getAvailableTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      const deliveryUpdate = templates.find(t => t.type === 'DELIVERY_UPDATE');
      expect(deliveryUpdate).toBeDefined();
      expect(deliveryUpdate?.preview).toContain('Guten Tag');
    });

    it('should return English templates when specified', () => {
      const templates = service.getAvailableTemplates('en');

      const deliveryUpdate = templates.find(t => t.type === 'DELIVERY_UPDATE');
      expect(deliveryUpdate).toBeDefined();
      expect(deliveryUpdate?.preview).toContain('Hello');
    });

    it('should include variable names in templates', () => {
      const templates = service.getAvailableTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('preview');
        expect(template).toHaveProperty('variables');
        expect(Array.isArray(template.variables)).toBe(true);
      });
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', () => {
      const status = service.getRateLimitStatus();

      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('limits');

      expect(status.remaining).toHaveProperty('perSecond');
      expect(status.remaining).toHaveProperty('perMinute');
      expect(status.remaining).toHaveProperty('perHour');
      expect(status.remaining).toHaveProperty('perDay');

      expect(status.limits).toHaveProperty('maxPerSecond');
      expect(status.limits).toHaveProperty('maxPerMinute');
      expect(status.limits).toHaveProperty('maxPerHour');
      expect(status.limits).toHaveProperty('maxPerDay');
    });

    it('should decrement counters after sending', async () => {
      const beforeStatus = service.getRateLimitStatus();

      await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Test',
      });

      const afterStatus = service.getRateLimitStatus();

      expect(afterStatus.remaining.perDay).toBeLessThan(beforeStatus.remaining.perDay);
    });
  });

  describe('handleDeliveryStatusWebhook', () => {
    it('should update message status on webhook', async () => {
      // First send a message
      const sendResult = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Test',
      });

      if (sendResult.messageId) {
        // Handle status webhook
        await service.handleDeliveryStatusWebhook(
          sendResult.messageId,
          'delivered',
        );

        // Check history for updated status
        const history = await service.getMessageHistory(mockUserId);
        const message = history.messages.find(
          m => m.providerMessageId === sendResult.messageId,
        );

        if (message) {
          expect(message.status).toBe('DELIVERED');
        }
      }
    });

    it('should handle failed status webhook', async () => {
      const sendResult = await service.sendSms(mockUserId, {
        to: '+491761234567',
        channel: 'SMS',
        body: 'Test',
      });

      if (sendResult.messageId) {
        await service.handleDeliveryStatusWebhook(
          sendResult.messageId,
          'failed',
          '30003',
          'Invalid phone number',
        );

        const history = await service.getMessageHistory(mockUserId);
        const message = history.messages.find(
          m => m.providerMessageId === sendResult.messageId,
        );

        if (message) {
          expect(message.status).toBe('FAILED');
          expect(message.errorCode).toBe('30003');
        }
      }
    });
  });

  describe('Phone number normalization', () => {
    it('should handle various German phone formats', async () => {
      const formats = [
        { input: '01761234567', expected: '+491761234567' },
        { input: '+491761234567', expected: '+491761234567' },
        { input: '491761234567', expected: '+491761234567' },
        { input: '0176 123 4567', expected: '+491761234567' },
        { input: '+49 176 123 4567', expected: '+491761234567' },
      ];

      for (const { input, expected } of formats) {
        const result = await service.sendSms(mockUserId, {
          to: input,
          channel: 'SMS',
          body: 'Test',
        });

        expect(result.to).toBe(expected);
      }
    });
  });
});
