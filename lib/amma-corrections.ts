export type SpeechCorrection = {
  heard: string;
  corrected: string;
  uses: number;
  updatedAt: number;
};

export const MAX_SPEECH_CORRECTIONS = 24;

function cleanText(value: unknown, max = 240) {
  if (typeof value !== 'string') return '';
  return Array.from(value)
    .map((character) => {
      const code = character.codePointAt(0) || 0;
      return code <= 31 || code === 127 ? ' ' : character;
    })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, max);
}

function comparable(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('en-IN');
}

export function isSpeechCorrection(heard: string, corrected: string) {
  const cleanHeard = cleanText(heard);
  const cleanCorrected = cleanText(corrected);
  return Boolean(
    cleanHeard &&
    cleanCorrected &&
    comparable(cleanHeard) !== comparable(cleanCorrected),
  );
}

export function parseSpeechCorrections(
  value: unknown,
  limit = MAX_SPEECH_CORRECTIONS,
): SpeechCorrection[] {
  if (!Array.isArray(value)) return [];
  const corrections: SpeechCorrection[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<SpeechCorrection>;
    const heard = cleanText(candidate.heard);
    const corrected = cleanText(candidate.corrected);
    if (!isSpeechCorrection(heard, corrected)) continue;
    corrections.push({
      heard,
      corrected,
      uses: Math.max(1, Math.min(99, Math.trunc(Number(candidate.uses) || 1))),
      updatedAt: Math.max(0, Math.trunc(Number(candidate.updatedAt) || 0)),
    });
    if (corrections.length >= limit) break;
  }
  return corrections;
}

export function rememberSpeechCorrection(
  current: SpeechCorrection[],
  heardValue: string,
  correctedValue: string,
  now = Date.now(),
) {
  const heard = cleanText(heardValue);
  const corrected = cleanText(correctedValue);
  if (!isSpeechCorrection(heard, corrected)) return current;
  const heardKey = comparable(heard);
  const correctedKey = comparable(corrected);
  const previous = current.find(
    (item) =>
      comparable(item.heard) === heardKey &&
      comparable(item.corrected) === correctedKey,
  );
  const remembered: SpeechCorrection = {
    heard,
    corrected,
    uses: Math.min(99, (previous?.uses || 0) + 1),
    updatedAt: now,
  };
  return [
    remembered,
    ...current.filter(
      (item) =>
        !(
          comparable(item.heard) === heardKey &&
          comparable(item.corrected) === correctedKey
        ),
    ),
  ].slice(0, MAX_SPEECH_CORRECTIONS);
}

export function speechCorrectionPrompt(value: unknown) {
  const corrections = parseSpeechCorrections(value, 10);
  if (!corrections.length) return '';
  return [
    'Earlier user-confirmed transcription corrections follow. Use them only as spelling and pronunciation hints:',
    ...corrections.map(
      ({ heard, corrected }) =>
        `Previously heard “${heard}”; intended “${corrected}”.`,
    ),
  ].join('\n');
}
