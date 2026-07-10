import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

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
}
