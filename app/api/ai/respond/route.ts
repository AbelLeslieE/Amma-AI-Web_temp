import {
  ammaInstructions,
  ammaResponseSchema,
  isAiRequest,
  parseAiResult,
} from '@/lib/amma-ai';
import {
  allowRequest,
  clientAddress,
  openAI,
  responseText,
} from '@/lib/openai-server';

export const runtime = 'nodejs';
const MAX_REQUEST_BYTES = 50_000;

export async function POST(request: Request) {
  if (!allowRequest(`reply:${clientAddress(request)}`, 15))
    return Response.json(
      { error: 'Please wait a moment before asking again.' },
      { status: 429 },
    );

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES)
    return Response.json(
      { error: 'Conversation request is too large.' },
      { status: 413 },
    );

  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_REQUEST_BYTES)
    return Response.json(
      { error: 'Conversation request is too large.' },
      { status: 413 },
    );
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  if (!isAiRequest(body))
    return Response.json(
      { error: 'Invalid conversation request.' },
      { status: 400 },
    );

  const response = await openAI('responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini',
      store: false,
      max_output_tokens: 1200,
      instructions: ammaInstructions(body.personality),
      input: JSON.stringify({
        currentLanguage: body.language,
        currentMood: body.mood,
        permissionStep: body.permissionStep,
        recentConversation: body.history.slice(-8),
        userMessage: body.input,
        baselineBehaviour: body.baseline,
      }),
      text: { format: ammaResponseSchema, verbosity: 'low' },
    }),
  }).catch(() => undefined);

  if (response === null)
    return Response.json(
      { error: 'AI is not configured.', code: 'not_configured' },
      { status: 503 },
    );
  if (!response)
    return Response.json(
      { error: 'Amma’s AI response is temporarily unavailable.' },
      { status: 502 },
    );

  const data = (await response.json()) as Parameters<typeof responseText>[0];
  const text = responseText(data);
  let decoded: unknown = null;
  try {
    decoded = text ? JSON.parse(text) : null;
  } catch {
    decoded = null;
  }
  const parsed = parseAiResult(decoded);
  if (!parsed)
    return Response.json(
      { error: 'Amma returned an incomplete response.' },
      { status: 502 },
    );
  return Response.json(parsed, { headers: { 'Cache-Control': 'no-store' } });
}
