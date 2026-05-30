/**
 * RAG 检索请求 DTO。
 * query 为检索文本（≤1000 字），topK 可选并限制在 [1, 10]。
 */
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchRagDto {
  @IsString()
  @MaxLength(1000)
  query: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;
}
