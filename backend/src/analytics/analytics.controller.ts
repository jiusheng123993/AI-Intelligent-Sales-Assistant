import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { CreateExtensionUsageEventDto } from './dto/create-extension-usage-event.dto';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: SafeUser, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSummary(user, query);
  }

  @Post('extension-events')
  recordExtensionUsageEvent(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateExtensionUsageEventDto,
  ) {
    return this.analyticsService.recordExtensionUsageEvent(user, dto);
  }
}
