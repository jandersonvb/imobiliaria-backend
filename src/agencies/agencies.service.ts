import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async createOwnerAgency(userId: string, dto: CreateAgencyDto) {
    const slugBase = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingMembership = await this.prisma.agencyMember.findFirst({
      where: { userId, role: 'OWNER' },
    });

    if (existingMembership) {
      throw new ConflictException('Este usuário já possui uma imobiliária');
    }

    let slug = slugBase || `imobiliaria-${Date.now()}`;
    const existingSlug = await this.prisma.agency.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString().slice(-6)}`;

    return this.prisma.agency.create({
      data: {
        name: dto.name.trim(),
        slug,
        creci: dto.creci?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        city: dto.city?.trim(),
        state: dto.state?.trim().toUpperCase(),
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: true },
    });
  }

  findMine(userId: string) {
    return this.prisma.agency.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { where: { userId }, select: { role: true } },
        _count: { select: { properties: true, leads: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
