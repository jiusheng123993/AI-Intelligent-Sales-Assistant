/**
 * 文档解析服务。
 *
 * 支持 pdf / docx / txt / md 四种格式，统一返回纯文本。
 * 通过 MIME + 扩展名双重判断，避免恶意上传或 MIME 误报导致的解析异常。
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

// 纯文本类 MIME 集合
const textMimeTypes = new Set(['text/plain', 'text/markdown']);
// 允许的扩展名集合（小写）
const allowedExtensions = new Set(['txt', 'md', 'pdf', 'docx']);

@Injectable()
export class DocumentParserService {
  /**
   * 解析上传文件并返回归一化后的文本内容。
   *
   * - pdf：通过 pdf-parse 提取文本；
   * - docx：通过 mammoth.extractRawText 提取纯文本；
   * - txt/md：直接按 utf8 解码 buffer。
   *
   * @throws BadRequestException 当扩展名不支持或解析后无可读文本
   */
  async parse(file: Express.Multer.File): Promise<string> {
    const extension = this.getExtension(file.originalname);

    if (!allowedExtensions.has(extension)) {
      throw new BadRequestException('Unsupported document format');
    }

    // 分支：PDF
    if (extension === 'pdf' || file.mimetype === 'application/pdf') {
      const result = await pdfParse(file.buffer);

      return this.ensureText(result.text);
    }

    // 分支：DOCX
    if (
      extension === 'docx' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });

      return this.ensureText(result.value);
    }

    // 分支：纯文本（txt/md）
    if (textMimeTypes.has(file.mimetype) || extension === 'txt' || extension === 'md') {
      return this.ensureText(file.buffer.toString('utf8'));
    }

    // 兜底：理论不可达，安全起见再抛一次
    throw new BadRequestException('Unsupported document format');
  }

  /** 获取文件扩展名（小写，无扩展名时返回空字符串）。 */
  private getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() ?? '';
  }

  /**
   * 校验并规范化文本：
   * - 移除 null 字节，避免后续存储出现问题；
   * - trim 后若为空字符串则抛 BadRequestException。
   */
  private ensureText(text: string): string {
    const normalizedText = text.replace(/\u0000/g, '').trim();

    if (!normalizedText) {
      throw new BadRequestException('Document has no readable text');
    }

    return normalizedText;
  }
}
