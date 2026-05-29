import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SafeUser } from '../users/types/safe-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateScriptDto } from './dto/create-script.dto';
import { ListScriptsQueryDto } from './dto/list-scripts-query.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ScriptsService } from './scripts.service';

@UseGuards(JwtAuthGuard)
@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Post()
  create(@CurrentUser() user: SafeUser, @Body() createScriptDto: CreateScriptDto) {
    return this.scriptsService.create(user, createScriptDto);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser, @Query() query: ListScriptsQueryDto) {
    return this.scriptsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.scriptsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() updateScriptDto: UpdateScriptDto,
  ) {
    return this.scriptsService.update(user, id, updateScriptDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.scriptsService.remove(user, id);
  }
}
