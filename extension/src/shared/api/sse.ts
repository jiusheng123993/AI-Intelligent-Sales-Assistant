/**
 * SSE / ReadableStream 工具。
 *
 * A6 阶段主要用于 Mock 流式输出；真实后端接入时可复用 parseSseLines。
 */

/** 将 SSE 文本按 `data:` 行解析为 payload。 */
export function parseSseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
}

/** 将字符串拆为近似流式 chunk，模拟模型逐步输出。 */
export async function* mockTextStream(text: string, chunkSize = 12): AsyncGenerator<string> {
  const safeSize = Math.max(1, Math.min(chunkSize, 100));
  for (let i = 0; i < text.length; i += safeSize) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    yield text.slice(i, i + safeSize);
  }
}
