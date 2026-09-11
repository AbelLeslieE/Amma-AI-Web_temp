import { alarmPhrases } from '../lib/amma-alarm.ts';
import { respond, advice, scenarios } from '../lib/amma-engine.ts';
import {
  personalities,
  profiles,
  personalize,
  voiceKey,
} from '../lib/amma-personalities.ts';
import { achanReply } from '../lib/achan-call.ts';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const entries = new Map();
function add(reply, speaker, stage = 0) {
  for (const [language, text] of [
    ['ml', reply.ml],
    ['en', reply.en],
  ]) {
    const achan = speaker === 'Achan',
      profile = profiles[speaker];
    const voice = achan
      ? language === 'ml'
        ? 'ml-IN-MidhunNeural'
        : 'en-IN-PrabhatNeural'
      : language === 'ml'
        ? 'ml-IN-SobhanaNeural'
        : speaker === 'NRI Amma'
          ? 'en-US-JennyNeural'
          : 'en-IN-NeerjaNeural';
    const rate = achan
      ? ['-8%', '+0%', '+7%', '+13%', '+18%'][stage]
      : profile.rate;
    const pitch = achan
      ? ['-12Hz', '-8Hz', '+0Hz', '+8Hz', '+15Hz'][stage]
      : profile.pitch;
    const key = voiceKey(speaker, language, text);
    const id = createHash('sha256')
      .update([voice, rate, pitch, text].join('|'))
      .digest('hex')
      .slice(0, 20);
    entries.set(key, {
      key,
      id,
      text,
      language,
      voice,
      rate,
      pitch,
      speaker,
      gender: achan ? 'Male' : 'Female',
    });
  }
}
const inputs = [
  ...scenarios.map((s) => s.input),
  'അമ്മേ',
  'നന്ദി',
  'എനിക്ക് വിശക്കുന്നു',
  'എനിക്ക് ക്വാണ്ടം ഫിസിക്സ് പറഞ്ഞു തരാമോ',
];
for (const personality of personalities) {
  const ctx = { history: [], permissionStep: 0, personality, mood: 0 };
  for (const input of inputs) add(respond(input, ctx).reply, personality);
  add(
    respond('Suggest a movie', { ...ctx, history: [{ input: 'ഞാൻ പഠിക്കുകയാണ്' }] })
      .reply,
    personality,
  );
  for (const step of [1, 2, 3])
    add(
      respond('A demo answer', { ...ctx, permissionStep: step }).reply,
      personality,
    );
  for (const reply of advice) add(personalize(reply, personality), personality);
  add(profiles[personality].sample, personality);
  for (const reply of Object.values(alarmPhrases))
    add(personalize(reply, personality), personality);
}
for (const personality of personalities)
  for (let index = 0; index < 5; index++)
    add(achanReply(personality, index + 1), 'Achan', index);
writeFileSync(
  'scripts/voice-lines.json',
  JSON.stringify([...entries.values()], null, 2) + '\n',
);
console.log('Collected', entries.size, 'profile-specific voice clips.');
