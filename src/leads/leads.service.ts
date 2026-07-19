import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { FindLeadsDto } from './dto/find-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto, CreateLeadActivityDto, CreatePropertyVisitDto, UpdateLeadActivityDto, UpdatePropertyVisitDto } from './dto/crm.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Informe um e-mail ou telefone para contato.');
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, status: 'AVAILABLE' },
      select: { id: true, agencyId: true },
    });

    if (!property) throw new NotFoundException('Imóvel não encontrado');

    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.replace(/\D/g, '');
    const duplicate = await this.prisma.lead.findFirst({
      where: {
        propertyId: property.id,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Seu contato já foi enviado. A imobiliária responderá em breve.');
    }

    const lead = await this.prisma.lead.create({
      data: {
        agencyId: property.agencyId,
        propertyId: property.id,
        name: dto.name.trim(),
        email,
        phone,
        message: dto.message?.trim(),
      },
      select: { id: true, createdAt: true },
    });

    return { ...lead, status: 'received' };
  }

  async findMine(userId: string, query: FindLeadsDto) {
    const where: Prisma.LeadWhereInput = {
      agency: { members: { some: { userId } } },
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
          { property: { title: { contains: query.search, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: {
          property: { select: { id: true, title: true, slug: true, code: true } },
          agency: { select: { id: true, name: true } },
          assignedMember: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          _count: { select: { activities: true, visits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async update(userId: string, id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, agencyId: true, stage: true, notes: true },
    });

    if (!lead) throw new NotFoundException('Lead não encontrado');

    const membership = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId: lead.agencyId, userId } },
    });

    if (!membership) throw new ForbiddenException('Você não possui acesso a este lead');

    return this.prisma.$transaction(async (tx) => {
      const changes = [
        ...(dto.stage && dto.stage !== lead.stage ? [{ field: 'stage', fromValue: lead.stage, toValue: dto.stage }] : []),
        ...(dto.notes !== undefined && dto.notes.trim() !== (lead.notes ?? '') ? [{ field: 'notes', fromValue: lead.notes, toValue: dto.notes.trim() }] : []),
      ];
      const updated = await tx.lead.update({ where: { id }, data: { stage: dto.stage, notes: dto.notes?.trim() }, include: this.detailInclude() });
      if (changes.length) await tx.leadHistory.createMany({ data: changes.map((change) => ({ leadId: id, userId, ...change })) });
      return updated;
    });
  }

  async findOne(userId: string, id: string) {
    await this.assertLeadAccess(userId, id);
    return this.prisma.lead.findUnique({ where: { id }, include: this.detailInclude() });
  }

  async assign(userId: string, id: string, dto: AssignLeadDto) {
    const { lead, membership } = await this.assertLeadAccess(userId, id);
    if (!['OWNER', 'MANAGER'].includes(membership.role) && lead.assignedUserId !== userId) throw new ForbiddenException('Você não pode redistribuir este lead');
    const member = dto.memberId ? await this.prisma.agencyMember.findFirst({ where: { id: dto.memberId, agencyId: lead.agencyId }, include: { user: true } }) : null;
    if (dto.memberId && !member) throw new NotFoundException('Corretor não encontrado');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id }, data: { assignedMemberId: member?.id ?? null, assignedUserId: member?.userId ?? null }, include: this.detailInclude() });
      await tx.leadHistory.create({ data: { leadId: id, userId, field: 'assignee', fromValue: lead.assignedMemberId, toValue: member?.id ?? null } });
      return updated;
    });
  }

  async addActivity(userId: string, id: string, dto: CreateLeadActivityDto) {
    const { lead } = await this.assertLeadAccess(userId, id);
    return this.prisma.leadActivity.create({ data: { agencyId: lead.agencyId, leadId: id, userId, type: dto.type, title: dto.title.trim(), description: dto.description?.trim(), dueAt: dto.dueAt }, include: { user: { select: { firstName: true, lastName: true } } } });
  }

  async updateActivity(userId: string, leadId: string, activityId: string, dto: UpdateLeadActivityDto) {
    await this.assertLeadAccess(userId, leadId);
    const activity = await this.prisma.leadActivity.findFirst({ where: { id: activityId, leadId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    return this.prisma.leadActivity.update({ where: { id: activityId }, data: { status: dto.status, completedAt: dto.status === 'COMPLETED' ? new Date() : null } });
  }

  async addVisit(userId: string, id: string, dto: CreatePropertyVisitDto) {
    const { lead } = await this.assertLeadAccess(userId, id);
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, agencyId: lead.agencyId } });
    if (!property) throw new NotFoundException('Imóvel não encontrado nesta imobiliária');
    const member = dto.assignedMemberId ? await this.prisma.agencyMember.findFirst({ where: { id: dto.assignedMemberId, agencyId: lead.agencyId } }) : null;
    if (dto.assignedMemberId && !member) throw new NotFoundException('Responsável não encontrado');
    const assignedMemberId = member?.id ?? lead.assignedMemberId;
    const assignedUserId = member?.userId ?? lead.assignedUserId;
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.propertyVisit.create({ data: { agencyId: lead.agencyId, leadId: id, propertyId: dto.propertyId, assignedMemberId, assignedUserId, createdById: userId, scheduledAt: dto.scheduledAt, durationMinutes: dto.durationMinutes, notes: dto.notes?.trim() }, include: { property: { select: { id: true, title: true, code: true } }, assignedMember: { include: { user: { select: { firstName: true, lastName: true } } } } } });
      if (lead.stage !== 'VISIT_SCHEDULED') {
        await tx.lead.update({ where: { id }, data: { stage: 'VISIT_SCHEDULED' } });
        await tx.leadHistory.create({ data: { leadId: id, userId, field: 'stage', fromValue: lead.stage, toValue: 'VISIT_SCHEDULED' } });
      }
      return visit;
    });
  }

  async updateVisit(userId: string, leadId: string, visitId: string, dto: UpdatePropertyVisitDto) {
    await this.assertLeadAccess(userId, leadId);
    const visit = await this.prisma.propertyVisit.findFirst({ where: { id: visitId, leadId } });
    if (!visit) throw new NotFoundException('Visita não encontrada');
    return this.prisma.propertyVisit.update({ where: { id: visitId }, data: { status: dto.status, scheduledAt: dto.scheduledAt, notes: dto.notes?.trim() } });
  }

  async metrics(userId: string) {
    const memberships = await this.prisma.agencyMember.findMany({ where: { userId }, select: { agencyId: true } });
    const agencyIds = memberships.map((item) => item.agencyId);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [total, newLeads, won, pendingActivities, upcomingVisits, byStage] = await Promise.all([
      this.prisma.lead.count({ where: { agencyId: { in: agencyIds } } }),
      this.prisma.lead.count({ where: { agencyId: { in: agencyIds }, createdAt: { gte: start } } }),
      this.prisma.lead.count({ where: { agencyId: { in: agencyIds }, stage: 'WON' } }),
      this.prisma.leadActivity.count({ where: { agencyId: { in: agencyIds }, status: 'PENDING' } }),
      this.prisma.propertyVisit.count({ where: { agencyId: { in: agencyIds }, scheduledAt: { gte: now }, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      this.prisma.lead.groupBy({ by: ['stage'], where: { agencyId: { in: agencyIds } }, _count: { _all: true } }),
    ]);
    return { total, newThisMonth: newLeads, won, conversionRate: total ? Math.round((won / total) * 1000) / 10 : 0, pendingActivities, upcomingVisits, byStage: Object.fromEntries(byStage.map((item) => [item.stage, item._count._all])) };
  }

  private detailInclude(): Prisma.LeadInclude {
    return {
      property: { select: { id: true, title: true, slug: true, code: true } },
      agency: { select: { id: true, name: true } },
      assignedMember: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      activities: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
      history: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
      visits: { include: { property: { select: { id: true, title: true, code: true } }, assignedMember: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { scheduledAt: 'desc' } },
    };
  }

  private async assertLeadAccess(userId: string, id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true, agencyId: true, stage: true, assignedMemberId: true, assignedUserId: true } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    const membership = await this.prisma.agencyMember.findUnique({ where: { agencyId_userId: { agencyId: lead.agencyId, userId } } });
    if (!membership) throw new ForbiddenException('Você não possui acesso a este lead');
    return { lead, membership };
  }
}
