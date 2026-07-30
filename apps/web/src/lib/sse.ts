/** POST 方式的 SSE 客户端（EventSource 不支持 POST，用 fetch + ReadableStream 实现） */
export interface SSEHandlers {
  onEvent: (data: Record<string, unknown>) => void;
  onError?: (err: Error) => void;
  onComplete?: () => void;
}

export async function postSSE(
  url: string,
  body: unknown,
  handlers: SSEHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `请求失败: ${response.statusText}`);
  }
  if (!response.body) throw new Error('响应流不可用');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 按 SSE 协议解析：事件以 \n\n 分隔，数据行以 "data:" 开头
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const dataLines = part
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart());
        if (!dataLines.length) continue;
        try {
          handlers.onEvent(JSON.parse(dataLines.join('\n')));
        } catch {
          // 非 JSON 数据忽略
        }
      }
    }
    handlers.onComplete?.();
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    handlers.onError?.(err as Error);
    throw err;
  }
}
