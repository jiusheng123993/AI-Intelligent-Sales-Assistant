/**
 * SSE 工具测试。
 */
import { describe, it, expect } from 'vitest';
import { parseSseLines, mockTextStream } from '@shared/api/sse';

describe('sse utilities', () => {
  it('parseSseLines 只解析 data 行', () => {
    const raw = 'event: chunk\ndata: hello\n\ndata: world\nid: 1\n';
    expect(parseSseLines(raw)).toEqual(['hello', 'world']);
  });

  it('parseSseLines 忽略空 data', () => {
    expect(parseSseLines('data:\ndata: ok')).toEqual(['ok']);
  });

  it('mockTextStream 按 chunkSize 输出', async () => {
    const chunks: string[] = [];
    for await (const c of mockTextStream('abcdef', 2)) chunks.push(c);
    expect(chunks).toEqual(['ab', 'cd', 'ef']);
  });
});
