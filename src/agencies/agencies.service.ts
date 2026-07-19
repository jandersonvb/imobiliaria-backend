import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { InviteAgencyMemberDto, UpdateAgencyMemberDto } from './dto/team.dto';

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

  async listMembers(userId: string, agencyId: string) {
    await this.membership(userId, agencyId);
    const [members, invitations] = await Promise.all([
      this.prisma.agencyMember.findMany({
        where: { agencyId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        orderBy: [{ role: 'asc' }, { user: { firstName: 'asc' } }],
      }),
      this.prisma.agencyInvitation.findMany({
        where: { agencyId, status: 'PENDING', expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, token: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { members, invitations };
  }

  async inviteMember(userId: string, agencyId: string, dto: InviteAgencyMemberDto) {
    await this.requireManager(userId, agencyId);
    if (dto.role === 'OWNER') throw new ForbiddenException('A propriedade da imobiliária não pode ser concedida por convite');
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      const member = await this.prisma.agencyMember.findUnique({ where: { agencyId_userId: { agencyId, userId: existingUser.id } } });
      if (member) throw new ConflictException('Este usuário já faz parte da imobiliária');
    }
    await this.prisma.agencyInvitation.updateMany({ where: { agencyId, email, status: 'PENDING' }, data: { status: 'REVOKED' } });
    return this.prisma.agencyInvitation.create({
      data: { agencyId, email, role: dto.role, invitedById: userId, token: randomBytes(24).toString('hex'), expiresAt: new Date(Date.now() + 7 * 86400000) },
      select: { id: true, email: true, role: true, token: true, expiresAt: true, createdAt: true },
    });
  }

  async acceptInvitation(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const invitation = await this.prisma.agencyInvitation.findUnique({ where: { token } });
    if (!user || !invitation || invitation.status !== 'PENDING') throw new NotFoundException('Convite inválido');
    if (invitation.expiresAt <= new Date()) throw new ForbiddenException('Este convite expirou');
    if (user.email.toLowerCase() !== invitation.email) throw new ForbiddenException('Este convite pertence a outro e-mail');
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.agencyMember.upsert({
        where: { agencyId_userId: { agencyId: invitation.agencyId, userId } },
        create: { agencyId: invitation.agencyId, userId, role: invitation.role },
        update: { role: invitation.role },
        include: { agency: true },
      });
      await tx.agencyInvitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED' } });
      return member;
    });
  }

  async updateMember(userId: string, agencyId: string, memberId: string, dto: UpdateAgencyMemberDto) {
    await this.requireManager(userId, agencyId);
    const member = await this.prisma.agencyMember.findFirst({ where: { id: memberId, agencyId } });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER' || dto.role === 'OWNER') throw new ForbiddenException('O papel do proprietário não pode ser alterado');
    return this.prisma.agencyMember.update({ where: { id: memberId }, data: { role: dto.role }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } });
  }

  async removeMember(userId: string, agencyId: string, memberId: string) {
    await this.requireManager(userId, agencyId);
    const member = await this.prisma.agencyMember.findFirst({ where: { id: memberId, agencyId } });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER') throw new ForbiddenException('O proprietário não pode ser removido');
    await this.prisma.agencyMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  async revokeInvitation(userId: string, agencyId: string, invitationId: string) {
    await this.requireManager(userId, agencyId);
    const result = await this.prisma.agencyInvitation.updateMany({ where: { id: invitationId, agencyId, status: 'PENDING' }, data: { status: 'REVOKED' } });
    if (!result.count) throw new NotFoundException('Convite não encontrado');
    return { success: true };
  }

  private async membership(userId: string, agencyId: string) {
    const member = await this.prisma.agencyMember.findUnique({ where: { agencyId_userId: { agencyId, userId } } });
    if (!member) throw new ForbiddenException('Você não possui acesso a esta imobiliária');
    return member;
  }

  private async requireManager(userId: string, agencyId: string) {
    const member = await this.membership(userId, agencyId);
    if (!['OWNER', 'MANAGER'].includes(member.role)) throw new ForbiddenException('Apenas proprietário ou gerente pode administrar a equipe');
    return member;
  }
}
