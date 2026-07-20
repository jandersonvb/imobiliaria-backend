import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PropertyPurpose, PropertyType } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddPropertyImageDto } from './dto/add-property-image.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ReorderPropertyImagesDto } from './dto/reorder-property-images.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
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
    @Query('q') q?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.propertiesService.findAll({
      city,
      state,
      purpose,
      type,
      featured: featured === undefined ? undefined : featured === 'true',
      q,
      neighborhood,
      minPrice,
      maxPrice,
      page,
      limit,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: { sub: string }, @Query('agencyId') agencyId: string) {
    return this.propertiesService.findMine(user.sub, agencyId);
  }

  @Get('mine/:id')
  @UseGuards(JwtAuthGuard)
  findMineById(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.propertiesService.findMineById(user.sub, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(user.sub, id, dto);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  archive(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.propertiesService.changeAvailability(user.sub, id, 'INACTIVE');
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  activate(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.propertiesService.changeAvailability(user.sub, id, 'AVAILABLE');
  }

  @Post(':id/images/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new BadRequestException('Envie apenas arquivos de imagem'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadImage(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Selecione uma imagem');
    return this.propertiesService.uploadImage(user.sub, id, file);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  addImage(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: AddPropertyImageDto) {
    return this.propertiesService.addImage(user.sub, id, dto);
  }

  @Patch(':id/images/order')
  @UseGuards(JwtAuthGuard)
  reorderImages(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ReorderPropertyImagesDto,
  ) {
    return this.propertiesService.reorderImages(user.sub, id, dto);
  }

  @Patch(':id/images/:imageId/cover')
  @UseGuards(JwtAuthGuard)
  setCover(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.propertiesService.setCoverImage(user.sub, id, imageId);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.propertiesService.removeImage(user.sub, id, imageId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.propertiesService.remove(user.sub, id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.propertiesService.findBySlug(slug);
  }
}
