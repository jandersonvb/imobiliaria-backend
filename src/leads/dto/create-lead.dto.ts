import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @Length(1, 64)
  propertyId: string;

  @IsString()
  @Length(2, 120)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(8, 30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  @Equals(true, { message: 'Você precisa aceitar o contato da imobiliária.' })
  privacyAccepted: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Não foi possível enviar o contato.' })
  website?: string;
}
