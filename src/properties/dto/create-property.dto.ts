import { PropertyPurpose, PropertyStatus, PropertyType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  agencyId: string;

  @IsString()
  @Length(1, 40)
  code: string;

  @IsString()
  @Length(4, 160)
  title: string;

  @IsString()
  @Length(20, 5000)
  description: string;

  @IsEnum(PropertyPurpose)
  purpose: PropertyPurpose;

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  parkingSpaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @IsString()
  @MaxLength(120)
  neighborhood: string;

  @IsString()
  @MaxLength(120)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
