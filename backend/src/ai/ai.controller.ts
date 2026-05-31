import { Body, Controller, Header, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { AiService } from './ai.service';
import { SuggestDto } from './dto/suggest.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest')
  @Header('Content-Type', 'text/event-stream; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  async suggest(
    @CurrentUser() user: SafeUser,
    @Body() suggestDto: SuggestDto,
    @Res() response: Response,
  ) {
    response.status(200);

    try {
      const result = await this.aiService.generateSuggestion(user, suggestDto);

      for (const event of this.aiService.toSseEvents(result)) {
        response.write(event);
      }
    } catch {
      response.write(this.aiService.toSseErrorEvent());
    } finally {
      response.end();
    }
  }
}
