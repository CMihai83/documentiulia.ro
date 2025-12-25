import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto } from './dto/payments.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments with filters' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async findAll(@Request() req: any, @Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(req.user.userId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get payments summary' })
  @ApiResponse({ status: 200, description: 'Payments summary' })
  async getSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.getSummary(
      req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get payment dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats(@Request() req: any) {
    return this.paymentsService.getDashboardStats(req.user.userId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue invoices' })
  @ApiResponse({ status: 200, description: 'List of overdue invoices' })
  async getOverdueInvoices(@Request() req: any) {
    return this.paymentsService.getOverdueInvoices(req.user.userId);
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Get payments for a specific invoice' })
  @ApiResponse({ status: 200, description: 'Payments for invoice' })
  async getPaymentsForInvoice(
    @Request() req: any,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.paymentsService.getPaymentsForInvoice(req.user.userId, invoiceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific payment' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.paymentsService.findOne(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete a payment' })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.paymentsService.remove(req.user.userId, id);
  }
}
