import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MeetingDto {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  meetingUrl?: string;
  attendees?: { name: string; email?: string }[];
}

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.meeting.findMany({ where: { orgId }, orderBy: { startsAt: 'asc' } });
  }

  /** Meetings starting within the next `days` days (default 7), scheduled only. */
  upcoming(orgId: string, days = 7, now: Date = new Date()) {
    const until = new Date(now.getTime() + Math.max(1, Math.min(days, 365)) * 86_400_000);
    return this.prisma.meeting.findMany({
      where: { orgId, status: 'scheduled', startsAt: { gte: now, lte: until } },
      orderBy: { startsAt: 'asc' },
    });
  }

  create(orgId: string, userId: string, dto: MeetingDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Interval orar invalid (sfârșitul trebuie să fie după început).');
    }
    return this.prisma.meeting.create({
      data: {
        orgId,
        title: dto.title,
        description: dto.description,
        startsAt,
        endsAt,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        attendees: dto.attendees ?? [],
        createdBy: userId,
      },
    });
  }

  private async owned(orgId: string, id: string) {
    const m = await this.prisma.meeting.findFirst({ where: { id, orgId } });
    if (!m) throw new NotFoundException('Întâlnirea nu există.');
    return m;
  }

  async update(orgId: string, id: string, dto: Partial<MeetingDto> & { status?: string }) {
    await this.owned(orgId, id);
    return this.prisma.meeting.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: new Date(dto.endsAt) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.meetingUrl !== undefined && { meetingUrl: dto.meetingUrl }),
        ...(dto.attendees !== undefined && { attendees: dto.attendees }),
        ...(dto.status !== undefined && ['scheduled', 'completed', 'cancelled'].includes(dto.status) && { status: dto.status }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.owned(orgId, id);
    await this.prisma.meeting.update({ where: { id }, data: { status: 'cancelled' } });
    return { cancelled: true };
  }
}
