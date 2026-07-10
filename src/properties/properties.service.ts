import { Injectable } from '@nestjs/common';
import { Prisma, PropertyPurpose, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
