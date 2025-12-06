import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationFilterDto,
  NotificationCountDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
  }

  async createBulk(userIds: string[], dto: CreateNotificationDto) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      })),
    });
  }

  async findAll(userId: string, filters: NotificationFilterDto) {
    const { isRead, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unread: await this.prisma.notification.count({
          where: { userId, isRead: false },
        }),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { markedAsRead: result.count };
  }

  async delete(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.delete({ where: { id } });
  }

  async deleteAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }

  async deleteRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    return { deleted: result.count };
  }

  async getCount(userId: string): Promise<NotificationCountDto> {
    const [unreadCount, totalCount] = await Promise.all([
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { unreadCount, totalCount };
  }

  // Helper methods for creating specific notification types
  async notifyInvoiceSent(userId: string, invoiceNumber: string, clientName: string) {
    return this.create(userId, {
      type: 'invoice_sent',
      title: 'Factură trimisă',
      message: `Factura ${invoiceNumber} a fost trimisă către ${clientName}`,
      link: `/invoices?search=${invoiceNumber}`,
    });
  }

  async notifyInvoicePaid(userId: string, invoiceNumber: string, amount: number) {
    return this.create(userId, {
      type: 'invoice_paid',
      title: 'Plată primită',
      message: `Factura ${invoiceNumber} a fost achitată (${amount} RON)`,
      link: `/invoices?search=${invoiceNumber}`,
    });
  }

  async notifyInvoiceOverdue(userId: string, invoiceNumber: string, daysOverdue: number) {
    return this.create(userId, {
      type: 'invoice_overdue',
      title: 'Factură restantă',
      message: `Factura ${invoiceNumber} este restantă de ${daysOverdue} zile`,
      link: `/invoices?search=${invoiceNumber}`,
    });
  }

  async notifyReceiptProcessed(userId: string, vendorName: string, total: number) {
    return this.create(userId, {
      type: 'receipt_processed',
      title: 'Bon procesat',
      message: `Bonul de la ${vendorName} (${total} RON) a fost procesat`,
      link: '/receipts?status=COMPLETED',
    });
  }

  async notifyEfacturaStatus(userId: string, invoiceNumber: string, status: string) {
    const statusMessages: Record<string, string> = {
      UPLOADED: 'a fost încărcată în e-Factura',
      VALIDATED: 'a fost validată de ANAF',
      REJECTED: 'a fost respinsă de ANAF',
      ERROR: 'a întâmpinat o eroare',
    };

    return this.create(userId, {
      type: 'efactura_status',
      title: 'Status e-Factura',
      message: `Factura ${invoiceNumber} ${statusMessages[status] || status}`,
      link: `/invoices?search=${invoiceNumber}`,
    });
  }

  async notifySystemAlert(userId: string, title: string, message: string) {
    return this.create(userId, {
      type: 'system_alert',
      title,
      message,
    });
  }
}
