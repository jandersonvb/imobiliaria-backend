import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { FindLeadsDto } from './dto/find-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto, CreateLeadActivityDto, CreatePropertyVisitDto, UpdateLeadActivityDto, UpdatePropertyVisitDto } from './dto/crm.dto';
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

  @Get('mine/metrics')
  @UseGuards(JwtAuthGuard)
  metrics(@CurrentUser() user: { sub: string }, @Query('agencyId') agencyId: string) {
    return this.leadsService.metrics(user.sub, agencyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.leadsService.findOne(user.sub, id);
  }

  @Patch(':id/assignee')
  @UseGuards(JwtAuthGuard)
  assign(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.leadsService.assign(user.sub, id, dto);
  }

  @Post(':id/activities')
  @UseGuards(JwtAuthGuard)
  addActivity(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: CreateLeadActivityDto) {
    return this.leadsService.addActivity(user.sub, id, dto);
  }

  @Patch(':id/activities/:activityId')
  @UseGuards(JwtAuthGuard)
  updateActivity(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Param('activityId') activityId: string, @Body() dto: UpdateLeadActivityDto) {
    return this.leadsService.updateActivity(user.sub, id, activityId, dto);
  }

  @Post(':id/visits')
  @UseGuards(JwtAuthGuard)
  addVisit(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: CreatePropertyVisitDto) {
    return this.leadsService.addVisit(user.sub, id, dto);
  }

  @Patch(':id/visits/:visitId')
  @UseGuards(JwtAuthGuard)
  updateVisit(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Param('visitId') visitId: string, @Body() dto: UpdatePropertyVisitDto) {
    return this.leadsService.updateVisit(user.sub, id, visitId, dto);
  }
}
