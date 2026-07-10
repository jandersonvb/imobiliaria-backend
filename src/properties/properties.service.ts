import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, PropertyPurpose, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';

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
        agency: { select: { id: true, name: true, slug: true, creci: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.property.findUnique({
      where: { slug },
      include: { agency: true },
    });
  }

  async create(userId: string, dto: CreatePropertyDto) {
    const membership = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId: dto.agencyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Você não possui acesso a esta imobiliária');
    }

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
      include: { agency: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
