// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  function setup(items: unknown[] = [], total = items.length) {
    const prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue(items),
        count: jest.fn().mockResolvedValue(total),
      },
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
});
