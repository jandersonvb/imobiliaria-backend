import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { FindLeadsDto } from './dto/find-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

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
      select: { id: true, agencyId: true },
    });

    if (!lead) throw new NotFoundException('Lead não encontrado');

    const membership = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId: lead.agencyId, userId } },
    });

    if (!membership) throw new ForbiddenException('Você não possui acesso a este lead');

    return this.prisma.lead.update({
      where: { id },
      data: {
        stage: dto.stage,
        notes: dto.notes?.trim(),
      },
      include: {
        property: { select: { id: true, title: true, slug: true, code: true } },
        agency: { select: { id: true, name: true } },
      },
    });
  }
}
