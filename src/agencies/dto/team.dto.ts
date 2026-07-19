import { AgencyMemberRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class InviteAgencyMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(AgencyMemberRole)
  role: AgencyMemberRole;
}

export class UpdateAgencyMemberDto {
  @IsEnum(AgencyMemberRole)
  role: AgencyMemberRole;
}
