import { LeadActivityStatus, LeadActivityType, VisitStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AssignLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  memberId?: string | null;
}

export class CreateLeadActivityDto {
  @IsEnum(LeadActivityType)
  type: LeadActivityType;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;
}

export class UpdateLeadActivityDto {
  @IsEnum(LeadActivityStatus)
  status: LeadActivityStatus;
}

export class CreatePropertyVisitDto {
  @IsString()
  @MaxLength(64)
  propertyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedMemberId?: string;

  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}

export class UpdatePropertyVisitDto {
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}
