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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkCompanyAccess(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        return membership;
    }
    getDateRange(query) {
        const now = new Date();
        const year = query.year || now.getFullYear();
        const month = query.month;
        let startDate;
        let endDate;
        if (query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate = new Date(query.endDate);
        }
        else if (month) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        }
        else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
        }
        return { startDate, endDate };
    }
    async getDashboardSummary(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const [totalRevenue, totalExpenses, outstandingInvoices, overdueInvoices, recentInvoices, recentExpenses,] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: {
                    companyId,
                    paymentStatus: client_1.PaymentStatus.PAID,
                    issueDate: { gte: startOfMonth, lte: endOfMonth },
                },
                _sum: { total: true },
            }),
            this.prisma.expense.aggregate({
                where: {
                    companyId,
                    expenseDate: { gte: startOfMonth, lte: endOfMonth },
                },
                _sum: { amount: true },
            }),
            this.prisma.invoice.aggregate({
                where: {
                    companyId,
                    paymentStatus: client_1.PaymentStatus.UNPAID,
                    status: { in: [client_1.InvoiceStatus.SENT, client_1.InvoiceStatus.OVERDUE] },
                },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.invoice.aggregate({
                where: {
                    companyId,
                    status: client_1.InvoiceStatus.OVERDUE,
                },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.invoice.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { client: { select: { name: true } } },
            }),
            this.prisma.expense.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);
        const revenueAmount = Number(totalRevenue._sum?.total || 0);
        const expenseAmount = Number(totalExpenses._sum?.amount || 0);
        return {
            revenue: {
                thisMonth: revenueAmount,
            },
            expenses: {
                thisMonth: expenseAmount,
            },
            profit: {
                thisMonth: revenueAmount - expenseAmount,
            },
            outstanding: {
                total: Number(outstandingInvoices._sum?.total || 0),
                count: outstandingInvoices._count,
            },
            overdue: {
                total: Number(overdueInvoices._sum?.total || 0),
                count: overdueInvoices._count,
            },
            recentInvoices,
            recentExpenses,
        };
    }
    async getRevenueReport(companyId, userId, query) {
        await this.checkCompanyAccess(companyId, userId);
        const { startDate, endDate } = this.getDateRange(query);
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: { gte: startDate, lte: endDate },
            },
            include: {
                client: { select: { id: true, name: true } },
            },
            orderBy: { issueDate: 'asc' },
        });
        const monthlyData = new Map();
        invoices.forEach(invoice => {
            const monthKey = `${invoice.issueDate.getFullYear()}-${String(invoice.issueDate.getMonth() + 1).padStart(2, '0')}`;
            const current = monthlyData.get(monthKey) || { invoiced: 0, paid: 0, count: 0 };
            current.invoiced += Number(invoice.total);
            if (invoice.paymentStatus === client_1.PaymentStatus.PAID) {
                current.paid += Number(invoice.total);
            }
            current.count += 1;
            monthlyData.set(monthKey, current);
        });
        const clientRevenue = new Map();
        invoices.forEach(invoice => {
            const current = clientRevenue.get(invoice.clientId) || { name: invoice.client.name, total: 0, count: 0 };
            current.total += Number(invoice.total);
            current.count += 1;
            clientRevenue.set(invoice.clientId, current);
        });
        const totals = await this.prisma.invoice.aggregate({
            where: {
                companyId,
                issueDate: { gte: startDate, lte: endDate },
            },
            _sum: { total: true, subtotal: true, vatAmount: true },
            _count: true,
        });
        return {
            period: { startDate, endDate },
            totals: {
                invoiced: Number(totals._sum?.total || 0),
                subtotal: Number(totals._sum?.subtotal || 0),
                vat: Number(totals._sum?.vatAmount || 0),
                count: totals._count,
            },
            monthly: Array.from(monthlyData.entries()).map(([month, data]) => ({
                month,
                ...data,
            })),
            byClient: Array.from(clientRevenue.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 10),
        };
    }
    async getExpenseReport(companyId, userId, query) {
        await this.checkCompanyAccess(companyId, userId);
        const { startDate, endDate } = this.getDateRange(query);
        const byCategory = await this.prisma.expense.groupBy({
            by: ['category'],
            where: {
                companyId,
                expenseDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true, vatAmount: true },
            _count: true,
        });
        const expenses = await this.prisma.expense.findMany({
            where: {
                companyId,
                expenseDate: { gte: startDate, lte: endDate },
            },
            orderBy: { expenseDate: 'asc' },
        });
        const monthlyData = new Map();
        expenses.forEach(expense => {
            const monthKey = `${expense.expenseDate.getFullYear()}-${String(expense.expenseDate.getMonth() + 1).padStart(2, '0')}`;
            const current = monthlyData.get(monthKey) || { total: 0, count: 0 };
            current.total += Number(expense.amount);
            current.count += 1;
            monthlyData.set(monthKey, current);
        });
        const totals = await this.prisma.expense.aggregate({
            where: {
                companyId,
                expenseDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true, vatAmount: true },
            _count: true,
        });
        const totalAmount = Number(totals._sum?.amount || 0);
        return {
            period: { startDate, endDate },
            totals: {
                total: totalAmount + Number(totals._sum?.vatAmount || 0),
                net: totalAmount,
                vat: Number(totals._sum?.vatAmount || 0),
                count: totals._count,
            },
            byCategory: byCategory.map(c => {
                const catAmount = Number(c._sum?.amount || 0);
                return {
                    category: c.category,
                    total: catAmount + Number(c._sum?.vatAmount || 0),
                    net: catAmount,
                    vat: Number(c._sum?.vatAmount || 0),
                    count: c._count,
                    percentage: totalAmount > 0 ? (catAmount / totalAmount) * 100 : 0,
                };
            }),
            monthly: Array.from(monthlyData.entries()).map(([month, data]) => ({
                month,
                ...data,
            })),
        };
    }
    async getProfitLossReport(companyId, userId, query) {
        await this.checkCompanyAccess(companyId, userId);
        const { startDate, endDate } = this.getDateRange(query);
        const [revenue, expenses] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: {
                    companyId,
                    paymentStatus: client_1.PaymentStatus.PAID,
                    issueDate: { gte: startDate, lte: endDate },
                },
                _sum: { total: true, subtotal: true, vatAmount: true },
            }),
            this.prisma.expense.aggregate({
                where: {
                    companyId,
                    expenseDate: { gte: startDate, lte: endDate },
                },
                _sum: { amount: true, vatAmount: true },
            }),
        ]);
        const grossRevenue = Number(revenue._sum?.subtotal || 0);
        const totalExpenses = Number(expenses._sum?.amount || 0);
        const netProfit = grossRevenue - totalExpenses;
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
        const months = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const [monthRevenue, monthExpenses] = await Promise.all([
                this.prisma.invoice.aggregate({
                    where: {
                        companyId,
                        paymentStatus: client_1.PaymentStatus.PAID,
                        issueDate: { gte: monthStart, lte: monthEnd },
                    },
                    _sum: { subtotal: true },
                }),
                this.prisma.expense.aggregate({
                    where: {
                        companyId,
                        expenseDate: { gte: monthStart, lte: monthEnd },
                    },
                    _sum: { amount: true },
                }),
            ]);
            const monthRev = Number(monthRevenue._sum?.subtotal || 0);
            const monthExp = Number(monthExpenses._sum?.amount || 0);
            months.push({
                month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                revenue: monthRev,
                expenses: monthExp,
                profit: monthRev - monthExp,
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        return {
            period: { startDate, endDate },
            summary: {
                grossRevenue,
                totalExpenses,
                netProfit,
                profitMargin: Math.round(profitMargin * 100) / 100,
                vatCollected: Number(revenue._sum?.vatAmount || 0),
                vatPaid: Number(expenses._sum?.vatAmount || 0),
                vatBalance: Number(revenue._sum?.vatAmount || 0) - Number(expenses._sum?.vatAmount || 0),
            },
            monthly: months,
        };
    }
    async getCashFlowReport(companyId, userId, query) {
        await this.checkCompanyAccess(companyId, userId);
        const { startDate, endDate } = this.getDateRange(query);
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                payments: { some: { paymentDate: { gte: startDate, lte: endDate } } },
            },
            include: { payments: true },
        });
        let totalInflow = 0;
        invoices.forEach(invoice => {
            invoice.payments.forEach(payment => {
                if (payment.paymentDate >= startDate && payment.paymentDate <= endDate) {
                    totalInflow += Number(payment.amount);
                }
            });
        });
        const expensesPaid = await this.prisma.expense.aggregate({
            where: {
                companyId,
                isPaid: true,
                expenseDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true, vatAmount: true },
            _count: true,
        });
        const totalOutflow = Number(expensesPaid._sum?.amount || 0) + Number(expensesPaid._sum?.vatAmount || 0);
        const months = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            let monthInflow = 0;
            invoices.forEach(invoice => {
                invoice.payments.forEach(payment => {
                    if (payment.paymentDate >= monthStart && payment.paymentDate <= monthEnd) {
                        monthInflow += Number(payment.amount);
                    }
                });
            });
            const monthOutflow = await this.prisma.expense.aggregate({
                where: {
                    companyId,
                    isPaid: true,
                    expenseDate: { gte: monthStart, lte: monthEnd },
                },
                _sum: { amount: true, vatAmount: true },
            });
            const outflowAmount = Number(monthOutflow._sum?.amount || 0) + Number(monthOutflow._sum?.vatAmount || 0);
            months.push({
                month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                inflow: monthInflow,
                outflow: outflowAmount,
                net: monthInflow - outflowAmount,
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { companyId },
            select: { id: true, name: true, bankName: true, currency: true, balance: true },
        });
        const totalCash = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        return {
            period: { startDate, endDate },
            summary: {
                totalInflow,
                totalOutflow,
                netCashFlow: totalInflow - totalOutflow,
                currentCash: totalCash,
            },
            bankAccounts,
            monthly: months,
        };
    }
    async getVatReport(companyId, userId, query) {
        await this.checkCompanyAccess(companyId, userId);
        const { startDate, endDate } = this.getDateRange(query);
        const [vatCollected, vatPaid] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: {
                    companyId,
                    issueDate: { gte: startDate, lte: endDate },
                },
                _sum: { vatAmount: true },
            }),
            this.prisma.expense.aggregate({
                where: {
                    companyId,
                    expenseDate: { gte: startDate, lte: endDate },
                },
                _sum: { vatAmount: true },
            }),
        ]);
        const collected = Number(vatCollected._sum?.vatAmount || 0);
        const paid = Number(vatPaid._sum?.vatAmount || 0);
        const balance = collected - paid;
        return {
            period: { startDate, endDate },
            vatCollected: collected,
            vatDeductible: paid,
            vatBalance: balance,
            vatDue: balance > 0 ? balance : 0,
            vatRefund: balance < 0 ? Math.abs(balance) : 0,
        };
    }
    async getClientAgingReport(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const now = new Date();
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                paymentStatus: client_1.PaymentStatus.UNPAID,
                status: { in: [client_1.InvoiceStatus.SENT, client_1.InvoiceStatus.OVERDUE] },
            },
            include: {
                client: { select: { id: true, name: true } },
            },
        });
        const aging = {
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            total: 0,
        };
        const byClient = new Map();
        invoices.forEach(invoice => {
            const dueDate = invoice.dueDate;
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const amount = Number(invoice.total);
            let bucket;
            if (daysOverdue <= 0)
                bucket = 'current';
            else if (daysOverdue <= 30)
                bucket = 'current';
            else if (daysOverdue <= 60)
                bucket = 'days30';
            else if (daysOverdue <= 90)
                bucket = 'days60';
            else
                bucket = 'days90';
            aging[bucket] += amount;
            aging.total += amount;
            const clientData = byClient.get(invoice.clientId) || {
                name: invoice.client.name,
                current: 0,
                days30: 0,
                days60: 0,
                days90: 0,
                total: 0,
            };
            clientData[bucket] += amount;
            clientData.total += amount;
            byClient.set(invoice.clientId, clientData);
        });
        return {
            summary: aging,
            byClient: Array.from(byClient.values()).sort((a, b) => b.total - a.total),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map