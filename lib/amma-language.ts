export type Intent =
  | 'permission'
  | 'relationship'
  | 'food'
  | 'order'
  | 'marks'
  | 'weather'
  | 'money'
  | 'location'
  | 'study'
  | 'sleep'
  | 'tech'
  | 'movie'
  | 'greeting'
  | 'thanks'
  | 'unknown';
export function normalizeInput(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[൦-൯]/g, (c) => String(c.charCodeAt(0) - 0x0d66))
    .replace(/[’‘]/g, "'")
    .replace(/[-‐‑]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
export function isStudyClaim(input: string): boolean {
  const s = normalizeInput(input);
  if (
    /not studying|not study|don't study|didn't study|padikkunnilla|padichilla|പഠിക്കുന്നില്ല|പഠിച്ചില്ല|പഠിക്കാറില്ല/.test(
      s,
    )
  )
    return false;
  return /\b(i am studying|i'm studying|i am learning|i'm learning|studying)\b|padikkunnu|padikkuva|പഠിക്കുകയാ|പഠിക്കുവാ|പഠിക്കുന്നു/.test(
    s,
  );
}
export function detectIntent(input: string): Intent {
  const s = normalizeInput(input);
  if (
    /\b(go out|going out|outside|permission|trip)\b|purath|porath|pokatte|pokattee|പുറത്ത|പോകട്ടെ|പൊക്കോട്ടെ|പോയ്ക്കോട്ടെ|പോവട്ടെ|പോവാൻ|പോകാൻ|യാത്ര/.test(
      s,
    )
  )
    return 'permission';
  if (
    /just.*friend|girlfriend|boyfriend|relationship|പ്രണയ|കാമുക|ഗേൾഫ്രണ്ട്|ബോയ്ഫ്രണ്ട്|വെറും.*(കൂട്ടുകാര|സുഹൃ)|ഫ്രണ്ട്.*മാത്ര|friend.*mathram/.test(
      s,
    )
  )
    return 'relationship';
  if (
    /not hungry|hungry|vishap|veshap|vishak|choru|food venda|വിശപ്പ|വിശക്ക|ഭക്ഷണം വേണ്ട|ചോറ് വേണ്ട|ചോറു വേണ്ട|കഴിക്കാൻ വേണ്ട/.test(
      s,
    )
  )
    return 'food';
  if (
    /biriyani|biryani|biriani|order|swiggy|zomato|ബിരിയാണി|ബിര്യാണി|ഓർഡർ|ഓഡർ|സ്വിഗ്ഗി|സൊമാറ്റോ/.test(
      s,
    )
  )
    return 'order';
  if (
    /%|\bmarks?\b|\bscore\b|percent|മാർക്ക|മാര്ക്ക|ശതമാനം|പെർസെന്റ്|പെർസന്റ്|പെർസെൻ്റ്/.test(
      s,
    )
  )
    return 'marks';
  if (/weather|\brain\b|rainy|mazha|മഴ|കാലാവസ്ഥ|വെയിൽ|വെയില|ചൂട്/.test(s))
    return 'weather';
  if (
    /spent|spend|bought|money|paisa|cash|roopa|rupa|chelav|₹|പൈസ|പണം|രൂപ|ചെലവ|ചിലവ|വാങ്ങി/.test(
      s,
    )
  )
    return 'money';
  if (/college|location|where i am|കോളേജ|കോളെജ|കോളജ/.test(s)) return 'location';
  if (/\b(study|studying|exam|exams)\b|padikk|padich|പഠി|പരീക്ഷ|എക്സാം/.test(s))
    return 'study';
  if (/sleep|2 am|late night|urang|urakk|ഉറങ്ങ|ഉറക്ക|രാത്രി.*രണ്ട്/.test(s))
    return 'sleep';
  if (
    /wi\s?fi|laptop|phone|computer|internet|വൈഫൈ|വൈ ഫൈ|ഇന്റർനെറ്റ്|ഇൻ്റർനെറ്റ്|നെറ്റ്|ലാപ്ടോപ്പ്|ലാപ്‌ടോപ്പ്|ഫോൺ|ഫോണ്|കമ്പ്യൂട്ടർ/.test(
      s,
    )
  )
    return 'tech';
  if (/movie|cinema|netflix|film|padam|സിനിമ|പടം|ചിത്രം/.test(s)) return 'movie';
  if (
    /^(hi|hello|hey|amma|അമ്മ|അമ്മേ|ഹലോ|ഹായ്|നമസ്കാരം)[!.?\s]*$|sugham|sukham|സുഖമാ|എന്തൊക്കെ/.test(
      s,
    )
  )
    return 'greeting';
  if (/thank|nanni|നന്ദി|സ്നേഹ|love you/.test(s)) return 'thanks';
  return 'unknown';
}
export type RecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence?: number };
};
// Rebuild from the complete result list. Interim segments are replacements, not additions.
export function recognitionTranscript(
  results: ArrayLike<RecognitionResultLike>,
): { final: string; interim: string } {
  const final: string[] = [],
    interim: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i],
      candidates = Array.from({ length: result.length }, (_, n) => result[n]);
    // Prefer the recognizer's top hypothesis; don't turn low-confidence words into a guessed intent.
    const text = candidates[0]?.transcript?.trim();
    if (text) (result.isFinal ? final : interim).push(text);
  }
  return {
    final: final.join(' ').slice(0, 1000),
    interim: interim.join(' ').slice(0, 1000),
  };
}
