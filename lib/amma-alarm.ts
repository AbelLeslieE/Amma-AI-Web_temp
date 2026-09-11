import { normalizeInput } from './amma-language.ts';
import type { Phrase, Personality } from './amma-engine.ts';
export type AlarmRequest =
  | {
      action: 'set';
      minutes: number;
      tomorrow: boolean;
      assumedMorning: boolean;
    }
  | { action: 'cancel' | 'clarify' };
export type AmmaAlarm = {
  id: string;
  requestedAt: number;
  at: number;
  createdAt: number;
  assumedMorning: boolean;
  personality: Personality;
  language: 'Malayalam' | 'Manglish' | 'English';
  status: 'scheduled' | 'ringing' | 'missed';
  timezone: string;
};
const p = (en: string, mg: string, ml: string): Phrase => ({ en, mg, ml });
export const alarmPhrases = {
  set: p(
    'Alarm set! One hour earlier. You need time to actually get out of bed. Check the time I chose below.',
    'Alarm vechu! Oru manikkoor nerathe. Nee kidakkayil ninnu eneekkaan samayam vende? Samayam thaazhe nokku.',
    'അലാറം വെച്ചു! ഒരു മണിക്കൂർ നേരത്തെ. നീ കിടക്കയിൽ നിന്ന് എഴുന്നേൽക്കാൻ സമയം വേണ്ടേ? ഞാൻ വെച്ച സമയം താഴെ നോക്ക്.',
  ),
  cancel: p(
    'Alarm cancelled. Waking up on time is your responsibility now!',
    'Alarm maatti. Ini samayathu eneekkunnathu ninte utharavaaditham!',
    'അലാറം മാറ്റി. ഇനി സമയത്ത് എഴുന്നേൽക്കുന്നത് നിന്റെ ഉത്തരവാദിത്തം!',
  ),
  clarify: p(
    'What time should I wake you? Say set an alarm for six a.m., or type a time like 6:30 AM. I will set it one hour earlier.',
    'Ethra manikku vilikkanam? Aaru manikku alarm vekku ennu para. Allenkil 6:30 AM ennu type cheyyu. Njan oru manikkoor nerathe vekkum.',
    'എത്ര മണിക്ക് വിളിക്കണം? ആറു മണിക്ക് അലാറം വെക്കൂ എന്നു പറ. അല്ലെങ്കിൽ 6:30 AM എന്നു ടൈപ്പ് ചെയ്യൂ. ഞാൻ ഒരു മണിക്കൂർ നേരത്തെ വെക്കും.',
  ),
  wake: p(
    'Wake up, dear! Yes, it is one hour early. By the time you finish saying five more minutes, it will be the time you asked for. Come on, get up!',
    'Eneekku kutta! Athe, oru manikkoor neratheyaanu. Anju minute koodi ennu paranju theerumbozhekkum nee paranja samayam aakum. Eneekku!',
    'എഴുന്നേൽക്ക് കുട്ടാ! അതെ, ഒരു മണിക്കൂർ നേരത്തെയാണ്. അഞ്ചു മിനിറ്റ് കൂടി എന്നു പറഞ്ഞു തീരുമ്പോഴേക്കും നീ പറഞ്ഞ സമയം ആകും. എഴുന്നേൽക്ക്!',
  ),
};
const words: [RegExp, string][] = [
  [/പന്ത്രണ്ടര/g, '12:30'],
  [/പതിനൊന്നര/g, '11:30'],
  [/പത്തര/g, '10:30'],
  [/ഒമ്പതര/g, '9:30'],
  [/എട്ടര/g, '8:30'],
  [/ഏഴര/g, '7:30'],
  [/ആറര/g, '6:30'],
  [/അഞ്ചര/g, '5:30'],
  [/നാലര/g, '4:30'],
  [/മൂന്നര/g, '3:30'],
  [/രണ്ടര/g, '2:30'],
  [/ഒന്നര/g, '1:30'],
  [/പന്ത്രണ്ട്|പന്ത്രണ്ടു/g, '12'],
  [/പതിനൊന്ന്|പതിനൊന്നു/g, '11'],
  [/പത്ത്|പത്തു/g, '10'],
  [/ഒമ്പത്|ഒമ്പതു|ഒൻപത്/g, '9'],
  [/എട്ട്|എട്ടു/g, '8'],
  [/ഏഴ്|ഏഴു/g, '7'],
  [/ആറ്|ആറു/g, '6'],
  [/അഞ്ച്|അഞ്ചു/g, '5'],
  [/നാല്|നാലു/g, '4'],
  [/മൂന്ന്|മൂന്നു/g, '3'],
  [/രണ്ട്|രണ്ടു/g, '2'],
  [/ഒന്ന്|ഒന്നു/g, '1'],
  [/\btwelve\b/g, '12'],
  [/\beleven\b/g, '11'],
  [/\bten\b/g, '10'],
  [/\bnine\b/g, '9'],
  [/\beight\b/g, '8'],
  [/\bseven\b/g, '7'],
  [/\bsix\b|\baaru\b|\baru\b/g, '6'],
  [/\bfive\b|\banchu\b|\banju\b/g, '5'],
  [/\bfour\b|\bnaalu\b/g, '4'],
  [/\bthree\b|\bmoonnu\b/g, '3'],
  [/\btwo\b|\brandu\b/g, '2'],
  [/\bone\b|\bonnu\b/g, '1'],
];
export function parseAlarm(input: string): AlarmRequest | null {
  let s = normalizeInput(input).replace(
    /(എന്നെ|enne)[,\s]+(?:ഒന്നും|ഒന്ന്|ഒന്നു|onnu)[,\s]+/g,
    '$1 ',
  );
  const alarmIntent =
    /\balarm\b|wake\s*(me|up)|wake me up|അലാറ|അലാം|എഴുന്നേൽപ്പ|എഴുന്നേല്പ|വിളിക്ക|vilikk|eneep|eneek/.test(
      s,
    );
  if (!alarmIntent) return null;
  if (/-\s*\d/i.test(input) || /don't|do not|വെക്കരുത്/.test(s))
    return { action: 'clarify' };
  if (
    /\bcancel\b|\bdelete\b|\bremove\b|turn off|ക്യാൻസൽ|കാൻസൽ|റദ്ദാക്ക|അലാറം.*(വേണ്ട|മാറ്റ്|നിർത്ത്)/.test(
      s,
    )
  )
    return { action: 'cancel' };
  // Do not silently reinterpret relative times, dates, or multiple alarms.
  if (
    /\bin \d|\bminutes?\b|\bhours?\b|\bevery\b|\bdaily\b|\bnext\b|\byesterday\b|\btoday\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|ഇന്ന്|മുപ്പത്|മുപ്പതു|മിനിറ്റ്|മണിക്കൂർ|ദിവസവും|എല്ലാ ദിവസ|ഇന്നലെ|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
      s,
    )
  )
    return { action: 'clarify' };
  const tomorrow = /\btomorrow\b|നാളെ|\bnaale\b/.test(s);
  const midnight = /\bmidnight\b|അർദ്ധരാത്രി/.test(s);
  const pm =
    !midnight &&
    /(?:^|[\s\d])p\.?\s*m\.?\b|\bevening\b|\bafternoon\b|\btonight\b|\bnight\b|വൈകുന്നേരം|ഉച്ച|രാത്രി|\bvaikunneram\b|\brathri\b/.test(
      s,
    );
  const am =
    /(?:^|[\s\d])a\.?\s*m\.?\b|\bmorning\b|രാവിലെ|പുലർച്ച|\braavile\b|\bravile\b/.test(
      s,
    );
  if (am && pm) return { action: 'clarify' };
  if (/\bmidnight\b|അർദ്ധരാത്രി/.test(s))
    s = s.replace(/midnight|അർദ്ധരാത്രി/g, '00:00');
  if (/\bnoon\b/.test(s)) s = s.replace(/noon/g, '12:00 pm');
  for (const [pattern, value] of words) s = s.replace(pattern, value);
  s = s.replace(/half past\s+(\d{1,2})/g, '$1:30');
  const times = [...s.matchAll(/\d+(?::\d+)?/g)];
  if (times.length !== 1 || /quarter|past|to\s+\d|അര.*മണിക്കൂർ/.test(s))
    return { action: 'clarify' };
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(times[0][0]);
  if (!match) return { action: 'clarify' };
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const isPm = pm || /\bnoon\b/.test(normalizeInput(input));
  if (minute > 59 || hour > 23 || ((am || isPm) && (hour < 1 || hour > 12)))
    return { action: 'clarify' };
  const assumedMorning = !am && !isPm && hour >= 1 && hour <= 12;
  if (am || isPm || assumedMorning) hour = (hour % 12) + (isPm ? 12 : 0);
  return {
    action: 'set',
    minutes: hour * 60 + minute,
    tomorrow,
    assumedMorning,
  };
}
export function scheduleAlarm(
  request: Extract<AlarmRequest, { action: 'set' }>,
  now: Date,
  personality: Personality,
  language: AmmaAlarm['language'],
): AmmaAlarm {
  const requested = new Date(now);
  requested.setHours(
    Math.floor(request.minutes / 60),
    request.minutes % 60,
    0,
    0,
  );
  if (request.tomorrow) requested.setDate(requested.getDate() + 1);
  let at = requested.getTime() - 60 * 60 * 1000;
  // Choose the next adjusted time. Never create an already-expired alarm.
  if (!request.tomorrow && at <= now.getTime()) {
    requested.setDate(requested.getDate() + 1);
    at = requested.getTime() - 60 * 60 * 1000;
  }
  return {
    id: `${now.getTime()}-${at}`,
    at,
    requestedAt: requested.getTime(),
    createdAt: now.getTime(),
    assumedMorning: request.assumedMorning,
    personality,
    language,
    status: 'scheduled',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export function tickAlarm(
  alarm: AmmaAlarm | null,
  now: number,
): AmmaAlarm | null {
  if (!alarm || alarm.status === 'missed' || now < alarm.at) return alarm;
  if (now - alarm.at >= 60000) return { ...alarm, status: 'missed' };
  return alarm.status === 'ringing' ? alarm : { ...alarm, status: 'ringing' };
}
export function restoreAlarm(raw: string | null): AmmaAlarm | null {
  try {
    const a = JSON.parse(raw || 'null');
    if (
      !a ||
      typeof a.id !== 'string' ||
      !Number.isFinite(a.at) ||
      !Number.isFinite(a.requestedAt) ||
      !Number.isFinite(a.createdAt) ||
      !Number.isFinite(new Date(a.at).getTime()) ||
      !Number.isFinite(new Date(a.requestedAt).getTime()) ||
      a.requestedAt - a.at !== 3600000 ||
      !['scheduled', 'ringing', 'missed'].includes(a.status) ||
      !['Malayalam', 'Manglish', 'English'].includes(a.language) ||
      ![
        'Normal Amma',
        'Thrissur Amma',
        'Coimbatore Amma',
        'Kottayam Amma',
        'NRI Amma',
        'Exam Season Amma',
      ].includes(a.personality) ||
      typeof a.timezone !== 'string' ||
      typeof a.assumedMorning !== 'boolean'
    )
      return null;
    return a;
  } catch {
    return null;
  }
}
export const alarmTime = (at: number) =>
  new Date(at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
export const alarmDate = (at: number) =>
  new Date(at).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
