import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegesOnlineService, RegesContractOperation } from './reges-online.service';

/** REGES-Online (Inspecția Muncii employee registry) endpoints — REQ-047. */
@ApiTags('REGES-Online')
@Controller('hr-contracts/reges')
@UseGuards(JwtAuthGuard)
export class RegesOnlineController {
  constructor(private readonly reges: RegesOnlineService) {}

  @Get('status')
  @ApiOperation({ summary: 'REGES-Online configuration status' })
  status() {
    return this.reges.status();
  }

  @Get('deadline-alerts')
  @ApiOperation({ summary: 'Contracts due/overdue for REGES transmission (day-before-start rule, HG 295/2025)' })
  deadlineAlerts(@Request() req: any) {
    return this.reges.deadlineAlerts(req.user.id);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Register an employee (Salariat) in REGES-Online' })
  registerEmployee(@Body() body: Record<string, any>) {
    return this.reges.registerEmployee(body);
  }

  @Post('contracts/:contractId/register')
  @ApiOperation({ summary: 'Register an HRContract in REGES-Online (AdaugareContract)' })
  registerContract(
    @Param('contractId') contractId: string,
    @Body() body: { corCod?: number; corVersiune?: number },
  ) {
    return this.reges.registerContractById(contractId, body);
  }

  @Post('contracts/operation/:operation')
  @ApiOperation({ summary: 'Submit a raw contract lifecycle operation (Modificare/Incetare/Suspendare...)' })
  submitOperation(
    @Param('operation') operation: RegesContractOperation,
    @Body() body: { continut: Record<string, any>; referintaContract?: string },
  ) {
    return this.reges.submitContractOperation(operation, body.continut, body.referintaContract);
  }

  @Post('messages/poll')
  @ApiOperation({ summary: 'Poll the next REGES response message' })
  poll(@Query('consumerId') consumerId?: string) {
    return this.reges.pollMessage(consumerId);
  }

  @Post('messages/commit')
  @ApiOperation({ summary: 'Commit (consume) the current REGES response message' })
  commit(@Query('consumerId') consumerId?: string) {
    return this.reges.commitRead(consumerId);
  }

  @Get('nomenclator')
  @ApiOperation({ summary: 'Download REGES nomenclatures (COR codes, sporuri, ...)' })
  nomenclator(@Query('tip') tip?: string) {
    return this.reges.getNomenclator(tip);
  }
}
