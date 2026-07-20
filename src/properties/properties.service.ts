import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyPurpose, PropertyType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddPropertyImageDto } from './dto/add-property-image.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ReorderPropertyImagesDto } from './dto/reorder-property-images.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

export type PropertyFilters = {
  city?: string;
  state?: string;
  purpose?: PropertyPurpose;
  type?: PropertyType;
  featured?: boolean;
  q?: string;
  neighborhood?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(filters: PropertyFilters) {
    const page = this.positiveInteger(filters.page, 1);
    const limit = Math.min(this.positiveInteger(filters.limit, 12), 50);
    const minPrice = this.nonNegativeNumber(filters.minPrice);
    const maxPrice = this.nonNegativeNumber(filters.maxPrice);
    const priceFilter = {
      gte: minPrice,
      lte: maxPrice,
    };
    const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
    const priceWhere: Prisma.PropertyWhereInput | undefined = hasPriceFilter
      ? filters.purpose === 'SALE'
        ? { salePrice: priceFilter }
        : filters.purpose === 'RENT'
          ? { rentPrice: priceFilter }
          : { OR: [{ salePrice: priceFilter }, { rentPrice: priceFilter }] }
      : undefined;
    const q = filters.q?.trim();
    const where: Prisma.PropertyWhereInput = {
      status: 'AVAILABLE',
      city: filters.city ? { contains: filters.city, mode: 'insensitive' } : undefined,
      neighborhood: filters.neighborhood ? { contains: filters.neighborhood, mode: 'insensitive' } : undefined,
      state: filters.state?.toUpperCase(),
      purpose: filters.purpose,
      type: filters.type,
      isFeatured: filters.featured,
      AND: [
        ...(priceWhere ? [priceWhere] : []),
        ...(q
          ? [{ OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
            { code: { contains: q, mode: 'insensitive' as const } },
            { city: { contains: q, mode: 'insensitive' as const } },
            { neighborhood: { contains: q, mode: 'insensitive' as const } },
          ] }]
          : []),
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: {
          agency: { select: { id: true, name: true, slug: true, creci: true, phone: true, email: true } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const property = await this.prisma.property.findFirst({
      where: { slug, status: 'AVAILABLE' },
      include: { agency: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    return property;
  }

  async create(userId: string, dto: CreatePropertyDto) {
    await this.assertCanManageProperties(userId, dto.agencyId);
    try {
      return await this.prisma.property.create({
        data: {
        agencyId: dto.agencyId,
        code: dto.code.trim(),
        slug: this.slugify(`${dto.title}-${dto.code}`),
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
        include: { agency: true, images: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um imóvel com este código ou endereço público');
      }
      throw error;
    }
  }

  async findMine(userId: string, agencyId: string) {
    if (!agencyId) throw new BadRequestException('Informe a imobiliária');
    await this.assertMembership(userId, agencyId);
    return this.prisma.property.findMany({
      where: { agencyId },
      include: {
        agency: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineById(userId: string, id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { agency: true, images: { orderBy: { sortOrder: 'asc' } }, _count: { select: { leads: true } } },
    });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertMembership(userId, property.agencyId);
    return property;
  }

  async update(userId: string, id: string, dto: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);
    const slug = dto.title || dto.code ? this.slugify(`${dto.title ?? property.title}-${dto.code ?? property.code}`) : undefined;

    try {
      return await this.prisma.property.update({
        where: { id },
        data: {
        code: dto.code?.trim(), slug, title: dto.title?.trim(), description: dto.description?.trim(),
        purpose: dto.purpose, type: dto.type, status: dto.status,
        salePrice: dto.salePrice, rentPrice: dto.rentPrice, bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms, parkingSpaces: dto.parkingSpaces, totalArea: dto.totalArea,
        neighborhood: dto.neighborhood?.trim(), city: dto.city?.trim(), state: dto.state?.trim().toUpperCase(),
        coverImageUrl: dto.coverImageUrl?.trim(), isFeatured: dto.isFeatured,
        },
        include: { agency: true, images: { orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um imóvel com este código ou endereço público');
      }
      throw error;
    }
  }

  async changeAvailability(userId: string, id: string, status: 'INACTIVE' | 'AVAILABLE') {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);

    return this.prisma.property.update({
      where: { id },
      data: { status },
      include: { agency: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async uploadImage(userId: string, propertyId: string, file: Express.Multer.File) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { _count: { select: { images: true } } },
    });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);
    const upload = await this.cloudinary.uploadImage(file, `imobconnect/properties/${propertyId}`);
    const isCover = property._count.images === 0;

    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        url: upload.secure_url,
        publicId: upload.public_id,
        sortOrder: property._count.images,
        isCover,
      },
    });

    if (isCover || !property.coverImageUrl) {
      await this.prisma.property.update({ where: { id: propertyId }, data: { coverImageUrl: image.url } });
    }

    return image;
  }

  async addImage(userId: string, propertyId: string, dto: AddPropertyImageDto) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);

    if (dto.isCover) {
      await this.prisma.propertyImage.updateMany({ where: { propertyId }, data: { isCover: false } });
    }

    const image = await this.prisma.propertyImage.create({
      data: { propertyId, url: dto.url.trim(), sortOrder: dto.sortOrder ?? 0, isCover: dto.isCover ?? false },
    });

    if (dto.isCover || !property.coverImageUrl) {
      await this.prisma.property.update({ where: { id: propertyId }, data: { coverImageUrl: image.url } });
    }
    return image;
  }

  async setCoverImage(userId: string, propertyId: string, imageId: string) {
    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
      include: { property: true },
    });
    if (!image || image.propertyId !== propertyId) throw new NotFoundException('Imagem não encontrada');
    await this.assertCanManageProperties(userId, image.property.agencyId);

    await this.prisma.$transaction([
      this.prisma.propertyImage.updateMany({ where: { propertyId }, data: { isCover: false } }),
      this.prisma.propertyImage.update({ where: { id: imageId }, data: { isCover: true } }),
      this.prisma.property.update({ where: { id: propertyId }, data: { coverImageUrl: image.url } }),
    ]);

    return this.prisma.propertyImage.findMany({ where: { propertyId }, orderBy: { sortOrder: 'asc' } });
  }

  async reorderImages(userId: string, propertyId: string, dto: ReorderPropertyImagesDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: { select: { id: true } } },
    });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);

    const currentIds = new Set(property.images.map((image) => image.id));
    const requestedIds = new Set(dto.images.map((image) => image.id));
    const positions = new Set(dto.images.map((image) => image.sortOrder));
    if (
      requestedIds.size !== property.images.length
      || dto.images.length !== property.images.length
      || positions.size !== dto.images.length
      || dto.images.some((image) => !currentIds.has(image.id))
    ) {
      throw new BadRequestException('Envie todas as imagens, sem IDs ou posições duplicadas');
    }

    await this.prisma.$transaction(
      dto.images.map((image) => this.prisma.propertyImage.update({
        where: { id: image.id },
        data: { sortOrder: image.sortOrder },
      })),
    );

    return this.prisma.propertyImage.findMany({ where: { propertyId }, orderBy: { sortOrder: 'asc' } });
  }

  async removeImage(userId: string, propertyId: string, imageId: string) {
    const image = await this.prisma.propertyImage.findUnique({ where: { id: imageId }, include: { property: true } });
    if (!image || image.propertyId !== propertyId) throw new NotFoundException('Imagem não encontrada');
    await this.assertCanManageProperties(userId, image.property.agencyId);
    if (image.publicId) await this.cloudinary.deleteImage(image.publicId);
    await this.prisma.propertyImage.delete({ where: { id: imageId } });

    if (image.isCover || image.property.coverImageUrl === image.url) {
      const next = await this.prisma.propertyImage.findFirst({ where: { propertyId }, orderBy: { sortOrder: 'asc' } });
      await this.prisma.property.update({ where: { id: propertyId }, data: { coverImageUrl: next?.url ?? null } });
      if (next) await this.prisma.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { images: { select: { publicId: true } } },
    });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    await this.assertCanManageProperties(userId, property.agencyId);

    for (const image of property.images) {
      if (image.publicId) await this.cloudinary.deleteImage(image.publicId);
    }
    await this.prisma.property.delete({ where: { id } });
    return { success: true };
  }

  private slugify(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private nonNegativeNumber(value: string | undefined) {
    if (value === undefined || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private async assertMembership(userId: string, agencyId: string) {
    const membership = await this.prisma.agencyMember.findUnique({ where: { agencyId_userId: { agencyId, userId } } });
    if (!membership) throw new ForbiddenException('Você não possui acesso a esta imobiliária');
    return membership;
  }

  private async assertCanManageProperties(userId: string, agencyId: string) {
    const membership = await this.assertMembership(userId, agencyId);
    if (membership.role === 'ASSISTANT') {
      throw new ForbiddenException('Assistentes podem consultar, mas não alterar imóveis');
    }
    return membership;
  }
}
