import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, status: 'AVAILABLE' },
      select: { id: true, agencyId: true },
    });

    if (!property) throw new NotFoundException('Imóvel não encontrado');

    return this.prisma.lead.create({
      data: {
        agencyId: property.agencyId,
        propertyId: property.id,
        name: dto.name.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        message: dto.message?.trim(),
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.lead.findMany({
      where: { agency: { members: { some: { userId } } } },
      include: {
        property: { select: { id: true, title: true, slug: true, code: true } },
        agency: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
