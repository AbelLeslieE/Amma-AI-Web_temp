import type {
  Language,
  Personality,
  Phrase,
  Result,
  Turn,
} from './amma-engine.ts';
import { personalities, profiles } from './amma-personalities.ts';

export type AiMode = 'live' | 'fallback';

export type AiRequest = {
  input: string;
  language: Language;
  personality: Personality;
  mood: number;
  permissionStep: number;
  history: Pick<Turn, 'input' | 'reply' | 'kind'>[];
  baseline: Result;
};

export type AiResult = Pick<
  Result,
  'reply' | 'kind' | 'mood' | 'logic' | 'detail'
> & { mode: 'live' };

const languages: Language[] = ['Malayalam', 'Manglish', 'English'];

export function isAiRequest(value: unknown): value is AiRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AiRequest>;
  return (
    typeof v.input === 'string' &&
    v.input.trim().length > 0 &&
    v.input.length <= 1000 &&
    languages.includes(v.language as Language) &&
    personalities.includes(v.personality as Personality) &&
    Number.isInteger(v.mood) &&
    Number(v.mood) >= 0 &&
    Number(v.mood) <= 4 &&
    Number.isInteger(v.permissionStep) &&
    Number(v.permissionStep) >= 0 &&
    Number(v.permissionStep) <= 4 &&
    Array.isArray(v.history) &&
    v.history.length <= 12 &&
    v.history.every(
      (turn) =>
        Boolean(turn) &&
        typeof turn === 'object' &&
        Boolean(cleanText(turn.input, 1000)) &&
        Boolean(cleanPhrase(turn.reply)) &&
        Boolean(cleanText(turn.kind, 60)),
    ) &&
    Boolean(v.baseline && cleanPhrase(v.baseline.reply)) &&
    Boolean(cleanText(v.baseline?.kind, 60)) &&
    Boolean(cleanText(v.baseline?.logic, 240)) &&
    Boolean(cleanText(v.baseline?.detail, 360)) &&
    Number.isInteger(v.baseline?.mood) &&
    Number(v.baseline?.mood) >= 0 &&
    Number(v.baseline?.mood) <= 4 &&
    Number.isInteger(v.baseline?.permissionStep) &&
    Number(v.baseline?.permissionStep) >= 0 &&
    Number(v.baseline?.permissionStep) <= 4
  );
}

function cleanText(value: unknown, max = 900) {
  return typeof value === 'string' && value.trim() && value.length <= max
    ? value.trim()
    : null;
}

function cleanPhrase(value: unknown): Phrase | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Phrase>;
  const en = cleanText(v.en),
    mg = cleanText(v.mg),
    ml = cleanText(v.ml);
  return en && mg && ml ? { en, mg, ml } : null;
}

function containsMalayalam(value: string) {
  return /[\u0d00-\u0d7f]/u.test(value);
}

export function parseAiResult(value: unknown): AiResult | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<AiResult>;
  const reply = cleanPhrase(v.reply),
    kind = cleanText(v.kind, 60),
    logic = cleanText(v.logic, 240),
    detail = cleanText(v.detail, 360);
  const mood = Number(v.mood);
  if (
    !reply ||
    !containsMalayalam(reply.ml) ||
    !kind ||
    !logic ||
    !detail ||
    !Number.isInteger(mood)
  )
    return null;
  return {
    reply,
    kind,
    mood: Math.max(0, Math.min(4, mood)),
    logic,
    detail,
    mode: 'live',
  };
}

export function ammaInstructions(personality: Personality) {
  const profile = profiles[personality];
  return `You are ${personality}, a loving, funny Malayali mother in the Amma AI comedy app.

CHARACTER
${profile.responseStyle}
Signature behaviour: ${profile.signature}
Natural vocabulary to use sparingly: ${profile.vocabulary.join(', ')}.

LANGUAGE QUALITY
- Understand Malayalam script, Romanized Malayalam (Manglish), English, and natural code-switching between them.
- reply.ml must be idiomatic Malayalam in Malayalam script. Do not transliterate English sentences into Malayalam letters.
- reply.mg must be readable Romanized Malayalam with natural code-switching for this personality.
- reply.en must be natural English with the same meaning.
- The three replies must carry the same facts, intent, joke, and emotional intensity.
- Keep each reply to 1–4 short sentences. Use regional flavour lightly and respectfully, never as a caricature.

BEHAVIOUR
- Infer the user's meaning directly from userMessage, including Malayalam, Manglish, and code-switching. The baseline may contain only a generic fallback and must not override the meaning you understand.
- Answer the user's actual question helpfully, then add the personality's affectionate Amma reaction.
- Use the supplied baseline as a behavioural anchor only for alarms, the permission game, mood, and existing comedy callbacks.
- Never claim to see the user's location, device, contacts, camera, weather, health, or private activity.
- Never claim a real call was placed. Achan calls are an in-app simulation.
- Do not give dangerous, hateful, sexual, or demeaning replies. For serious safety or health concerns, drop the joke and encourage appropriate real-world help.
- Return only the requested structured object.`;
}

export function speechInstructions(
  personality: Personality,
  language: Language,
  speaker: 'Amma' | 'Achan' = 'Amma',
) {
  const profile = profiles[personality];
  if (speaker === 'Achan')
    return `Use a natural adult male voice. ${profile.achanStyle} Speak clearly in ${language === 'English' ? 'English' : 'Malayalam'}, preserving natural code-switching and pronunciation.`;
  return `${profile.speechStyle} Speak in ${language === 'English' ? 'English' : 'Malayalam'}. Preserve natural code-switching and pronounce Malayalam words as Malayalam, not as English phonetics.`;
}

export const ammaResponseSchema = {
  type: 'json_schema',
  name: 'amma_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: {
        type: 'object',
        additionalProperties: false,
        properties: {
          en: { type: 'string' },
          mg: { type: 'string' },
          ml: { type: 'string' },
        },
        required: ['en', 'mg', 'ml'],
      },
      kind: { type: 'string' },
      mood: { type: 'integer', minimum: 0, maximum: 4 },
      logic: { type: 'string' },
      detail: { type: 'string' },
    },
    required: ['reply', 'kind', 'mood', 'logic', 'detail'],
  },
} as const;
