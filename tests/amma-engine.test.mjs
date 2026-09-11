import test from 'node:test';
import assert from 'node:assert/strict';
import { respond, scenarios, translate } from '../lib/amma-engine.ts';
const base = () => ({
  history: [],
  permissionStep: 0,
  personality: 'Normal Amma',
  mood: 0,
});
test('permission interview asks three questions, then denies; later input is free conversation', () => {
  const context = base();
  for (const [index, input] of [
    'Can I go out?',
    'Thrissur',
    'My college friends',
    'By 8 PM',
  ].entries()) {
    const result = respond(input, context);
    assert.equal(result.kind, 'Permission');
    assert.equal(result.permissionStep, index + 1);
    context.permissionStep = result.permissionStep;
    if (index === 3) assert.match(result.reply.en, /No\. Stay home/);
  }
  assert.equal(respond('My Wi-Fi is broken', context).kind, 'Amma logic');
});
test('movie callback requires a previous study claim', () => {
  const context = base();
  assert.notEqual(respond('Suggest a movie', context).kind, 'Memory callback');
  context.history.push({ input: 'I am studying' });
  assert.equal(respond('Suggest a movie', context).kind, 'Memory callback');
});
test('every advertised scenario has a response in all three languages and valid mood', () => {
  for (const scenario of scenarios) {
    const result = respond(scenario.input, base());
    for (const language of ['English', 'Manglish', 'Malayalam'])
      assert.ok(translate(result.reply, language).length > 8);
    assert.ok(result.mood >= 0 && result.mood <= 4);
    assert.ok(result.detail);
  }
});
test('new context clears memory and permission; personalities change the reply', () => {
  assert.equal(respond('Can I go out?', base()).permissionStep, 1);
  assert.notEqual(respond('Suggest a movie', base()).kind, 'Memory callback');
  for (const personality of [
    'Thrissur Amma',
    'Kottayam Amma',
    'NRI Amma',
    'Exam Season Amma',
  ])
    assert.notEqual(
      respond('I am not hungry', { ...base(), personality }).reply.en,
      respond('I am not hungry', base()).reply.en,
    );
});
test('invalid input is rejected before a response is made', () => {
  assert.throws(() => respond('   ', base()));
  assert.throws(() => respond('x'.repeat(1001), base()));
});
test('Malayalam input routes to relevant scenarios', () => {
  assert.equal(respond('എനിക്ക് വിശപ്പില്ല', base()).kind, 'Food');
  assert.equal(respond('പുറത്ത് പോകട്ടെ', base()).kind, 'Permission');
  assert.equal(respond('മഴ പെയ്യുമോ', base()).kind, 'Amma weather');
});
