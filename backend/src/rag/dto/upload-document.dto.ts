/**
 * 文档上传 DTO。
 * title 可选（不传时取原文件名），isShared 支持多种入参（true / 'true'）。
 */
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  // multipart 场景下布尔值通常以字符串形式传入，这里做兼容
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isShared?: boolean;
}
