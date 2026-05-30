/**
 * 发送消息 DTO。
 * content 为销售向 AI 客户发送的内容，长度 1~1000 字。
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
