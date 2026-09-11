import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { respond } from '../lib/amma-engine.ts';
import {
  detectIntent,
  isStudyClaim,
  recognitionTranscript,
} from '../lib/amma-language.ts';
import { findVoiceClip } from '../lib/amma-voice.ts';
import { AmmaAudioPlayer } from '../lib/amma-audio.ts';
const ctx = {
  history: [],
  permissionStep: 0,
  personality: 'Normal Amma',
  mood: 0,
};
const examples = {
  permission: [
    'അമ്മേ ഞാൻ പുറത്തു പൊക്കോട്ടെ',
    'കൂട്ടുകാരുടെ കൂടെ പോകട്ടെ',
    'njan purathu pokatte',
  ],
  food: [
    'അമ്മ എനിക്ക് വിശക്കുന്നില്ല',
    'വിശപ്പില്ല',
    'എനിക്ക് വിശക്കുന്നു',
    'enikku vishappilla',
  ],
  order: ['ബിരിയാണി ഓർഡർ ചെയ്യട്ടെ', 'biriyani order cheyyatte'],
  marks: ['എനിക്ക് തൊണ്ണൂറ്റിരണ്ട് മാർക്ക് കിട്ടി', 'എനിക്ക് ൯൨ ശതമാനം കിട്ടി'],
  weather: ['ഇന്ന് മഴ പെയ്യുമോ', 'ഇന്നത്തെ കാലാവസ്ഥ എങ്ങനെയാ'],
  money: ['ഞാൻ ഇരുനൂറ് രൂപ ചെലവാക്കി', 'എനിക്ക് കുറച്ച് പണം വേണം'],
  location: ['ഞാൻ കോളേജിലാണ്'],
  study: ['ഞാൻ പഠിക്കുകയാണ്', 'നാളെ പരീക്ഷയാണ്'],
  sleep: ['ഞാൻ ഉറങ്ങാൻ പോകുന്നു', 'എനിക്ക് ഉറക്കം വരുന്നില്ല'],
  tech: [
    'വൈഫൈ കിട്ടുന്നില്ല',
    'വൈ ഫൈ വർക്ക് ചെയ്യുന്നില്ല',
    'ലാപ്ടോപ്പ് കേടായി',
    'ഇന്റർനെറ്റ് പ്രവർത്തിക്കുന്നില്ല',
  ],
  relationship: ['അവൾ വെറും കൂട്ടുകാരിയാണ്'],
  movie: ['ഒരു നല്ല സിനിമ പറയാമോ'],
  greeting: ['അമ്മേ', 'ഹലോ'],
  thanks: ['അമ്മേ നന്ദി'],
};
for (const [intent, inputs] of Object.entries(examples))
  test('Malayalam recognition: ' + intent, () => {
    for (const input of inputs)
      assert.equal(detectIntent(input), intent, input);
  });
test('unknown Malayalam asks clarification instead of inventing a phone diagnosis', () => {
  assert.equal(respond('പ്രകാശസംശ്ലേഷണം വിശദീകരിക്കാമോ', ctx).kind, 'Clarification');
});
test('study contradictions do not mislabel exams, negations, or questions as studying', () => {
  for (const input of [
    'I have an exam tomorrow',
    'I am not studying',
    'ഞാൻ പഠിക്കുന്നില്ല',
    'നാളെ പരീക്ഷയാണ്',
  ])
    assert.equal(isStudyClaim(input), false);
  assert.equal(isStudyClaim('ഞാൻ ഇപ്പോൾ പഠിക്കുകയാണ്'), true);
  assert.equal(
    respond('സിനിമ കാണണം', { ...ctx, history: [{ input: 'ഞാൻ പഠിക്കുകയാണ്' }] }).kind,
    'Memory callback',
  );
});
test('Manglish and Malayalam always use the same native female recording', () => {
  const p = respond('അമ്മേ', ctx).reply;
  const ml = findVoiceClip(p, 'Malayalam'),
    mg = findVoiceClip(p, 'Manglish'),
    en = findVoiceClip(p, 'English');
  assert.deepEqual(ml, mg);
  assert.equal(ml.voice, 'ml-IN-SobhanaNeural');
  assert.equal(en.voice, 'en-IN-NeerjaNeural');
  assert.notEqual(ml.src, en.src);
  assert.equal(
    findVoiceClip({ ml: 'missing', en: 'missing', mg: 'missing' }, 'Manglish'),
    null,
  );
});
test('all generated clips have the correct speaker metadata, MP3 frames, correct hashes and payload sizes', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../lib/voice-manifest.json', import.meta.url)),
  );
  const lines = JSON.parse(
    readFileSync(new URL('../scripts/voice-lines.json', import.meta.url)),
  );
  for (const line of lines) {
    const clip = manifest.clips[line.key];
    assert.ok(clip, line.text);
    assert.equal(clip.gender, line.speaker === 'Achan' ? 'Male' : 'Female');
    assert.equal(clip.speaker, line.speaker);
    assert.equal(clip.rate, line.rate);
    assert.equal(clip.pitch, line.pitch);
    const data = readFileSync(new URL('../public' + clip.src, import.meta.url));
    assert.ok(data.length > 1000);
    assert.equal(data.length, clip.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), clip.sha256);
    assert.ok(
      data.subarray(0, 2)[0] === 0xff ||
        data.subarray(0, 3).toString() === 'ID3',
    );
  }
});
const result = (text, final) => ({
  0: { transcript: text },
  length: 1,
  isFinal: final,
});
test('recognition accumulates final segments, replaces interim text, and never duplicates it', () => {
  const first = recognitionTranscript([
    result('അമ്മേ', true),
    result('ഞാൻ പുറ', false),
  ]);
  assert.equal(first.final, 'അമ്മേ');
  assert.equal(first.interim, 'ഞാൻ പുറ');
  const next = recognitionTranscript([
    result('അമ്മേ', true),
    result('ഞാൻ പുറത്തു പോകട്ടെ', true),
  ]);
  assert.equal(next.final, 'അമ്മേ ഞാൻ പുറത്തു പോകട്ടെ');
  assert.equal(next.interim, '');
  assert.equal(recognitionTranscript([]).final, '');
});
function fakeAudio() {
  return {
    src: '',
    playbackRate: 1,
    currentTime: 0,
    onended: null,
    onerror: null,
    play: () => Promise.resolve(),
    pause() {},
    load() {},
  };
}
test('replay cancels previous audio and ignores its stale ended callback', async () => {
  const a = fakeAudio(),
    player = new AmmaAudioPlayer(a);
  const first = player.play('/a.mp3', 1),
    stale = a.onended;
  const second = player.play('/b.mp3', 1.1);
  assert.equal(await first, 'cancelled');
  stale();
  assert.equal(a.src, '/b.mp3');
  a.onended();
  assert.equal(await second, 'ended');
  player.stop();
});
test('stop settles pending playback and blocks late callbacks', async () => {
  const a = fakeAudio(),
    player = new AmmaAudioPlayer(a);
  const p = player.play('/a.mp3', 1);
  player.stop();
  assert.equal(await p, 'cancelled');
  assert.equal(a.onended, null);
});
test('autoplay rejection and network failure exit the busy state', async () => {
  const a = fakeAudio();
  a.play = () =>
    Promise.reject(
      Object.assign(new Error('blocked'), { name: 'NotAllowedError' }),
    );
  const player = new AmmaAudioPlayer(a);
  assert.equal(await player.play('/a.mp3', 1), 'blocked');
  a.play = () => Promise.resolve();
  const next = player.play('/b.mp3', 1);
  a.onerror();
  assert.equal(await next, 'error');
});
test('stalled audio times out and speed is bounded', async () => {
  const a = fakeAudio(),
    player = new AmmaAudioPlayer(a, 10);
  const p = player.play('/a.mp3', 100);
  assert.equal(a.playbackRate, 1.25);
  assert.equal(await p, 'timeout');
});
