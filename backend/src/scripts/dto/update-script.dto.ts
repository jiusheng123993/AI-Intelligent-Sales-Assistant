/**
 * 更新话术 DTO。
 * 所有字段均为可选，约束规则与 CreateScriptDto 一致；
 * 后端会以"仅更新传入字段"的方式执行部分更新。
 */
import { ScriptCategory } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateScriptDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(ScriptCategory)
  category?: ScriptCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}
