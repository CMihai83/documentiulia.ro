import { Body, Controller, Get, Param, Post, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';

/** Client side of REQ-049: "Ajutor · Cererile mele". Scoped to the JWT user. */
@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'My requests' })
  list(@Request() req: any) {
    return this.support.listForUser(req.user.sub);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Open a new request' })
  create(@Request() req: any, @Body() body: { subject: string; body: string; category?: string; priority?: TicketPriority }) {
    if (!body?.subject?.trim() || !body?.body?.trim()) {
      throw new BadRequestException('Subiectul și mesajul sunt obligatorii.');
    }
    return this.support.createForUser(req.user.sub, body);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'One of my requests with its thread' })
  get(@Request() req: any, @Param('id') id: string) {
    return this.support.getForUser(req.user.sub, id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply in my request' })
  reply(@Request() req: any, @Param('id') id: string, @Body() body: { body: string }) {
    if (!body?.body?.trim()) throw new BadRequestException('Mesajul este obligatoriu.');
    return this.support.replyAsUser(req.user.sub, id, body.body);
  }
}
