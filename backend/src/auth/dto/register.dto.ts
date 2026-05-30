/**
 * 注册请求 DTO。
 * email 必须合法、password 至少 8 位、name 非空字符串。
 */
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
