import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { InviteAgencyMemberDto, UpdateAgencyMemberDto } from './dto/team.dto';

@Controller('agencies')
@UseGuards(JwtAuthGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateAgencyDto,
  ) {
    return this.agenciesService.createOwnerAgency(user.sub, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: { sub: string }) {
    return this.agenciesService.findMine(user.sub);
  }

  @Get(':agencyId/members')
  members(@CurrentUser() user: { sub: string }, @Param('agencyId') agencyId: string) {
    return this.agenciesService.listMembers(user.sub, agencyId);
  }

  @Post(':agencyId/invitations')
  invite(@CurrentUser() user: { sub: string }, @Param('agencyId') agencyId: string, @Body() dto: InviteAgencyMemberDto) {
    return this.agenciesService.inviteMember(user.sub, agencyId, dto);
  }

  @Post('invitations/:token/accept')
  accept(@CurrentUser() user: { sub: string }, @Param('token') token: string) {
    return this.agenciesService.acceptInvitation(user.sub, token);
  }

  @Patch(':agencyId/members/:memberId')
  updateMember(@CurrentUser() user: { sub: string }, @Param('agencyId') agencyId: string, @Param('memberId') memberId: string, @Body() dto: UpdateAgencyMemberDto) {
    return this.agenciesService.updateMember(user.sub, agencyId, memberId, dto);
  }

  @Delete(':agencyId/members/:memberId')
  removeMember(@CurrentUser() user: { sub: string }, @Param('agencyId') agencyId: string, @Param('memberId') memberId: string) {
    return this.agenciesService.removeMember(user.sub, agencyId, memberId);
  }

  @Delete(':agencyId/invitations/:invitationId')
  revokeInvitation(@CurrentUser() user: { sub: string }, @Param('agencyId') agencyId: string, @Param('invitationId') invitationId: string) {
    return this.agenciesService.revokeInvitation(user.sub, agencyId, invitationId);
  }
}
