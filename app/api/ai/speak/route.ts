import { personalities } from '@/lib/amma-personalities';
import { speechInstructions } from '@/lib/amma-ai';
import type { Language, Personality } from '@/lib/amma-engine';
import { allowRequest, clientAddress, openAI } from '@/lib/openai-server';

export const runtime = 'nodejs';
const MAX_REQUEST_BYTES = 10_000;
type SpeechRequest = {
  text?: unknown;
  language?: unknown;
  personality?: unknown;
  speaker?: unknown;
};

export async function POST(request: Request) {
  if (!allowRequest(`speech:${clientAddress(request)}`, 20))
    return Response.json(
      { error: 'Please wait before replaying again.' },
      { status: 429 },
    );
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES)
    return Response.json(
      { error: 'Speech request is too large.' },
      { status: 413 },
    );
  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_REQUEST_BYTES)
    return Response.json(
      { error: 'Speech request is too large.' },
      { status: 413 },
    );
  let body: SpeechRequest | null = null;
  try {
    body = JSON.parse(raw) as SpeechRequest;
  } catch {
    body = null;
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const language = body?.language as Language;
  const personality = body?.personality as Personality;
  const speaker = body?.speaker === 'Achan' ? 'Achan' : 'Amma';
  if (
    !text ||
    text.length > 1200 ||
    !['Malayalam', 'Manglish', 'English'].includes(language) ||
    !personalities.includes(personality)
  )
    return Response.json({ error: 'Invalid speech request.' }, { status: 400 });

  const response = await openAI('audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice:
        speaker === 'Achan'
          ? process.env.OPENAI_ACHAN_VOICE || 'onyx'
          : process.env.OPENAI_AMMA_VOICE || 'coral',
      input: text,
      instructions: speechInstructions(personality, language, speaker),
      response_format: 'mp3',
    }),
  }).catch(() => undefined);
  if (response === null)
    return Response.json(
      { error: 'AI speech is not configured.', code: 'not_configured' },
      { status: 503 },
    );
  if (!response)
    return Response.json(
      { error: 'Could not generate speech.' },
      { status: 502 },
    );
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=300',
      'X-AI-Generated-Voice': 'true',
    },
  });
}
