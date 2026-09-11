import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ammaInstructions,
  isAiRequest,
  parseAiResult,
  speechInstructions,
} from '../lib/amma-ai.ts';
import { personalities, profiles } from '../lib/amma-personalities.ts';
import { achanReply } from '../lib/achan-call.ts';
import { respond } from '../lib/amma-engine.ts';

const context = {
  history: [],
  permissionStep: 0,
  personality: 'Normal Amma',
  mood: 0,
};

test('every Amma has a complete and distinct language and delivery brief', () => {
  const responseStyles = new Set();
  const speechStyles = new Set();
  for (const personality of personalities) {
    const profile = profiles[personality];
    assert.ok(profile.signature.length > 25);
    assert.ok(profile.vocabulary.length >= 4);
    assert.ok(profile.responseStyle.length > 60);
    assert.ok(profile.speechStyle.includes('female voice'));
    assert.ok(profile.achanStyle.length > 40);
    responseStyles.add(profile.responseStyle);
    speechStyles.add(profile.speechStyle);
  }
  assert.equal(responseStyles.size, personalities.length);
  assert.equal(speechStyles.size, personalities.length);
});

test('AI prompt requires equivalent Malayalam, Manglish and English answers', () => {
  const prompt = ammaInstructions('Coimbatore Amma');
  assert.match(prompt, /reply\.ml must be idiomatic Malayalam/);
  assert.match(prompt, /Romanized Malayalam/);
  assert.match(prompt, /Coimbatore Tamil code-switching/);
  assert.match(
    speechInstructions('Thrissur Amma', 'Malayalam'),
    /Thrissur-flavoured Malayalam/,
  );
});

test('AI request and structured response validation reject malformed data', () => {
  const baseline = respond('എനിക്ക് സുഖമാണോ?', context);
  assert.equal(
    isAiRequest({
      input: 'എനിക്ക് സുഖമാണോ?',
      language: 'Malayalam',
      personality: 'Normal Amma',
      mood: 0,
      permissionStep: 0,
      history: [],
      baseline,
    }),
    true,
  );
  assert.equal(isAiRequest({ input: 'hello' }), false);
  assert.equal(
    isAiRequest({
      input: 'hello',
      language: 'English',
      personality: 'Normal Amma',
      mood: 0,
      permissionStep: 99,
      history: [],
      baseline,
    }),
    false,
  );
  assert.equal(parseAiResult({ reply: {}, mood: 1 }), null);
  assert.equal(
    parseAiResult({
      reply: { en: 'Hello', mg: 'Hello', ml: 'Hello' },
      kind: 'Greeting',
      mood: 0,
      logic: 'Greeting.',
      detail: 'Missing Malayalam script.',
    }),
    null,
  );
  assert.deepEqual(
    parseAiResult({
      reply: {
        en: 'Eat first, then we will talk.',
        mg: 'Aadyam kazhikku, ennittu samsaarikkaam.',
        ml: 'ആദ്യം കഴിക്ക്, എന്നിട്ട് സംസാരിക്കാം.',
      },
      kind: 'Care',
      mood: 2,
      logic: 'Food first.',
      detail: 'Natural Malayalam response.',
    }),
    {
      reply: {
        en: 'Eat first, then we will talk.',
        mg: 'Aadyam kazhikku, ennittu samsaarikkaam.',
        ml: 'ആദ്യം കഴിക്ക്, എന്നിട്ട് സംസാരിക്കാം.',
      },
      kind: 'Care',
      mood: 2,
      logic: 'Food first.',
      detail: 'Natural Malayalam response.',
      mode: 'live',
    },
  );
});

test('Achan escalation changes with both personality and declined-call stage', () => {
  for (const personality of personalities) {
    const first = achanReply(personality, 1);
    const angry = achanReply(personality, 5);
    assert.notEqual(first.ml, angry.ml);
    assert.ok(first.ml.length > 25);
    assert.ok(angry.ml.length > 25);
  }
  assert.notEqual(
    achanReply('Thrissur Amma', 2).ml,
    achanReply('NRI Amma', 2).ml,
  );
});
