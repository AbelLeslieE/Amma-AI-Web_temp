import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AmmaSpeechSession,
  MicrophonePermissionRequest,
  speechErrorMessage,
} from '../lib/amma-microphone.ts';

test('permission is requested synchronously on tap and every track is released', async () => {
  const request = new MicrophonePermissionRequest();
  let started = false,
    released = 0;
  const result = request.request(() => {
    started = true;
    return Promise.resolve({
      getTracks: () => [{ stop: () => released++ }, { stop: () => released++ }],
    });
  });
  assert.equal(started, true);
  assert.equal(await result, 'granted');
  assert.equal(released, 2);
});

test('closing a pending permission prompt settles immediately and releases late media', async () => {
  const request = new MicrophonePermissionRequest();
  let release,
    stopped = false;
  const result = request.request(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  request.cancel();
  assert.equal(await result, 'cancelled');
  release({
    getTracks: () => [
      {
        stop: () => {
          stopped = true;
        },
      },
    ],
  });
  await Promise.resolve();
  assert.equal(stopped, true);
});

test('permission denials, absent microphones and busy devices have distinct states', async () => {
  const request = new MicrophonePermissionRequest();
  for (const [name, state] of [
    ['NotAllowedError', 'denied'],
    ['NotFoundError', 'unavailable'],
    ['NotReadableError', 'error'],
  ]) {
    assert.equal(await request.request(() => Promise.reject({ name })), state);
  }
});

function fakeRecognition() {
  return {
    lang: '',
    continuous: true,
    interimResults: false,
    maxAlternatives: 0,
    onresult: null,
    onerror: null,
    onend: null,
    started: 0,
    stopped: 0,
    aborted: 0,
    start() {
      this.started++;
    },
    stop() {
      this.stopped++;
    },
    abort() {
      this.aborted++;
    },
  };
}
const words = (text, isFinal) => ({
  0: { transcript: text },
  length: 1,
  isFinal,
});

test('speech starts in the tap and completes on a mobile engine’s automatic end', () => {
  const r = fakeRecognition();
  const updates = [],
    finished = [];
  const session = new AmmaSpeechSession(r, {
    onTranscript: (...x) => updates.push(x),
    onFinish: (...x) => finished.push(x),
  });
  session.start('ml-IN');
  assert.equal(r.started, 1);
  assert.equal(r.lang, 'ml-IN');
  assert.equal(r.continuous, false);
  r.onresult({ results: [words('അമ്മേ', true), words('വിശക്കുന്നു', false)] });
  assert.deepEqual(updates, [['അമ്മേ', 'വിശക്കുന്നു']]);
  r.onend();
  assert.deepEqual(finished, [['അമ്മേ വിശക്കുന്നു', undefined]]);
  assert.equal(r.onresult, null);
  assert.equal(r.aborted, 1);
});

test('Done speaking recovers even if a mobile engine never emits onend', async () => {
  const r = fakeRecognition();
  let resolve;
  const ended = new Promise((r) => {
    resolve = r;
  });
  const session = new AmmaSpeechSession(
    r,
    { onTranscript() {}, onFinish: (text) => resolve(text) },
    500,
    5,
  );
  session.start('ml-IN');
  r.onresult({ results: [words('അമ്മേ', false)] });
  session.stop();
  session.stop();
  assert.equal(await ended, 'അമ്മേ');
  assert.equal(r.stopped, 1);
  assert.equal(r.aborted, 1);
});

test('leaving the page cancels capture and ignores late transcript/error/end callbacks', () => {
  const r = fakeRecognition();
  let calls = 0;
  const session = new AmmaSpeechSession(r, {
    onTranscript() {
      calls++;
    },
    onFinish() {
      calls++;
    },
  });
  session.start('en-IN');
  const { onresult, onend, onerror } = r;
  session.cancel();
  onresult({ results: [words('late words', true)] });
  onerror({ error: 'network' });
  onend();
  assert.equal(calls, 0);
  assert.equal(r.aborted, 1);
});

test('permission or network failures preserve captured speech and finish exactly once', () => {
  const r = fakeRecognition();
  const finished = [];
  const session = new AmmaSpeechSession(r, {
    onTranscript() {},
    onFinish: (...x) => finished.push(x),
  });
  session.start('ml-IN');
  const oldEnd = r.onend;
  r.onresult({ results: [words('അമ്മേ', true)] });
  r.onerror({ error: 'network' });
  oldEnd();
  assert.deepEqual(finished, [['അമ്മേ', 'network']]);
  assert.match(speechErrorMessage('not-allowed'), /settings/);
  assert.match(speechErrorMessage('language-not-supported'), /dictation/);
});

test('speech start failures and silent engines always recover', async () => {
  const r = fakeRecognition();
  const errors = [];
  r.start = () => {
    throw new Error('engine unavailable');
  };
  new AmmaSpeechSession(r, {
    onTranscript() {},
    onFinish: (_, error) => errors.push(error),
  }).start('ml-IN');
  assert.deepEqual(errors, ['start-failed']);
  assert.equal(r.aborted, 1);
  const silent = fakeRecognition();
  await new Promise((resolve) =>
    new AmmaSpeechSession(
      silent,
      { onTranscript() {}, onFinish: resolve },
      5,
      5,
    ).start('ml-IN'),
  );
  assert.equal(silent.stopped, 1);
  assert.equal(silent.aborted, 1);
});
