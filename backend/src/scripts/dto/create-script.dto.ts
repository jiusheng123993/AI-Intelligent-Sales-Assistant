/**
 * 创建话术 DTO。
 * - title: 2~80 字符
 * - content: 5~5000 字符
 * - category: 枚举 ScriptCategory
 * - tags: 可选，每个标签最长 20 字符
 * - isShared: 可选，需结合角色权限校验
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

export class CreateScriptDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content: string;

  @IsEnum(ScriptCategory)
  category: ScriptCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}
