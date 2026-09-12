import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSpeechCorrection,
  MAX_SPEECH_CORRECTIONS,
  parseSpeechCorrections,
  rememberSpeechCorrection,
  speechCorrectionPrompt,
} from '../lib/amma-corrections.ts';

test('only meaningful transcript edits are learned', () => {
  assert.equal(isSpeechCorrection('amma kazhicho', 'amma kazhicho'), false);
  assert.equal(isSpeechCorrection('  Amma Kazhicho ', 'amma kazhicho'), false);
  assert.equal(isSpeechCorrection('amma kalicho', 'Amma, kazhicho?'), true);
  assert.deepEqual(rememberSpeechCorrection([], '', 'അമ്മേ'), []);
});

test('confirmed corrections are deduplicated, counted and kept most recent', () => {
  const first = rememberSpeechCorrection(
    [],
    'enne aru manik viliko',
    'എന്നെ ആറു മണിക്ക് വിളിക്കോ',
    100,
  );
  const second = rememberSpeechCorrection(
    first,
    'enne aru manik viliko',
    'എന്നെ ആറു മണിക്ക് വിളിക്കോ',
    200,
  );
  assert.equal(second.length, 1);
  assert.equal(second[0].uses, 2);
  assert.equal(second[0].updatedAt, 200);

  let many = second;
  for (let index = 0; index < MAX_SPEECH_CORRECTIONS + 5; index += 1)
    many = rememberSpeechCorrection(
      many,
      `heard ${index}`,
      `corrected ${index}`,
      300 + index,
    );
  assert.equal(many.length, MAX_SPEECH_CORRECTIONS);
  assert.equal(many[0].corrected, `corrected ${MAX_SPEECH_CORRECTIONS + 4}`);
});

test('stored correction data is sanitized before becoming a transcription hint', () => {
  const parsed = parseSpeechCorrections([
    {
      heard: 'thrissur\nword',
      corrected: 'എന്തൂട്ടാ\u0000 കുട്ട്യേ',
      uses: 200,
      updatedAt: 42,
    },
    { heard: 'same', corrected: 'SAME' },
    { heard: '', corrected: 'missing' },
  ]);
  assert.deepEqual(parsed, [
    {
      heard: 'thrissur word',
      corrected: 'എന്തൂട്ടാ കുട്ട്യേ',
      uses: 99,
      updatedAt: 42,
    },
  ]);
  const prompt = speechCorrectionPrompt(parsed);
  assert.match(prompt, /spelling and pronunciation hints/);
  assert.match(prompt, /എന്തൂട്ടാ കുട്ട്യേ/);
  assert.equal(prompt.includes(String.fromCharCode(0)), false);
});
