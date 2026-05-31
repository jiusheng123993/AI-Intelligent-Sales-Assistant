import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiSuggestMode } from '../types/ai-suggest-mode.type';

export class SuggestDto {
  @IsString()
  @MaxLength(4000)
  contextText: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  inputText?: string;

  @IsIn(['suggest', 'polish', 'translate', 'expand'])
  mode: AiSuggestMode;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;
}
