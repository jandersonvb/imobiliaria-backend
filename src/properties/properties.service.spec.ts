// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  function setup(items: unknown[] = [], total = items.length) {
    const prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(total),
        findUnique: jest.fn().mockResolvedValue({ id: 'property-1', agencyId: 'agency-1', images: [] }),
        update: jest.fn().mockResolvedValue({ id: 'property-1' }),
      },
      propertyImage: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      agencyMember: { findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new PropertiesService(prisma as never, {} as never);
    return { prisma, service };
  }

  it('returns public properties with pagination metadata', async () => {
    const property = { id: 'property-1' };
    const { prisma, service } = setup([property], 25);

    const result = await service.findAll({ page: '2', limit: '10', city: 'Poços de Caldas' });

    expect(result).toEqual({
      items: [property],
      pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
    });
    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10,
      take: 10,
      where: expect.objectContaining({ status: 'AVAILABLE', city: { contains: 'Poços de Caldas', mode: 'insensitive' } }),
    }));
  });

  it('caps page size and applies sale price filters', async () => {
    const { prisma, service } = setup();

    await service.findAll({ purpose: 'SALE', minPrice: '100000', maxPrice: '500000', limit: '500' });

    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 50,
      where: expect.objectContaining({
        purpose: 'SALE',
        AND: expect.arrayContaining([{ salePrice: { gte: 100000, lte: 500000 } }]),
      }),
    }));
  });

  it('archives a property that belongs to the current agency member', async () => {
    const { prisma, service } = setup();

    await service.changeAvailability('user-1', 'property-1', 'INACTIVE');

    expect(prisma.property.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'property-1' },
      data: { status: 'INACTIVE' },
    }));
  });

  it('rejects image orders that do not contain the complete gallery', async () => {
    const { prisma, service } = setup();
    prisma.property.findUnique.mockResolvedValue({
      id: 'property-1',
      agencyId: 'agency-1',
      images: [{ id: 'image-1' }, { id: 'image-2' }],
    });

    await expect(service.reorderImages('user-1', 'property-1', {
      images: [{ id: 'image-1', sortOrder: 0 }],
    })).rejects.toThrow('Envie todas as imagens');
  });
});
