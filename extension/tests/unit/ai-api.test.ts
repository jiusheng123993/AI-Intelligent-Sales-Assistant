/**
 * ai.api Mock 流式推荐测试。
 */
import { describe, it, expect } from 'vitest';
import { aiApi } from '@shared/api/ai.api';

describe('aiApi.suggest', () => {
  it('按 chunk 回调输出推荐文本', async () => {
    const chunks: string[] = [];
    await aiApi.suggest(
      { contextText: '客户问价格', mode: 'suggest' },
      { onChunk: (c) => { chunks.push(c); } },
    );
    const text = chunks.join('');
    expect(chunks.length).toBeGreaterThan(1);
    expect(text).toContain('推荐回复');
    expect(text).toContain('客户问价格');
  });

  it('不同 mode 生成不同标签', async () => {
    const chunks: string[] = [];
    await aiApi.suggest(
      { contextText: '', mode: 'polish' },
      { onChunk: (c) => { chunks.push(c); } },
    );
    expect(chunks.join('')).toContain('润色表达');
  });
});
