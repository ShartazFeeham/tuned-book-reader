// Turns book text into what the voice should say, from pronounce.json. The screen text is never touched.
//   "word": "respelling"   whole word only
//   "stem*": "respelling"  any word starting with the stem keeps its ending: আরব* -> আরোব covers আরব, আরবী, আরবের, আরবরা, আরবদের.
//                          If the ending starts with a consonant a hasanta joins it so the stem's last letter stays silent (আরোব্রা, আরোব্দের).
//   "stem+": "respelling"  same, but the ending is simply attached (no hasanta): উসমান+ -> উছমান covers উসমানের, উসমানকে.
//   "stem~": "respelling"  like + but only when a consonant follows the stem (a stem that keeps its "o" inside a compound):
//                          সম~ -> সমো turns সমকক্ষ into সমোকক্ষ, but leaves সমাজ and সম্ভব alone.
//   "-ending": "respelling" an ending that only counts inside a longer word: -সমূহ -> শোমূহ (দৃষ্টিসমূহ), not the word সমূহ itself.
//   "_keep_s": [...]       words (or stems ending in *) that keep their "s" (see below)
// A word is a run of Bangla letters. A run joined by an apostrophe (সা‘দ, ‘আলী, কা'ব) is an Arabic name: it is never changed,
// and pieces of it are never treated as words of their own.
//
// Two versions: 'refined' is everything above. 'explicit' is the same plus a hand-written list (pronounce-explicit.json, passed as
// handMade) in which every letter of the word carries a vowel sign, a fola or a hasanta. A word found in that list is spelled exactly
// as written there and the refined rules leave it alone; every other word falls back to the refined version.
import { numberWords } from './numwords.mjs';
const BN = '\\u0980-\\u09FF';
const AP = '‘’\'ʿʾʻʼ';
const WORD = `[${AP}]?[${BN}]+(?:[${AP}][${BN}]+)*`;
const CONS = /^[ক-হড়-য়]/;
// Only a word-initial স is "sh" (সৈন্য = shoinno, সাত = shat, সময় = shomoy); a স inside a word stays "s" (কসম, মুসলিম).
// Not before ্ + ত থ ক খ প ফ ট ঠ ন ল (স্থান, বিস্কুট). ষ is "sh" (but ক্ষ is its own sound and is left alone).
const SH = /^স(?!্[তথকখপফটঠনল])|(?<!ক্)ষ/g;
const alt = o => Object.keys(o).sort((a, b) => b.length - a.length).join('|');

// The books spell য় both as one character (U+09DF) and as য + ় (U+09AF U+09BC); NFC makes every form the same so list entries match either.
const nf = s => s.normalize('NFC');

export function buildForVoice(map, handMade = null) {
  const m = {}, exact = {}, stem = {}, plus = {}, tilde = {}, tail = {}, keep = { exact: new Set(), stems: [] };
  for (const [k, v] of Object.entries(map)) m[nf(k)] = Array.isArray(v) ? v.map(nf) : nf(v);
  for (const k of m._keep_s || []) k.endsWith('*') ? keep.stems.push(k.slice(0, -1)) : keep.exact.add(k);
  delete m._keep_s;
  for (const [k, v] of Object.entries(m)) {
    if (k.endsWith('*')) stem[k.slice(0, -1)] = v;
    else if (k.endsWith('+')) plus[k.slice(0, -1)] = v;
    else if (k.endsWith('~')) tilde[k.slice(0, -1)] = v;
    else if (k.startsWith('-')) tail[k.slice(1)] = v;
    else exact[k] = v;
  }
  const mk = o => Object.keys(o).length ? new RegExp(`(?<![${BN}${AP}])(${alt(o)})([${BN}]*(?:[${AP}][${BN}]+)*)`, 'g') : null;
  const eRe = Object.keys(exact).length ? new RegExp(`(?<![${BN}${AP}])(${alt(exact)})(?![${BN}]|[${AP}][${BN}])`, 'g') : null;
  const sRe = mk(stem), pRe = mk(plus), tRe = mk(tilde);
  const tailRe = Object.keys(tail).length ? new RegExp(`(?<=[${BN}])(${alt(tail)})(?![${BN}]|[${AP}][${BN}])`, 'g') : null;
  const isName = t => new RegExp(`[${AP}]`).test(t);
  const hm = handMade ? Object.fromEntries(Object.entries(handMade).map(([k, v]) => [nf(k), nf(v).replace(/্(?=[অ-ঔ])/g, '')])) : null; // a hasanta cannot join a vowel letter (মার্ওয়ান): drop it
  return text => {
    text = numberWords(nf(text));
    const held = []; // words found in the hand-written list are set aside, so no refined rule touches them, and put back at the end
    if (hm) text = text.replace(new RegExp(WORD, 'g'), tok => (!isName(tok) && hm[tok] !== undefined ? `${held.push(hm[tok]) - 1}` : tok));
    if (eRe) text = text.replace(eRe, w => exact[w]);
    if (sRe) text = text.replace(sRe, (all, st, rest) => isName(rest) ? all : stem[st] + (CONS.test(rest) ? '্' : '') + rest);
    if (pRe) text = text.replace(pRe, (all, st, rest) => isName(rest) ? all : plus[st] + rest);
    if (tRe) text = text.replace(tRe, (all, st, rest) => isName(rest) || keep.stems.some(k => all.startsWith(k)) || !/^[ক-হ]/.test(rest) || /^য়/.test(rest) ? all : tilde[st] + rest);
    if (tailRe) text = text.replace(tailRe, w => tail[w]);
    text = text.replace(new RegExp(WORD, 'g'), tok =>
      isName(tok) || keep.exact.has(tok) || keep.stems.some(st => tok.startsWith(st)) ? tok : tok.replace(SH, 'শ'));
    if (held.length) text = text.replace(/\ue000(\d+)\ue001/g, (_, i) => held[+i]);
    return text.replace(/(?<!্)য(?!়)/g, 'জ').replace(/:/g, ' ').replace(/[ \t]*[-‐‑‒–—―−]+[ \t]*/g, ', ').replace(/,\s*,/g, ',').replace(/(রাস[ূু]লুল্লাহ)র( [সশ]াল্লাল্লাহু আলাইহি ওয়াসাল্লাম্?)/g, '$1$2 এর').replace(/,\s*(ই)(?![\u0980-\u09FF])/g, ' $1').replace(/(?<![\u0980-\u09FF])(আল্?|আত্?),/g, '$1').replace(/([সশ]াল্লাল্লাহু আলাইহি ওয়াসাল্লাম্?),/g, '$1').replace(/ঊ/g, 'উ').replace(/[ডঢ]়|[ড়ঢ়]/g, 'র').replace(/ূ/g, 'ু').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD').replace(/\u09AF\u09BC/g, '\u09DF').replace(/ৃ/g, '্রি'); // অন্তঃস্থ য (not য় or the ্য ফলা) is said as বর্গীয় জ
  };
}
