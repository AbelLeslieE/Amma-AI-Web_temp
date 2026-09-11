import manifest from './voice-manifest.json' with { type: 'json' };
import type { Phrase, Language, Personality } from './amma-engine.ts';
import { profiles, voiceKey } from './amma-personalities.ts';
export type VoiceClip = {
  src: string;
  voice: string;
  language: string;
  gender: string;
  bytes: number;
  sha256: string;
};
export const voiceName = (
  language: Language,
  personality: Personality = 'Normal Amma',
) =>
  `${personality} · Female ${language === 'English' ? 'English' : 'Malayalam'} · ${profiles[personality].rate} pace`;
export function findVoiceClip(
  reply: Phrase,
  language: Language,
  personality: Personality = 'Normal Amma',
): VoiceClip | null {
  // Manglish is a writing style. It must never be spoken by an English voice.
  const text = language === 'English' ? reply.en : reply.ml;
  const clips: Record<string, VoiceClip> = manifest.clips;
  const clip =
    clips[voiceKey(personality, language === 'English' ? 'en' : 'ml', text)];
  if (
    !clip ||
    clip.gender !== 'Female' ||
    clip.language !== (language === 'English' ? 'en' : 'ml')
  )
    return null;
  return clip;
}

export function findAchanClip(
  reply: Phrase,
  language: Language,
): VoiceClip | null {
  const lang = language === 'English' ? 'en' : 'ml';
  const clip = (manifest.clips as Record<string, VoiceClip>)[
    voiceKey('Achan', lang, reply[lang])
  ];
  return clip?.gender === 'Male' && clip.language === lang ? clip : null;
}
