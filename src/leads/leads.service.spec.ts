// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  const prisma = {
    property: { findFirst: jest.fn() },
    lead: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    agencyMember: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new LeadsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('requires at least one contact channel', async () => {
    await expect(service.create({ propertyId: 'property', name: 'Maria', privacyAccepted: true }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leads for unavailable properties', async () => {
    prisma.property.findFirst.mockResolvedValue(null);
    await expect(service.create({ propertyId: 'property', name: 'Maria', email: 'maria@example.com', privacyAccepted: true }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents duplicate contacts in a five minute window', async () => {
    prisma.property.findFirst.mockResolvedValue({ id: 'property', agencyId: 'agency' });
    prisma.lead.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.create({ propertyId: 'property', name: 'Maria', phone: '(11) 99999-9999', privacyAccepted: true }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('normalizes contact data and returns a minimal receipt', async () => {
    prisma.property.findFirst.mockResolvedValue({ id: 'property', agencyId: 'agency' });
    prisma.lead.findFirst.mockResolvedValue(null);
    prisma.lead.create.mockResolvedValue({ id: 'lead', createdAt: new Date('2026-07-16T00:00:00Z') });

    await expect(service.create({
      propertyId: 'property', name: ' Maria ', email: ' MARIA@EXAMPLE.COM ', phone: '(11) 99999-9999', privacyAccepted: true,
    })).resolves.toMatchObject({ id: 'lead', status: 'received' });
    expect(prisma.lead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Maria', email: 'maria@example.com', phone: '11999999999' }),
      select: { id: true, createdAt: true },
    }));
  });

  it('returns filtered leads with pagination metadata', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'lead' }], 21]);
    await expect(service.findMine('user', { stage: 'NEW', search: 'Maria', page: 2, limit: 20 }))
      .resolves.toEqual({ items: [{ id: 'lead' }], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
  });
});
