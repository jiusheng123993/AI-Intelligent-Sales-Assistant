import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/**
 * cuid v1 格式：c + 24 位 [0-9a-z]，总长度 25。
 * 用一个固定正则做轻量校验，避免引入 cuid 包；
 * 与 Prisma 默认 @default(cuid()) 完全一致。
 */
const CUID_REGEX = /^c[0-9a-z]{24}$/;

/**
 * 路由参数 cuid 格式校验管道。
 *
 * 用途（修复 D5）：
 * - 所有以 cuid 作为主键的路径参数（teamId/userId/invitationId 等）
 *   在到达业务层之前先做格式校验，避免无效字符串进入 Prisma 才在 DB 层兜底报错。
 * - 防止潜在的 LIKE 注入特征、超长字符串、空串等异常输入触达数据库。
 *
 * 使用示例：
 * ```ts
 * @Param('teamId', CuidParamPipe) teamId: string
 * ```
 */
@Injectable()
export class CuidParamPipe implements PipeTransform<unknown, string> {
  transform(value: unknown, metadata: ArgumentMetadata): string {
    const paramName = metadata?.data ?? 'param';

    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException(`${paramName} 不能为空`);
    }
    if (!CUID_REGEX.test(value)) {
      throw new BadRequestException(`${paramName} 格式非法，必须是合法 cuid`);
    }
    return value;
  }
}
