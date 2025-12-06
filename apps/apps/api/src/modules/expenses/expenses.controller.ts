import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExpenseCategory } from '@prisma/client';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Expense created' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
  @ApiQuery({ name: 'isPaid', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expenses returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('category') category?: ExpenseCategory,
    @Query('isPaid') isPaid?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.findAll(companyId, user.id, {
      search,
      category,
      isPaid: isPaid !== undefined ? isPaid === 'true' : undefined,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('unpaid')
  @ApiOperation({ summary: 'Get unpaid expenses' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Unpaid expenses returned' })
  async getUnpaid(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.getUnpaidExpenses(companyId, user.id);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get expenses grouped by category' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expenses by category returned' })
  async getByCategory(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.expensesService.getByCategory(companyId, user.id, year, month);
  }

  @Get('monthly-totals')
  @ApiOperation({ summary: 'Get monthly expense totals' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Monthly totals returned' })
  async getMonthlyTotals(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('year') year?: number,
  ) {
    return this.expensesService.getMonthlyTotals(companyId, user.id, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense returned' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.findOne(companyId, id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.update(companyId, id, dto, user.id);
  }

  @Put(':id/mark-paid')
  @ApiOperation({ summary: 'Mark expense as paid' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense marked as paid' })
  async markAsPaid(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('paidDate') paidDate?: string,
  ) {
    return this.expensesService.markAsPaid(companyId, id, user.id, paidDate ? new Date(paidDate) : undefined);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete expense' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 204, description: 'Expense deleted' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.delete(companyId, id, user.id);
  }
}
