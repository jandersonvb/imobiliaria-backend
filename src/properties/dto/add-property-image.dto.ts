import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddPropertyImageDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
