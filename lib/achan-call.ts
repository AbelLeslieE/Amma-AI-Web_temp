import type { Personality, Phrase } from './amma-engine.ts';
export type CallState = {
  phase: 'idle' | 'ringing' | 'redialing' | 'connected';
  attempt: number;
};
export type CallEvent = 'start' | 'decline' | 'redial' | 'answer' | 'end';
export const initialCall: CallState = { phase: 'idle', attempt: 0 };
export function callReducer(state: CallState, event: CallEvent): CallState {
  if (event === 'end') return initialCall;
  if (event === 'start' && state.phase === 'idle')
    return { phase: 'ringing', attempt: 1 };
  if (event === 'decline' && state.phase === 'ringing')
    return { ...state, phase: 'redialing' };
  if (event === 'redial' && state.phase === 'redialing')
    return { phase: 'ringing', attempt: state.attempt + 1 };
  if (event === 'answer' && state.phase === 'ringing')
    return { ...state, phase: 'connected' };
  return state;
}
export const angerStage = (attempt: number) =>
  Math.min(4, Math.max(0, attempt - 1));
export const angerLabels = [
  'Suspiciously calm',
  'Losing patience',
  'Very annoyed',
  'Full-name territory',
  'Maximum Achan',
];
const p = (en: string, mg: string, ml: string): Phrase => ({ en, mg, ml });
export const achanLines = [
  p(
    'Hello? Amma told me everything. Where are you planning to go? Come sit here. We need to talk.',
    'Hello? Amma ellam paranju. Nee evide pokaan nokkuvaa? Ivide vannu irikku. Oru kaaryam samsaarikkanam.',
    'ഹലോ? അമ്മ എല്ലാം പറഞ്ഞു. നീ എവിടെ പോകാൻ നോക്കുവാ? ഇവിടെ വന്നിരിക്ക്. ഒരു കാര്യം സംസാരിക്കണം.',
  ),
  p(
    'Did you just cut my call? I am your father, not a delivery reminder! Pick up when I call.',
    'Ente call cut cheytho? Njan ninte achanaanu, delivery vilikkunnathalla! Vilichaal edukkanam.',
    'എന്റെ കോൾ കട്ട് ചെയ്തോ? ഞാൻ നിന്റെ അച്ഛനാണ്, ഡെലിവറി വിളിക്കുന്നതല്ല! വിളിച്ചാൽ എടുക്കണം.',
  ),
  p(
    'Again? You have time for every message but no time for Achan? Put that outing on hold. Come home first!',
    'Pinneyum? Ellaa message-inum samayam undu, achanod samsaarikkaan ille? Purathu pokunnathu nirthi vekku. Aadyam veettil vaa!',
    'പിന്നെയും? എല്ലാ മെസേജിനും സമയം ഉണ്ട്, അച്ഛനോട് സംസാരിക്കാൻ ഇല്ലേ? പുറത്തു പോകുന്നത് നിർത്തി വെക്ക്. ആദ്യം വീട്ടിൽ വാ!',
  ),
  p(
    'Enough! How many times must I call? The phone is for answering too. Your outing is now a family meeting!',
    'Mathi! Ethra thavana vilikkanam? Phone call edukkaanum ullathaanu. Ini purathu pokal illa, kudumba yogam aanu!',
    'മതി! എത്ര തവണ വിളിക്കണം? ഫോൺ കോൾ എടുക്കാനും ഉള്ളതാണ്. ഇനി പുറത്തു പോകൽ ഇല്ല, കുടുംബയോഗം ആണ്!',
  ),
  p(
    'Still cutting my calls? I can keep calling! Amma, come here. Our child has become the managing director of ignoring parents. Meeting. Living room. Now!',
    'Ennittum call cut cheyyuvaano? Njan pinneyum vilikkum! Amma, ingottu vaa. Nammude kutti valiya busy aal aayi. Yogam. Hallil. Ippo!',
    'എന്നിട്ടും കോൾ കട്ട് ചെയ്യുവാണോ? ഞാൻ പിന്നെയും വിളിക്കും! അമ്മ, ഇങ്ങോട്ടു വാ. നമ്മുടെ കുട്ടി വലിയ ബിസി ആൾ ആയി. യോഗം. ഹാളിൽ. ഇപ്പോൾ!',
  ),
];

const achanOpenings: Record<Personality, Phrase[]> = {
  'Normal Amma': Array.from({ length: 5 }, () => p('', '', '')),
  'Thrissur Amma': [
    p('What is this, dear? ', 'Enthutta kuttye? ', 'എന്തൂട്ടാ കുട്ട്യേ? '),
    p(
      'My dear, you cut the call? ',
      'Gadiye, call cut cheythalle? ',
      'ഗഡിയേ, കോൾ കട്ട് ചെയ്തല്ലേ? ',
    ),
    p(
      'What a grand performance! ',
      'Enthoru paripaadiyaa ithu! ',
      'എന്തൊരു പരിപാടിയാ ഇത്! ',
    ),
    p(
      'That is quite enough now. ',
      'Mathi kuttye, ini venda. ',
      'മതി കുട്ട്യേ, ഇനി വേണ്ട. ',
    ),
    p(
      'My dear, this has crossed every limit. ',
      'Gadiye, ithu athiru kadannu. ',
      'ഗഡിയേ, ഇത് അതിര് കടന്നു. ',
    ),
  ],
  'Coimbatore Amma': [
    p('Enna kanna? ', 'Enna kanna? ', 'എന്നാ കണ്ണാ? '),
    p(
      'Seri, you cut the call? ',
      'Seri kanna, call cut pannitiya? ',
      'ശരി കണ്ണാ, കോൾ കട്ട് പണ്ണിട്ടിയാ? ',
    ),
    p(
      'Listen for one minute, kanna. ',
      'Konjam kelu kanna. ',
      'കൊഞ്ചം കേള് കണ്ണാ. ',
    ),
    p('Enough now, seri? ', 'Ippo pothum, seriyaa? ', 'ഇപ്പോ പോതും, ശരിയാ? '),
    p(
      'Appuram no excuses. ',
      'Appuram excuse onnum venda. ',
      'അപ്പുറം എക്സ്ക്യൂസ് ഒന്നും വേണ്ട. ',
    ),
  ],
  'Kottayam Amma': [
    p(
      'My dear, what is happening there? ',
      'Ente koche, ennathaa avide? ',
      'എന്റെ കൊച്ചേ, എന്നതാ അവിടെ? ',
    ),
    p(
      'My dear, did you cut the call? ',
      'Ente koche, call angu cut cheytho? ',
      'എന്റെ കൊച്ചേ, കോൾ അങ്ങ് കട്ട് ചെയ്തോ? ',
    ),
    p(
      'Tell me properly now. ',
      'Onnu nere chovve para. ',
      'ഒന്ന് നേരെ ചൊവ്വേ പറ. ',
    ),
    p(
      'There is a limit to patience. ',
      'Kshamaykkum oru athirundu. ',
      'ക്ഷമയ്ക്കും ഒരു അതിരുണ്ട്. ',
    ),
    p(
      'This discussion is happening at home. ',
      'Ini samsaaram veettil vechaa. ',
      'ഇനി സംസാരം വീട്ടിൽ വെച്ചാ. ',
    ),
  ],
  'NRI Amma': [
    p(
      'Okay, listen carefully. ',
      'Okay, listen carefully. ',
      'ഓക്കേ, ലിസൻ കെയർഫുള്ളി. ',
    ),
    p(
      'Seriously? You declined? ',
      'Seriously? Call decline cheytho? ',
      'സീരിയസ്ലി? കോൾ ഡിക്ലൈൻ ചെയ്തോ? ',
    ),
    p(
      'I saw the whole update. ',
      'Full update njan kandu. ',
      'ഫുൾ അപ്ഡേറ്റ് ഞാൻ കണ്ടു. ',
    ),
    p(
      'This is your final reminder. ',
      'Ithu final reminder aanu. ',
      'ഇത് ഫൈനൽ റിമൈൻഡർ ആണ്. ',
    ),
    p(
      'Family meeting. No negotiation. ',
      'Family meeting. No negotiation. ',
      'ഫാമിലി മീറ്റിങ്. നോ നെഗോഷിയേഷൻ. ',
    ),
  ],
  'Exam Season Amma': [
    p(
      'Books first. Talk now. ',
      'Pusthakam aadyam. Ippo para. ',
      'പുസ്തകം ആദ്യം. ഇപ്പോൾ പറ. ',
    ),
    p(
      'One call wasted. One minute wasted. ',
      'Oru call poyi. Oru minute poyi. ',
      'ഒരു കോൾ പോയി. ഒരു മിനിറ്റ് പോയി. ',
    ),
    p(
      'Your next chapter is waiting. ',
      'Adutha chapter kaathirikkunnu. ',
      'അടുത്ത ചാപ്റ്റർ കാത്തിരിക്കുന്നു. ',
    ),
    p('No more breaks. ', 'Ini break onnum illa. ', 'ഇനി ബ്രേക്ക് ഒന്നും ഇല്ല. '),
    p(
      'Revision starts now. ',
      'Revision ippo thudangum. ',
      'റിവിഷൻ ഇപ്പോൾ തുടങ്ങും. ',
    ),
  ],
};

export function achanReply(personality: Personality, attempt: number): Phrase {
  const stage = angerStage(attempt);
  const opening = achanOpenings[personality][stage];
  const line = achanLines[stage];
  return {
    en: opening.en + line.en,
    mg: opening.mg + line.mg,
    ml: opening.ml + line.ml,
  };
}
