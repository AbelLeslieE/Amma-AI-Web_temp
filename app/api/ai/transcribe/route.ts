import { allowRequest, clientAddress, openAI } from '@/lib/openai-server';
import { speechCorrectionPrompt } from '@/lib/amma-corrections';
import { personalities, profiles } from '@/lib/amma-personalities';
import type { Language, Personality } from '@/lib/amma-engine';

export const runtime = 'nodejs';
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  if (!allowRequest(`transcribe:${clientAddress(request)}`, 12))
    return Response.json(
      { error: 'Please wait before recording again.' },
      { status: 429 },
    );
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_AUDIO_BYTES + 1_000_000)
    return Response.json(
      { error: 'Please record a shorter message.' },
      { status: 413 },
    );
  const incoming = await request.formData().catch(() => null);
  const audio = incoming?.get('audio');
  if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES)
    return Response.json(
      { error: 'Please record a shorter message.' },
      { status: 400 },
    );

  const requestedLanguage = incoming?.get('language');
  const languageValue =
    typeof requestedLanguage === 'string' ? requestedLanguage : '';
  const language: Language = ['Malayalam', 'Manglish', 'English'].includes(
    languageValue,
  )
    ? (languageValue as Language)
    : 'Malayalam';
  const requestedPersonality = incoming?.get('personality');
  const personalityValue =
    typeof requestedPersonality === 'string' ? requestedPersonality : '';
  const personality: Personality = personalities.includes(
    personalityValue as Personality,
  )
    ? (personalityValue as Personality)
    : 'Normal Amma';
  let corrections: unknown = [];
  try {
    const storedCorrections = incoming?.get('corrections');
    corrections = JSON.parse(
      typeof storedCorrections === 'string' ? storedCorrections : '[]',
    );
  } catch {
    corrections = [];
  }
  const learnedHints = speechCorrectionPrompt(corrections);
  const profileWords = profiles[personality].vocabulary.join(', ');

  const form = new FormData();
  form.set('file', audio, audio.name || 'amma-question.webm');
  form.set(
    'model',
    process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
  );
  form.set(
    'prompt',
    [
      `A Malayali family conversation. The selected display language is ${language}, but the speaker may naturally mix Malayalam, Romanized Malayalam (Manglish), Tamil, and English. Preserve code-switching and transcribe the words actually spoken.`,
      `Expected family and profile words include അമ്മേ, അച്ഛാ, കഴിച്ചോ, പോകട്ടെ, വിശപ്പില്ല, പഠിക്കുകയാണ്, alarm, Amma, Achan, Kutta, Thrissur, Coimbatore, Kottayam, biriyani, ${profileWords}.`,
      learnedHints,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  const response = await openAI('audio/transcriptions', {
    method: 'POST',
    body: form,
  }).catch(() => undefined);
  if (response === null)
    return Response.json(
      { error: 'AI transcription is not configured.', code: 'not_configured' },
      { status: 503 },
    );
  if (!response)
    return Response.json(
      { error: 'Could not transcribe that recording.' },
      { status: 502 },
    );
  const data = (await response.json()) as { text?: unknown };
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text)
    return Response.json({ error: 'No speech was detected.' }, { status: 422 });
  return Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } });
}
