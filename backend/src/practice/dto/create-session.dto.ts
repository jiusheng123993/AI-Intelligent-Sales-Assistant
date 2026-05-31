/**
 * 创建练习会话 DTO。
 * scenarioId 为目标场景 ID，必填且非空字符串。
 */
import { IsString, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(1)
  scenarioId: string;
}
