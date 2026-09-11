import { parseAlarm, alarmPhrases, type AlarmRequest } from './amma-alarm.ts';
import { personalize } from './amma-personalities.ts';
import { detectIntent, isStudyClaim, normalizeInput } from './amma-language.ts';
export type Language = 'Manglish' | 'English' | 'Malayalam';
export type Personality =
  | 'Normal Amma'
  | 'Thrissur Amma'
  | 'Coimbatore Amma'
  | 'Kottayam Amma'
  | 'NRI Amma'
  | 'Exam Season Amma';
export type Phrase = { en: string; mg: string; ml: string };
export type Turn = {
  id: number;
  input: string;
  reply: Phrase;
  kind: string;
  mood: number;
  logic: string;
  time: number;
  detail: string;
  language: Language;
  personality?: Personality;
  source?: 'ai' | 'scripted';
  voiceReply?: Phrase;
};
export type Context = {
  history: Turn[];
  permissionStep: number;
  personality: Personality;
  mood: number;
};
export type Result = {
  alarmRequest?: AlarmRequest;
  voiceReply?: Phrase;
  reply: Phrase;
  kind: string;
  mood: number;
  logic: string;
  permissionStep: number;
  detail: string;
};
const phrase = (en: string, mg: string, ml: string): Phrase => ({ en, mg, ml });
export const translate = (p: Phrase, language: Language) =>
  p[language === 'English' ? 'en' : language === 'Malayalam' ? 'ml' : 'mg'];
export const moods = [
  {
    name: 'Suspiciously calm',
    sub: 'Enjoy it while it lasts.',
    face: '◡',
    color: '#9cad7a',
  },
  {
    name: 'A little suspicious',
    sub: 'There will be follow-up questions.',
    face: '⌐',
    color: '#c7b56c',
  },
  {
    name: 'Deeply disappointed',
    sub: 'The silence says everything.',
    face: '−',
    color: '#d2a05f',
  },
  {
    name: 'Officially angry',
    sub: 'Full name. Full volume.',
    face: '⌢',
    color: '#cc7951',
  },
  {
    name: 'Wait until Achan…',
    sub: 'Pretend escalation. No real calls.',
    face: '!',
    color: '#b45243',
  },
];
export const scenarios = [
  {
    id: 'permission',
    emoji: '🚪',
    title: '“Can I go out?”',
    input: 'Can I go out with friends?',
    desc: 'The interrogation begins.',
    category: 'Permission',
  },
  {
    id: 'food',
    emoji: '🍚',
    title: '“I’m not hungry.”',
    input: 'I am not hungry',
    desc: 'That was never an option.',
    category: 'Food',
  },
  {
    id: 'marks',
    emoji: '📚',
    title: '“I got 92%!”',
    input: 'I got 92% in my exam',
    desc: 'But Shobha aunty’s son…',
    category: 'Comparison',
  },
  {
    id: 'tech',
    emoji: '📱',
    title: '“My Wi-Fi isn’t working.”',
    input: 'My Wi-Fi is not working',
    desc: 'Somehow, it’s your phone.',
    category: 'Amma logic',
  },
  {
    id: 'study',
    emoji: '📝',
    title: '“I’m studying.”',
    input: 'I am studying',
    desc: 'A claim she will remember.',
    category: 'Memory',
  },
  {
    id: 'movie',
    emoji: '🎬',
    title: '“Suggest a movie.”',
    input: 'Suggest a movie to watch',
    desc: 'Try this after “I’m studying.”',
    category: 'Memory',
  },
  {
    id: 'weather',
    emoji: '☂️',
    title: '“Will it rain?”',
    input: 'What is the weather? Will it rain?',
    desc: 'Take an umbrella. End of forecast.',
    category: 'Weather',
  },
  {
    id: 'money',
    emoji: '💸',
    title: '“I only spent ₹200.”',
    input: 'I only spent ₹200',
    desc: 'Her estimate may differ.',
    category: 'Lie detector',
  },
  {
    id: 'friend',
    emoji: '👀',
    title: '“She’s just a friend.”',
    input: 'She is just a friend',
    desc: 'That “just” is doing a lot.',
    category: 'Relationship',
  },
  {
    id: 'location',
    emoji: '📍',
    title: '“I’m at college.”',
    input: 'I am at college',
    desc: 'A completely imaginary investigation.',
    category: 'Location',
  },
  {
    id: 'sleep',
    emoji: '🌙',
    title: '“I’ll sleep at 2 AM.”',
    input: 'I will sleep at 2 AM',
    desc: 'And who will wake you up?',
    category: 'Sleep',
  },
  {
    id: 'order',
    emoji: '🍛',
    title: '“Can I order biriyani?”',
    input: 'Can I order biriyani?',
    desc: 'There is food at home.',
    category: 'Food',
  },
];
export function respond(input: string, ctx: Context): Result {
  const s = normalizeInput(input);
  const intent = detectIntent(s);
  if (!s || s.length > 1000)
    throw new Error('Please use between 1 and 1,000 characters.');
  const alarmRequest = parseAlarm(input);
  if (alarmRequest) {
    const reply = personalize(
      alarmPhrases[alarmRequest.action],
      ctx.personality,
    );
    return {
      reply,
      alarmRequest,
      kind: 'Alarm',
      mood: ctx.mood,
      permissionStep: ctx.permissionStep,
      logic:
        'Your requested time minus one hour. Amma allows for five more minutes.',
      detail: 'The adjusted alarm time is shown in Amma’s alarm clock below.',
    };
  }
  let kind = 'Clarification',
    mood = Math.min(3, ctx.mood + 1),
    permissionStep = ctx.permissionStep,
    logic =
      'This demo did not recognize the request. Asking for clarification.',
    detail =
      'Amma confidence: 100%. Scientific evidence: 0%. These are joke scores.';
  let reply = phrase(
    'I did not quite understand that. Are you asking about food, studies, going out, or something else? Try saying it another way.',
    'Kutta, athu vyakthamaayilla. Bhakshanam, paditham, atho purathu pokunna kaaryamaano? Onnukoodi parayamo?',
    'കുട്ടാ, പറഞ്ഞത് വ്യക്തമായില്ല. ഭക്ഷണത്തിന്റെ കാര്യമാണോ, പഠിത്തമാണോ, അതോ പുറത്തു പോകാനാണോ? ഒന്നു കൂടി പറയാമോ?',
  );
  if (permissionStep > 0 && permissionStep < 4) {
    kind = 'Permission';
    mood = Math.min(4, permissionStep + 1);
    const questions = [
      phrase('Where are you going?', 'Evideya pokunne?', 'എവിടെയാ പോകുന്നത്?'),
      phrase(
        'With whom? Which friends exactly?',
        'Aaru koode? Ethu friends?',
        'ആരൊക്കെയാ കൂടെ വരുന്നത്? ഏതു കൂട്ടുകാരാ?',
      ),
      phrase(
        'What time will you be back? And do not say “soon”.',
        'Ethra manikku thirichu varum? Udane ennu parayaruthu.',
        'എത്ര മണിക്ക് തിരിച്ചു വരും? ഉടനെ എന്നൊന്നും പറയണ്ട. സമയം കൃത്യമായി പറയണം.',
      ),
      phrase(
        'No. Stay home. You could have studied in the time it took to ask.',
        'Venda. Veettil irunnaal mathi. Ithrayum neram kondu padikkamayirunnu.',
        'വേണ്ട. വീട്ടിൽ ഇരുന്നാൽ മതി. ഇത്രയും നേരം കൊണ്ട് പഠിക്കാമായിരുന്നു.',
      ),
    ];
    reply = questions[permissionStep];
    permissionStep += 1;
    logic =
      permissionStep === 4
        ? 'All answers reviewed. Decision was made before you asked.'
        : 'One answer. Another question.';
    detail =
      permissionStep === 4
        ? 'PERMISSION DENIED · 100% maternal certainty · You may download your rejection certificate at the permission desk.'
        : `Investigation ${permissionStep} of 3. Amma is collecting unnecessary evidence.`;
  } else if (intent === 'permission') {
    kind = 'Permission';
    mood = 1;
    permissionStep = 1;
    reply = phrase(
      'Where are you going?',
      'Evideya pokunne?',
      'എവിടെയാ പോകുന്നത്?',
    );
    logic = 'Outside detected. Investigation opened.';
    detail = 'First question of 3 · Destination, companions, return time.';
  } else if (
    intent === 'movie' &&
    ctx.history.some((t) => isStudyClaim(t.input))
  ) {
    kind = 'Memory callback';
    mood = 3;
    reply = phrase(
      'Weren’t you studying a moment ago? That was a very short syllabus.',
      'Ippo padikkunnu ennalle paranjathu? Ithra pettennu syllabus kazhinjo?',
      'ഇപ്പോൾ പഠിക്കുന്നു എന്നല്ലേ പറഞ്ഞത്? ഇത്ര പെട്ടെന്ന് സിലബസ് കഴിഞ്ഞോ?',
    );
    logic = 'Earlier study claim + movie request = caught in 4K.';
    detail =
      'An earlier study claim was found in this conversation. No activity outside this app is monitored.';
  } else if (intent === 'relationship') {
    kind = 'Relationship detector';
    mood = 3;
    reply = phrase(
      'Just a friend? Do their parents know about this “just”? Where is their house?',
      'Just friend aano? Veettil ariyamo ee just? Veedu evideya?',
      'വെറും കൂട്ടുകാരിയാണോ? അങ്ങനെയാണെങ്കിൽ വീട്ടിൽ അറിയാമല്ലോ? അവളുടെ വീട് എവിടെയാ?',
    );
    logic = 'The word “just” has raised several questions.';
    detail =
      'Imaginary suspicion score: 96%. This is a joke, not a prediction about your relationship.';
  } else if (intent === 'food') {
    kind = 'Food';
    mood = 2;
    reply = phrase(
      'Not hungry? Have a little rice first. Then you can decide whether you are hungry.',
      'Vishappille? Kurachu chor kazhikku. Ennittu theerumanikkam.',
      'വിശപ്പില്ലേ? കുറച്ചു ചോറ് കഴിക്ക്. എന്നിട്ട് തീരുമാനിക്കാം.',
    );
    logic = '“Not hungry” translated to “please serve more rice”.';
    detail =
      'Amma’s menu: rice, fish curry, thoran, and one banana just in case.';
  } else if (intent === 'order') {
    kind = 'Food';
    mood = 2;
    reply = phrase(
      'There is food at home! Does money grow on the curry-leaf tree?',
      'Veettil food undakki vechittundallo. Paisa marathil aano undavunne?',
      'വീട്ടിൽ ഭക്ഷണം ഉണ്ടാക്കി വെച്ചിട്ടുണ്ടല്ലോ. പൈസ മരത്തിലാണോ ഉണ്ടാവുന്നത്?',
    );
    logic = 'Outside food detected. Home food is automatically superior.';
    detail = 'Recommended alternative: whatever is already in the kitchen.';
  } else if (intent === 'marks') {
    kind = 'Neighbour comparison';
    mood = 2;
    reply = phrase(
      'Very good. But Shobha aunty’s son got 99. I am not comparing, of course.',
      'Nallatha. Pakshe Shobha auntyde mon 99 kitti. Njan compare cheyyunnilla ketto.',
      'നന്നായി, മോനേ. പക്ഷേ ശോഭ ആന്റിയുടെ മോന് തൊണ്ണൂറ്റൊമ്പത് കിട്ടിയല്ലോ. ഞാൻ താരതമ്യം ചെയ്യുന്നതല്ല കേട്ടോ.',
    );
    logic = 'Achievement received. Fictional neighbour found.';
    detail =
      'Fictional match: Appu · 99% · Apparently preparing for UPSC while studying MBBS. Amma satisfaction: 4% (a joke).';
  } else if (intent === 'weather') {
    kind = 'Amma weather';
    mood = 0;
    reply = phrase(
      'It might rain. Take an umbrella, water, food, and call me when you reach. Even if it is next door.',
      'Mazha varum. Kuda, vellam, food ellam edutho. Ethiyal vilikkanam.',
      'മഴ വരും. കുട, വെള്ളം, ഭക്ഷണം എല്ലാം എടുത്തോ. എത്തിയാൽ വിളിക്കണം.',
    );
    logic = 'Any destination requires a full emergency packing list.';
    detail =
      'Umbrella · Water bottle · Lunch · Power bank · Call when you arrive. A joke forecast; no live weather data.';
  } else if (intent === 'money') {
    kind = 'Lie detector';
    mood = 3;
    reply = phrase(
      'Only that much? Show me the bill. And the bill you hid inside the other bill.',
      'Athre chelavayullu? Bill kaanikku. Athinte ullil olippicha billum.',
      'അത്രേ ചെലവായുള്ളൂ? ബിൽ കാണിക്ക്. അതിന്റെ ഉള്ളിൽ ഒളിപ്പിച്ച ബില്ലും.',
    );
    logic = '“Only” detected before an amount. Suspicion multiplied.';
    detail =
      'Amma’s completely invented spending estimate: ₹1,847. No financial data or accounts are accessed.';
  } else if (intent === 'location') {
    kind = 'Location simulator';
    mood = 2;
    reply = phrase(
      'At college? Why is it so quiet? Send proof. Actually, come home.',
      'College-il aano? Enthoru nishabdatha? Proof ayakku. Allenkil veettil vaa.',
      'കോളേജിലാണോ? പിന്നെന്താ ചുറ്റും ഒരു ശബ്ദവുമില്ലാത്തത്? കൂട്ടുകാരുടെ കൂടെ ചായക്കടയിൽ പോയിരിക്കുകയാണോ?',
    );
    logic = 'Location claim accepted as an invitation to doubt it.';
    detail =
      'Imaginary locations: college 3%, tea shop 12%, “with friends” 35%, suspicious activities 50%. No GPS is used.';
  } else if (intent === 'study') {
    kind = 'Study claim';
    mood = 1;
    reply = phrase(
      'Studying? Good. I am remembering this. There had better not be a movie request in five minutes.',
      'Padikkuvano? Nallathu. Njan orthuvekkum. Anju minute kazhinju cinema ennu parayaruthu.',
      'പഠിക്കുകയാണോ? നല്ല കാര്യം. ഞാനിത് ഓർത്തുവെച്ചോളാം. അഞ്ചു മിനിറ്റ് കഴിഞ്ഞ് സിനിമ കാണണം എന്നു പറയരുത്.',
    );
    logic = 'Study claim saved. Future contradictions will be remembered.';
    detail = 'Try “Suggest a movie” next to see Amma’s memory callback.';
  } else if (intent === 'sleep') {
    kind = 'Sleep';
    mood = 3;
    reply = phrase(
      'Sleep late, wake up late, then blame the alarm. Put that phone away and go to bed.',
      'Vaiki urangum, vaiki eneekkum. Ennittu alarm-inu kuttam. Phone maatti vechu urangikko.',
      'വൈകി ഉറങ്ങും, വൈകി എഴുന്നേൽക്കും. എന്നിട്ട് അലാറത്തിന് കുറ്റം. ഫോൺ മാറ്റിവെച്ച് ഉറങ്ങിക്കോ.',
    );
    logic = 'Sleep problem traced to the phone. As expected.';
    detail = 'Amma bedtime: five minutes ago.';
  } else if (intent === 'tech') {
    kind = 'Amma logic';
    mood = 2;
    reply = phrase(
      'That is what happens when you stare at that phone all day. Go outside for once.',
      'Full time phone-il nokki irunnal ingane thanne. Purathu poyi irikku.',
      'എപ്പോഴും ആ ഫോണിൽ നോക്കിയിരുന്നാൽ ഇങ്ങനെയൊക്കെ തന്നെ. അതൊന്ന് മാറ്റിവെച്ച് വേറെ വല്ലതും ചെയ്യ്.',
    );
    logic = 'Technical problem → excessive phone use → case closed.';
    detail =
      'Troubleshooting steps completed: 0. Confidence in diagnosis: 100% (for comedy only).';
  }

  if (permissionStep === ctx.permissionStep && kind === 'Clarification') {
    if (intent === 'movie') {
      kind = 'Movie';
      mood = 1;
      logic = 'Movie request received. Amma has a better use for your time.';
      reply = phrase(
        'A movie? Have you finished all your work? Finish that first, then we can talk.',
        'Cinema kaanano? Cheyyaanulla paniyokke kazhinjo? Aadyam athu theerkku.',
        'സിനിമ കാണണോ? ചെയ്യാനുള്ള പണിയൊക്കെ കഴിഞ്ഞോ? ആദ്യം അതൊക്കെ തീർക്ക്. എന്നിട്ട് ആലോചിക്കാം.',
      );
    } else if (intent === 'greeting') {
      kind = 'Greeting';
      mood = 0;
      logic = 'Kuttan is here. First things first: food.';
      reply = phrase(
        'What is it, dear? Have you eaten? Tell me what happened.',
        'Entha kutta? Kazhicho? Para, entha kaaryam?',
        'എന്താ കുട്ടാ? കഴിച്ചോ? പറ, എന്താ കാര്യം?',
      );
    } else if (intent === 'thanks') {
      kind = 'Affection';
      mood = 0;
      logic = 'A little affection. No conditions attached.';
      reply = phrase(
        'I love you too, dear. Take care of yourself. And eat on time.',
        'Enikkum ninne ishtamalle, kutta. Samayathu kazhikkanam ketto.',
        'എനിക്കും നിന്നെ ഇഷ്ടമല്ലേ, കുട്ടാ. നന്നായി ഇരിക്കണം. സമയത്ത് ഭക്ഷണം കഴിക്കണം കേട്ടോ.',
      );
    }
  }
  if (
    kind === 'Food' &&
    intent === 'food' &&
    !/not hungry|vishappilla|vishapilla|വിശപ്പില്ല|വിശക്കുന്നില്ല|വേണ്ട/.test(s)
  ) {
    reply = phrase(
      'Hungry? There is rice and curry in the kitchen. Come eat before it gets cold.',
      'Vishakkunno? Adukkalayil chorum kariyum undu. Thanukkunnathinu munpe vannu kazhikku.',
      'വിശക്കുന്നുണ്ടോ? അടുക്കളയിൽ ചോറും കറിയും ഉണ്ട്. തണുക്കുന്നതിനു മുമ്പേ വന്നു കഴിക്ക്.',
    );
    logic = 'Hunger detected. Amma is happy to feed you.';
  }
  reply = personalize(
    reply,
    ctx.personality,
    kind,
    intent === 'food' &&
      /not hungry|vishappilla|vishapilla|വിശപ്പില്ല|വിശക്കുന്നില്ല|വേണ്ട/.test(s),
  );
  return { reply, kind, mood, logic, permissionStep, detail };
}
export const advice = [
  phrase(
    'Why are you so quiet? Go study something.',
    'Entha onnum mindathe? Poi enthelum padikku.',
    'എന്താ ഒന്നും മിണ്ടാത്തെ? പോയി എന്തെങ്കിലും പഠിക്ക്.',
  ),
  phrase(
    'Have you cleaned your room? I am only asking.',
    'Room clean cheytho? Njan chumma chodichatha.',
    'മുറി വൃത്തിയാക്കിയോ? ഞാൻ വെറുതെ ചോദിച്ചതാ.',
  ),
  phrase(
    'Did you drink water? And stop looking at that phone.',
    'Vellam kudicho? Aa phone onnu maatti vekku.',
    'വെള്ളം കുടിച്ചോ? ആ ഫോൺ ഒന്നു മാറ്റിവെക്ക്.',
  ),
];
