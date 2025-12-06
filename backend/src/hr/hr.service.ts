import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(userId: string, data: any) {
    return this.prisma.employee.create({
      data: { userId, ...data },
    });
  }

  async getEmployees(userId: string) {
    return this.prisma.employee.findMany({
      where: { userId },
      include: { payrolls: { take: 3, orderBy: { period: 'desc' } } },
    });
  }

  async generatePayroll(employeeId: string, period: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new Error('Employee not found');

    const grossSalary = Number(employee.salary);
    // Romanian tax calculations (simplified)
    const cas = grossSalary * 0.25; // Social security 25%
    const cass = grossSalary * 0.10; // Health insurance 10%
    const incomeTax = (grossSalary - cas - cass) * 0.10; // Income tax 10%
    const totalTaxes = cas + cass + incomeTax;
    const netSalary = grossSalary - totalTaxes;

    return this.prisma.payroll.create({
      data: {
        employeeId,
        period,
        grossSalary,
        netSalary,
        taxes: incomeTax,
        contributions: cas + cass,
        status: 'PENDING',
      },
    });
  }

  async getPayrollHistory(userId: string, period?: string) {
    return this.prisma.payroll.findMany({
      where: {
        employee: { userId },
        ...(period && { period }),
      },
      include: { employee: true },
      orderBy: { period: 'desc' },
    });
  }
}
