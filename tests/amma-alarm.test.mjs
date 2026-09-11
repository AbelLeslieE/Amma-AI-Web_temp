import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAlarm,
  scheduleAlarm,
  tickAlarm,
  restoreAlarm,
  alarmPhrases,
} from '../lib/amma-alarm.ts';
import { respond } from '../lib/amma-engine.ts';
import { personalities, personalize } from '../lib/amma-personalities.ts';
import { findVoiceClip } from '../lib/amma-voice.ts';
const schedule = (input, now = new Date(2026, 8, 6, 12, 0)) =>
  scheduleAlarm(parseAlarm(input), now, 'Normal Amma', 'Malayalam');
test('English, Malayalam and Manglish wake requests understand six as 6 AM', () => {
  for (const input of [
    'Set the alarm for 6 a.m.',
    'Wake me up at six in the morning',
    'അമ്മോ, എന്നെ ഒന്നും, ആറു മണിക്ക് വിളിക്കോ',
    'അമ്മേ എന്നെ രാവിലെ ആറുമണിക്ക് വിളിക്കണം',
    'ആറു മണിക്ക് വിളിക്കോ',
    'രാവിലെ ൬ മണിക്ക് അലാറം വെക്കൂ',
    'Amma enne aaru manikku vilikko',
  ]) {
    assert.equal(parseAlarm(input)?.action, 'set', input);
    assert.equal(parseAlarm(input)?.minutes, 360, input);
  }
});
test('AM, PM, midnight, noon, 24-hour and half-hour times are distinct', () => {
  for (const [input, minutes] of [
    ['alarm 6am', 360],
    ['alarm 6pm', 1080],
    ['alarm 6:30p.m.', 1110],
    ['alarm 12 AM', 0],
    ['alarm 12 PM', 720],
    ['alarm midnight', 0],
    ['alarm noon', 720],
    ['alarm 18:15', 1095],
    ['ആറര മണിക്ക് വിളിക്കോ', 390],
    ['wake me at half past six', 390],
  ])
    assert.equal(parseAlarm(input)?.minutes, minutes, input);
});
test('invalid, missing, relative and multiple times cannot silently create an alarm', () => {
  for (const input of [
    'set an alarm',
    'alarm 25:00',
    'alarm 6:99',
    'alarm 6:3',
    'alarm 13 PM',
    'alarm 6 and 7 AM',
    'alarm in 5 minutes',
    'alarm tomorrow at 6 AM and 6 PM',
    'set alarm -6',
    'do not set an alarm for 6',
    'wake me in an hour',
  ])
    assert.equal(parseAlarm(input)?.action, 'clarify', input);
  assert.equal(parseAlarm('I am not hungry'), null);
  assert.equal(parseAlarm('Cancel my alarm')?.action, 'cancel');
  assert.equal(parseAlarm('അലാറം റദ്ദാക്കൂ')?.action, 'cancel');
});
test('the saved alarm is exactly one hour earlier, retaining minutes and local date boundaries', () => {
  const a = schedule('alarm 6 AM');
  assert.equal(new Date(a.at).getHours(), 5);
  assert.equal(new Date(a.at).getDate(), 7);
  assert.equal(a.requestedAt - a.at, 3600000);
  const half = schedule('alarm 6:30 PM');
  assert.equal(new Date(half.at).getHours(), 17);
  assert.equal(new Date(half.at).getMinutes(), 30);
  const midnight = schedule('alarm tomorrow at 12:30 AM');
  assert.equal(new Date(midnight.at).getDate(), 6);
  assert.equal(new Date(midnight.at).getHours(), 23);
  assert.equal(new Date(midnight.requestedAt).getDate(), 7);
});
test('when the adjusted time has passed, schedule the next occurrence instead of immediately ringing', () => {
  const a = schedule('alarm 6 AM', new Date(2026, 8, 6, 5, 30));
  assert.equal(new Date(a.at).getDate(), 7);
  const b = schedule('alarm 6 AM', new Date(2026, 8, 6, 4, 59));
  assert.equal(new Date(b.at).getDate(), 6);
});
test('alarm tick rings once in its window, stops after a minute and marks slept-through alarms missed', () => {
  const a = schedule('alarm 6 AM');
  assert.equal(tickAlarm(a, a.at - 1), a);
  const ringing = tickAlarm(a, a.at);
  assert.equal(ringing.status, 'ringing');
  assert.equal(tickAlarm(ringing, a.at + 1000), ringing);
  assert.equal(tickAlarm(ringing, a.at + 60000).status, 'missed');
  assert.equal(tickAlarm(a, a.at + 3600000).status, 'missed');
  assert.equal(tickAlarm(null, a.at), null);
});
test('persisted alarm survives reload; corrupt storage is ignored', () => {
  const a = schedule('alarm 6 AM');
  assert.deepEqual(restoreAlarm(JSON.stringify(a)), a);
  for (const raw of [
    null,
    'oops',
    '{}',
    JSON.stringify({ ...a, at: 'tomorrow' }),
    JSON.stringify({ ...a, personality: 'Other' }),
  ])
    assert.equal(restoreAlarm(raw), null);
});
test('alarm commands override an active permission interview without advancing it, and all voices exist', () => {
  for (const personality of personalities) {
    const result = respond('Set an alarm for 6 AM', {
      history: [],
      mood: 2,
      permissionStep: 2,
      personality,
    });
    assert.equal(result.kind, 'Alarm');
    assert.equal(result.permissionStep, 2);
    assert.equal(result.alarmRequest.minutes, 360);
    for (const p of Object.values(alarmPhrases))
      for (const language of ['Malayalam', 'English', 'Manglish'])
        assert.ok(
          findVoiceClip(personalize(p, personality), language, personality),
        );
  }
});
