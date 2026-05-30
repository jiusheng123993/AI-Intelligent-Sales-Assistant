import { BadRequestException, Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

const textMimeTypes = new Set(['text/plain', 'text/markdown']);
const allowedExtensions = new Set(['txt', 'md', 'pdf', 'docx']);

@Injectable()
export class DocumentParserService {
  async parse(file: Express.Multer.File): Promise<string> {
    const extension = this.getExtension(file.originalname);

    if (!allowedExtensions.has(extension)) {
      throw new BadRequestException('Unsupported document format');
    }

    if (extension === 'pdf' || file.mimetype === 'application/pdf') {
      const result = await pdfParse(file.buffer);

      return this.ensureText(result.text);
    }

    if (
      extension === 'docx' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });

      return this.ensureText(result.value);
    }

    if (textMimeTypes.has(file.mimetype) || extension === 'txt' || extension === 'md') {
      return this.ensureText(file.buffer.toString('utf8'));
    }

    throw new BadRequestException('Unsupported document format');
  }

  private getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() ?? '';
  }

  private ensureText(text: string): string {
    const normalizedText = text.replace(/\u0000/g, '').trim();

    if (!normalizedText) {
      throw new BadRequestException('Document has no readable text');
    }

    return normalizedText;
  }
}
