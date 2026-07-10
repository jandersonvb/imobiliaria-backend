import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  propertyId: string;

  @IsString()
  @Length(2, 120)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
