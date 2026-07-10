import { Controller, Get, Param, Query } from '@nestjs/common';
import { PropertyPurpose, PropertyType } from '@prisma/client';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('purpose') purpose?: PropertyPurpose,
    @Query('type') type?: PropertyType,
    @Query('featured') featured?: string,
  ) {
    return this.propertiesService.findAll({
      city,
      state,
      purpose,
      type,
      featured: featured === undefined ? undefined : featured === 'true',
    });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.propertiesService.findBySlug(slug);
  }
}
