/**
 * 应用入口文件。
 *
 * 负责创建 NestJS 应用实例、配置全局校验管道、启用跨域支持，
 * 并在指定端口启动 HTTP 服务。所有传入请求会先经过全局 ValidationPipe
 * 进行白名单过滤与类型转换，从而保证 Controller 层接收到的数据安全可信。
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * 启动 NestJS 应用。
 *
 * 关键步骤：
 * 1. 通过 NestFactory 创建应用实例；
 * 2. 注册全局 ValidationPipe（whitelist 去掉未声明字段，transform 自动类型转换）；
 * 3. 开启 CORS，支持前端跨域调用；
 * 4. 监听 process.env.PORT 指定端口，默认 3000。
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 全局参数校验与转换：自动剔除未在 DTO 中声明的字段，并将原始入参转换为 DTO 类型
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // 启用跨域，方便前端独立部署时调用后端 API
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
