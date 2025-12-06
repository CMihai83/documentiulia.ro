"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let NotificationsService = class NotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
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
    async createBulk(userIds, dto) {
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
    async findAll(userId, filters) {
        const { isRead, type, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { userId };
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
    async findOne(userId, id) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return notification;
    }
    async markAsRead(userId, id) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }
    async markAllAsRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return { markedAsRead: result.count };
    }
    async delete(userId, id) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.notification.delete({ where: { id } });
    }
    async deleteAll(userId) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId },
        });
        return { deleted: result.count };
    }
    async deleteRead(userId) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId, isRead: true },
        });
        return { deleted: result.count };
    }
    async getCount(userId) {
        const [unreadCount, totalCount] = await Promise.all([
            this.prisma.notification.count({ where: { userId, isRead: false } }),
            this.prisma.notification.count({ where: { userId } }),
        ]);
        return { unreadCount, totalCount };
    }
    async notifyInvoiceSent(userId, invoiceNumber, clientName) {
        return this.create(userId, {
            type: 'invoice_sent',
            title: 'Factură trimisă',
            message: `Factura ${invoiceNumber} a fost trimisă către ${clientName}`,
            link: `/invoices?search=${invoiceNumber}`,
        });
    }
    async notifyInvoicePaid(userId, invoiceNumber, amount) {
        return this.create(userId, {
            type: 'invoice_paid',
            title: 'Plată primită',
            message: `Factura ${invoiceNumber} a fost achitată (${amount} RON)`,
            link: `/invoices?search=${invoiceNumber}`,
        });
    }
    async notifyInvoiceOverdue(userId, invoiceNumber, daysOverdue) {
        return this.create(userId, {
            type: 'invoice_overdue',
            title: 'Factură restantă',
            message: `Factura ${invoiceNumber} este restantă de ${daysOverdue} zile`,
            link: `/invoices?search=${invoiceNumber}`,
        });
    }
    async notifyReceiptProcessed(userId, vendorName, total) {
        return this.create(userId, {
            type: 'receipt_processed',
            title: 'Bon procesat',
            message: `Bonul de la ${vendorName} (${total} RON) a fost procesat`,
            link: '/receipts?status=COMPLETED',
        });
    }
    async notifyEfacturaStatus(userId, invoiceNumber, status) {
        const statusMessages = {
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
    async notifySystemAlert(userId, title, message) {
        return this.create(userId, {
            type: 'system_alert',
            title,
            message,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map