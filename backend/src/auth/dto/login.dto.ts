/**
 * 登录请求 DTO。
 * email 必须是合法邮箱，password 至少 8 位（class-validator 校验）。
 */
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
