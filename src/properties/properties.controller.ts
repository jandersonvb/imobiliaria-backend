import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PropertyPurpose, PropertyType } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
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

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: { sub: string }) {
    return this.propertiesService.findMine(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertiesService.create(user.sub, dto);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.propertiesService.findBySlug(slug);
  }
}
