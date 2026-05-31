/**
 * 话术列表查询 DTO。
 * 支持关键字、分类、分页参数；page/pageSize 经 Type 转 number 后再校验。
 */
import { Type } from 'class-transformer';
import { ScriptCategory } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListScriptsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsEnum(ScriptCategory)
  category?: ScriptCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
