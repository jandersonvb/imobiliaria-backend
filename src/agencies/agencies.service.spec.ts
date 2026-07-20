// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { ForbiddenException } from '@nestjs/common';
import { AgenciesService } from './agencies.service';

describe('AgenciesService team management', () => {
  const prisma = {
    agencyMember: { findUnique: jest.fn(), findMany: jest.fn() },
    agencyInvitation: { updateMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AgenciesService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('allows owners to create expiring invitations', async () => {
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.agencyInvitation.create.mockImplementation(({ data }) => Promise.resolve({ id: 'invite', ...data }));
    const invitation = await service.inviteMember('owner', 'agency', { email: ' Corretor@Example.com ', role: 'BROKER' });
    expect(invitation.email).toBe('corretor@example.com');
    expect(invitation.token).toHaveLength(48);
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('blocks assistants from managing the team', async () => {
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'ASSISTANT' });
    await expect(service.inviteMember('assistant', 'agency', { email: 'broker@example.com', role: 'BROKER' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not expose invitation tokens to non-managers', async () => {
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'BROKER' });
    prisma.agencyMember.findMany.mockResolvedValue([]);
    await expect(service.listMembers('broker', 'agency')).resolves.toEqual({
      members: [],
      invitations: [],
    });
    expect(prisma.agencyInvitation.findMany).not.toHaveBeenCalled();
  });

  it('does not allow inviting another owner', async () => {
    prisma.agencyMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    await expect(service.inviteMember('owner', 'agency', { email: 'owner@example.com', role: 'OWNER' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
