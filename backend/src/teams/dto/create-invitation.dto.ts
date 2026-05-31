import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsOptional()
  @IsEnum(UserRole, { message: '角色取值非法' })
  role?: UserRole;

  @IsOptional()
  @IsInt({ message: '过期天数必须是整数' })
  @Min(1, { message: '过期天数至少 1 天' })
  @Max(30, { message: '过期天数最多 30 天' })
  expiresInDays?: number;
}
