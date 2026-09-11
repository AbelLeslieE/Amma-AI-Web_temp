import test from 'node:test';
import assert from 'node:assert/strict';
import {
  achanReply,
  angerStage,
  callReducer,
  initialCall,
} from '../lib/achan-call.ts';
import {
  personalities,
  profiles,
  personalize,
} from '../lib/amma-personalities.ts';
import { respond, scenarios, advice } from '../lib/amma-engine.ts';
import { findVoiceClip, findAchanClip } from '../lib/amma-voice.ts';

test('a full permission meter starts Achan; every decline produces another, angrier call', () => {
  let ctx = {
    history: [],
    mood: 0,
    permissionStep: 0,
    personality: 'Normal Amma',
  };
  for (const input of ['Can I go out?', 'Town', 'College friends', 'Eight'])
    ctx = { ...ctx, ...respond(input, ctx) };
  assert.equal(ctx.mood, 4);
  let state = callReducer(initialCall, 'start');
  for (let n = 1; n <= 20; n++) {
    assert.equal(state.phase, 'ringing');
    assert.equal(state.attempt, n);
    assert.equal(angerStage(n), Math.min(4, n - 1));
    state = callReducer(state, 'decline');
    assert.equal(state.phase, 'redialing');
    assert.equal(callReducer(state, 'decline'), state);
    state = callReducer(state, 'redial');
  }
});
test('answer and end reject stale redial events; a new episode starts calmly', () => {
  const ringing = callReducer(initialCall, 'start');
  const connected = callReducer(ringing, 'answer');
  assert.equal(connected.phase, 'connected');
  for (const event of ['redial', 'decline', 'start', 'answer'])
    assert.equal(callReducer(connected, event), connected);
  for (const state of [ringing, connected, callReducer(ringing, 'decline')]) {
    const ended = callReducer(state, 'end');
    assert.deepEqual(ended, initialCall);
    assert.equal(callReducer(ended, 'redial'), ended);
    assert.equal(callReducer(ended, 'start').attempt, 1);
  }
});
test('all Achan anger stages have male audio, separate from female Amma voices', () => {
  const files = new Set();
  for (const personality of personalities) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const reply = achanReply(personality, attempt);
      for (const language of ['Malayalam', 'English']) {
        const clip = findAchanClip(reply, language);
        assert.equal(clip?.gender, 'Male');
        files.add(clip.src);
        assert.equal(findVoiceClip(reply, language), null);
      }
      assert.deepEqual(
        findAchanClip(reply, 'Malayalam'),
        findAchanClip(reply, 'Manglish'),
      );
    }
  }
  assert.equal(files.size, 60);
});
test('every personality has distinct recorded delivery and complete scenario, permission, advice and replay coverage', () => {
  const previews = new Set();
  const food = new Set();
  for (const personality of personalities) {
    const ctx = { history: [], permissionStep: 0, mood: 0, personality };
    const replies = [
      ...scenarios.map((s) => respond(s.input, ctx).reply),
      ...['അമ്മേ', 'നന്ദി', 'എനിക്ക് വിശക്കുന്നു', 'Explain quantum physics'].map(
        (input) => respond(input, ctx).reply,
      ),
      ...[1, 2, 3].map(
        (permissionStep) =>
          respond('A demo answer', { ...ctx, permissionStep }).reply,
      ),
      respond('Suggest a movie', {
        ...ctx,
        history: [{ input: 'I am studying' }],
      }).reply,
      ...advice.map((p) => personalize(p, personality)),
      profiles[personality].sample,
    ];
    for (const reply of replies)
      for (const language of ['Malayalam', 'Manglish', 'English']) {
        const clip = findVoiceClip(reply, language, personality);
        assert.ok(clip, `${personality}: ${language}: ${reply.en}`);
        assert.equal(clip.gender, 'Female');
      }
    previews.add(
      findVoiceClip(profiles[personality].sample, 'Malayalam', personality).src,
    );
    food.add(respond('I am not hungry', ctx).reply.ml);
  }
  assert.equal(previews.size, personalities.length);
  assert.equal(food.size, personalities.length);
});
