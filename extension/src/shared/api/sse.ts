export interface SseEvent {
  event: string;
  data: string;
}

export function parseSseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
}

export async function collectSseEvents(stream: ReadableStream<Uint8Array>): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const event of streamSseEvents(stream)) {
    events.push(event);
  }

  return events;
}

export async function* streamSseEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let isReading = true;
  while (isReading) {
    const { value, done } = await reader.read();
    if (done) {
      isReading = false;
    } else if (value) {
      buffer += decoder.decode(value, { stream: true });
      const result = drainSseBuffer(buffer);
      buffer = result.rest;
      for (const event of result.events) yield event;
    }
  }

  buffer += decoder.decode();
  const result = drainSseBuffer(`${buffer}\n\n`);
  for (const event of result.events) yield event;
}

function drainSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: SseEvent[] = [];

  for (const part of parts) {
    const event = parseSseEvent(part);
    if (event) events.push(event);
  }

  return { events, rest };
}

function parseSseEvent(raw: string): SseEvent | null {
  const lines = raw.split('\n');
  let event = 'message';
  const data: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }

  if (data.length === 0) return null;

  return { event, data: data.join('\n') };
}

export async function* mockTextStream(text: string, chunkSize = 12): AsyncGenerator<string> {
  const safeSize = Math.max(1, Math.min(chunkSize, 100));
  for (let i = 0; i < text.length; i += safeSize) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    yield text.slice(i, i + safeSize);
  }
}
