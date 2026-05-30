import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(UserRole, { message: '角色取值非法' })
  role!: UserRole;
}

