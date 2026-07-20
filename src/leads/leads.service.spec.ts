// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  const prisma = {
    property: { findFirst: jest.fn() },
    lead: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    agencyMember: { findUnique: jest.fn() },
    leadActivity: { count: jest.fn(), create: jest.fn() },
    propertyVisit: { count: jest.fn() },
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
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'MANAGER' });
    prisma.$transaction.mockResolvedValue([[{ id: 'lead' }], 21]);
    await expect(service.findMine('user', { agencyId: 'agency', stage: 'NEW', search: 'Maria', page: 2, limit: 20 }))
      .resolves.toEqual({ items: [{ id: 'lead' }], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ agencyId: 'agency' }),
    }));
  });

  it('creates a task only when the broker owns the lead', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead', agencyId: 'agency', stage: 'NEW', assignedMemberId: 'member', assignedUserId: 'user' });
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'BROKER' });
    prisma.leadActivity.create.mockResolvedValue({ id: 'activity', title: 'Retornar contato' });
    await expect(service.addActivity('user', 'lead', { type: 'TASK', title: ' Retornar contato ' }))
      .resolves.toMatchObject({ id: 'activity' });
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ agencyId: 'agency', leadId: 'lead', userId: 'user', title: 'Retornar contato' }),
    }));
  });

  it('prevents brokers from opening another broker lead', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead', agencyId: 'agency', stage: 'NEW', assignedMemberId: 'other-member', assignedUserId: 'other-user' });
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'BROKER' });
    await expect(service.findOne('user', 'lead')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps assistants read-only in the CRM', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead', agencyId: 'agency', stage: 'NEW', assignedMemberId: null, assignedUserId: null });
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'ASSISTANT' });
    await expect(service.addActivity('assistant', 'lead', { type: 'TASK', title: 'Tarefa' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calculates commercial dashboard metrics', async () => {
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'MANAGER' });
    prisma.lead.count.mockResolvedValueOnce(20).mockResolvedValueOnce(5).mockResolvedValueOnce(4);
    prisma.leadActivity.count.mockResolvedValue(3);
    prisma.propertyVisit.count.mockResolvedValue(2);
    prisma.lead.groupBy.mockResolvedValue([{ stage: 'NEW', _count: { _all: 6 } }]);
    await expect(service.metrics('user', 'agency')).resolves.toMatchObject({ total: 20, newThisMonth: 5, won: 4, conversionRate: 20, pendingActivities: 3, upcomingVisits: 2, byStage: { NEW: 6 } });
  });
});
