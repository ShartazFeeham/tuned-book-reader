// Bangla digits -> Bangla number words: ১৭ -> সতেরো, ৭৯ -> ঊনআশি, ১২৩৪ -> এক হাজার দুইশো চৌত্রিশ, ৩.৫ -> তিন দশমিক পাঁচ.
const U = ('শূন্যো এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগারো বারো তেরো চৌদ্দো পনেরো ষোলো সতেরো আঠারো ঊনিশ বিশ ' +
  'একুশ বাইশ তেইশ চোব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনোত্রিশ ত্রিশ একোত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনোচল্লিশ চল্লিশ ' +
  'একোচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনোপঞ্চাশ পঞ্চাশ ' +
  'একান্ন বায়ান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনোষাট ষাট ' +
  'একোষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি ঊনোসত্তর সত্তর ' +
  'একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনোআশি আশি ' +
  'একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টাশি ঊনোনব্বই নব্বই ' +
  'একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই').split(' ');
const ORD = { 1: 'প্রথম', 2: 'দ্বিতীয়', 3: 'তৃতীয়', 4: 'চতুর্থ', 5: 'পঞ্চম', 6: 'ষষ্ঠ', 7: 'সপ্তম', 8: 'অষ্টম', 9: 'নবম', 10: 'দশম' };
const ORD_SUF = { 1: 'ম', 2: 'য়', 3: 'য়', 4: 'র্থ', 5: 'ম', 6: 'ষ্ঠ', 7: 'ম', 8: 'ম', 9: 'ম', 10: 'ম' };
const DIG = '০১২৩৪৫৬৭৮৯';
const toInt = s => [...s].reduce((n, c) => n * 10 + DIG.indexOf(c), 0);

export function words(n) {
  if (n < 100) return U[n];
  const part = (div, name) => { const q = Math.floor(n / div), r = n % div; return words(q) + ' ' + name + (r ? ' ' + words(r) : ''); };
  if (n < 1000) { const r = n % 100; return U[Math.floor(n / 100)] + 'শো' + (r ? ' ' + words(r) : ''); }
  if (n < 1e5) return part(1e3, 'হাজার');
  if (n < 1e7) return part(1e5, 'লক্ষো');
  return part(1e7, 'কোটি');
}

// text must be NFC (য় is য + ়). More than 15 digits are read digit by digit.
export const numberWords = text => text.replace(/[০-৯]+(?:,[০-৯]{3}(?![০-৯]))*(?:\.([০-৯]+))?(?:(ম|য়|র্থ|ষ্ঠ)(?![ঀ-৿]))?/g, (m, frac, suf) => {
  let whole = m.slice(0, m.length - (suf?.length ?? 0) - (frac ? frac.length + 1 : 0)).replace(/,/g, '');
  const say = d => d.length > 15 ? [...d].map(c => U[DIG.indexOf(c)]).join(' ') : words(toInt(d));
  const n = toInt(whole);
  if (suf && !frac && ORD[n] && ORD_SUF[n] === suf) return ORD[n];
  const out = say(whole) + (frac ? ' দশোমিক ' + [...frac].map(c => U[DIG.indexOf(c)]).join(' ') : '');
  return (suf ? out + suf : out).replace(/য়া/g, 'আ'); // চুয়ান্ন -> চুআন্ন, বিয়াল্লিশ -> বিআল্লিশ: only inside number words
});

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('numwords.mjs')) { // self-check: node src/numwords.mjs
  const eq = (a, b) => { if (a !== b) throw new Error(a + ' != ' + b); };
  eq(numberWords('১৭'), 'সতেরো'); eq(numberWords('৭৯'), 'ঊনোআশি'); eq(numberWords('১০০'), 'একশো'); eq(numberWords('২০০১'), 'দুই হাজার এক');
  eq(numberWords('৬৯৩ খ্রি'), 'ছয়শো তিরানব্বই খ্রি'); eq(numberWords('১,২৩৪'), 'এক হাজার দুইশো চৌত্রিশ'); eq(numberWords('৩.৫'), 'তিন দশোমিক পাঁচ');
  eq(numberWords('৩য়'.normalize('NFC')), 'তৃতীয়'); eq(numberWords('১২৩৪৫৬৭'), 'বারো লক্ষো চৌত্রিশ হাজার পাঁচশো সাতষট্টি'); eq(numberWords('১০০০০০০০'), 'এক কোটি');
  eq(numberWords('৫, ৯'), 'পাঁচ, নয়'); eq(U.length, 100); console.log('ok');
}
