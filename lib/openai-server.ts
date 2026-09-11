type OpenAITextResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const windows = new Map<string, { started: number; count: number }>();

export function clientAddress(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local'
  );
}

export function allowRequest(key: string, limit: number, now = Date.now()) {
  if (windows.size > 5_000) {
    for (const [storedKey, window] of windows)
      if (now - window.started >= 60_000) windows.delete(storedKey);
    if (windows.size > 5_000) windows.delete(windows.keys().next().value ?? '');
  }
  const existing = windows.get(key);
  if (!existing || now - existing.started >= 60_000) {
    windows.set(key, { started: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= limit;
}

export function apiKey() {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

export async function openAI(path: string, init: RequestInit) {
  const key = apiKey();
  if (!key) return null;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${key}`);
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as OpenAITextResponse | null;
    throw new Error(
      body?.error?.message || `OpenAI request failed (${response.status}).`,
    );
  }
  return response;
}

export function responseText(body: OpenAITextResponse) {
  if (body.output_text) return body.output_text;
  for (const item of body.output || [])
    for (const content of item.content || [])
      if (content.type === 'output_text' && content.text) return content.text;
  return '';
}
