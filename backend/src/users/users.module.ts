/**
 * 用户模块。
 * 仅注册并导出 UsersService，供 AuthModule 等其他模块复用。
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
