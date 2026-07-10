import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyPurpose, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

export type PropertyFilters = {
  city?: string;
  state?: string;
  purpose?: PropertyPurpose;
  type?: PropertyType;
  featured?: boolean;
};

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: PropertyFilters) {
    const where: Prisma.PropertyWhereInput = {
      status: 'AVAILABLE',
      city: filters.city ? { contains: filters.city, mode: 'insensitive' } : undefined,
      state: filters.state?.toUpperCase(),
      purpose: filters.purpose,
      type: filters.type,
      isFeatured: filters.featured,
    };

    return this.prisma.property.findMany({
      where,
      include: {
        agency: { select: { id: true, name: true, slug: true, creci: true, phone: true, email: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
  }

  async findBySlug(slug: string) {
    const property = await this.prisma.property.findFirst({
      where: { slug, status: 'AVAILABLE' },
      include: { agency: true },
    });

    if (!property) throw new NotFoundException('Imóvel não encontrado');
    return property;
  }

  async create(userId: string, dto: CreatePropertyDto) {
    await this.assertMembership(userId, dto.agencyId);

    const slugBase = `${dto.title}-${dto.code}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return this.prisma.property.create({
      data: {
        agencyId: dto.agencyId,
        code: dto.code.trim(),
        slug: slugBase,
        title: dto.title.trim(),
        description: dto.description.trim(),
        purpose: dto.purpose,
        type: dto.type,
        status: dto.status ?? 'DRAFT',
        salePrice: dto.salePrice,
        rentPrice: dto.rentPrice,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        parkingSpaces: dto.parkingSpaces,
        totalArea: dto.totalArea,
        neighborhood: dto.neighborhood.trim(),
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
        coverImageUrl: dto.coverImageUrl?.trim(),
        isFeatured: dto.isFeatured ?? false,
      },
      include: { agency: true },
    });
  }

  findMine(userId: string) {
    return this.prisma.property.findMany({
      where: { agency: { members: { some: { userId } } } },
      include: {
        agency: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineById(userId: string, id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { agency: true, _count: { select: { leads: true } } },
    });

    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertMembership(userId, property.agencyId);
    return property;
  }

  async update(userId: string, id: string, dto: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertMembership(userId, property.agencyId);

    const slug = dto.title || dto.code
      ? `${dto.title ?? property.title}-${dto.code ?? property.code}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : undefined;

    return this.prisma.property.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        slug,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        purpose: dto.purpose,
        type: dto.type,
        status: dto.status,
        salePrice: dto.salePrice,
        rentPrice: dto.rentPrice,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        parkingSpaces: dto.parkingSpaces,
        totalArea: dto.totalArea,
        neighborhood: dto.neighborhood?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim().toUpperCase(),
        coverImageUrl: dto.coverImageUrl?.trim(),
        isFeatured: dto.isFeatured,
      },
      include: { agency: true },
    });
  }

  private async assertMembership(userId: string, agencyId: string) {
    const membership = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId, userId } },
    });
    if (!membership) throw new ForbiddenException('Você não possui acesso a esta imobiliária');
    return membership;
  }
}
