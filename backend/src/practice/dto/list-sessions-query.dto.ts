/**
 * 练习会话列表查询 DTO。
 * - page/pageSize：标准分页参数；
 * - status：可选状态过滤，仅允许 IN_PROGRESS / FINISHED。
 */
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListSessionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @IsOptional()
  @IsIn(['IN_PROGRESS', 'FINISHED'])
  status?: string;
}
