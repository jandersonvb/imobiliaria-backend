import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { FindLeadsDto } from './dto/find-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: { sub: string }, @Query() query: FindLeadsDto) {
    return this.leadsService.findMine(user.sub, query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(user.sub, id, dto);
  }
}
