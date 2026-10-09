// Double-click menu, one question at a time. A word has "slots": every দন্ত্য স (could become শ) and then every lone letter (could take ো).
// The menu shows the word as it would be with the current slot changed. Picking the word keeps that change, Next leaves the slot as it was;
// either way the next slot comes up, and when there are no slots left the menu ends. shoSlots first, then okarSlots.
const isC = c => c >= 'ক' && c <= 'হ';
const SIGN = /[া-্ৗ]/; // vowel signs and the hasanta
const arr = w => [...w.normalize('NFC')];
const letterEnd = (w, i) => (w[i + 1] === '়' ? i + 2 : i + 1); // য় is য + nukta: one letter

const shoSlots = w => arr(w).flatMap((c, i) => (c === 'স' ? [i] : []));

// insertion points for ো: after a lone letter or conjunct, and not for
//   - a letter that has a kar, a hasanta, or a র/য-ফলা,
//   - a letter right before a conjunct (পঞ্জি: the প is closed by the nasal).
const okarSlots = word => {
  const w = arr(word), at = [];
  for (let i = 0; i < w.length; i++) {
    if (!isC(w[i])) continue;
    let j = letterEnd(w, i);
    while (w[j] === '্' && isC(w[j + 1])) j = letterEnd(w, j + 1);
    const last = j - 1 - (w[j - 1] === '়' ? 1 : 0), fola = last > i && /[রয]/.test(w[last]);
    const k = isC(w[j]) ? letterEnd(w, j) : -1, beforeConjunct = i > 0 && k > 0 && w[j] !== 'র' && w[k] === '্' && isC(w[k + 1]); // a র before its ্ is a reph: the letter before it is still asked; the first letter of a word is always asked
    if (!SIGN.test(w[j] ?? '') && !fola && !beforeConjunct) at.push(j); // the last letter counts too
    i = j - 1;
  }
  for (let i = 1; i < w.length; i++) // a hasanta that only keeps the vowel quiet (র্ক, a closing ্) is a slot too: the ো takes its place
    if (w[i] === '্' && (i === w.length - 1 ? isC(w[i - 1]) : w[i - 1] === 'র' && isC(w[i + 1]) && !/[রয]/.test(w[i + 1]))) at.push(i);
  return at.sort((a, b) => a - b);
};

const apply = (word, phase, slot) => { const w = arr(word); if (phase === 'sho') w[slot] = 'শ'; else w.splice(slot, w[slot] === '্' ? 1 : 0, 'ো'); return w.join(''); };

// first slot at or after pos: {phase, slot, form: the word with that slot changed}, or null when the menu is over
export const nextSuggestion = (word, phase = 'sho', pos = 0) => {
  const slots = (phase === 'sho' ? shoSlots(word) : okarSlots(word)).filter(s => s >= pos);
  if (slots.length) return { phase, slot: slots[0], form: apply(word, phase, slots[0]) };
  return phase === 'sho' ? nextSuggestion(word, 'okar', 0) : null;
};

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('respell.mjs')) { // self-check: node src/respell.mjs
  const eq = (a, b) => { if (a !== b) throw new Error(a + ' != ' + b); };
  const W = 'গ্রন্থপঞ্জিকারদের';
  let s = nextSuggestion(W); eq(s.form, 'গ্রন্থোপঞ্জিকারদের');
  eq(nextSuggestion(s.form, s.phase, s.slot + 1).form, 'গ্রন্থোপঞ্জিকারোদের'); // picked the word
  eq(nextSuggestion(W, s.phase, s.slot + 1).form, 'গ্রন্থপঞ্জিকারোদের'); // chose Next
  s = nextSuggestion('সমসাময়িক'); eq(s.form, 'শমসাময়িক');
  s = nextSuggestion(s.form, s.phase, s.slot + 1); eq(s.form, 'শমশাময়িক');
  s = nextSuggestion(s.form, s.phase, s.slot + 1); eq(s.form, 'শোমশাময়িক'); // no more স: the ো questions begin
  s = nextSuggestion(s.form, s.phase, s.slot + 1); eq(s.form, 'শোমোশাময়িক');
  s = nextSuggestion(s.form, s.phase, s.slot + 1); eq(s.form, 'শোমোশামোয়িক');
  s = nextSuggestion(s.form, s.phase, s.slot + 1); eq(s.form, 'শোমোশামোয়িকো'); // the last letter too
  eq(nextSuggestion(s.form, s.phase, s.slot + 1), null);
  { let f = 'শংঘাতশোমূহ', q; while ((q = nextSuggestion(f, 'okar', q ? q.slot + 1 : 0))) f = q.form; eq(f, 'শোংঘাতোশোমূহো'); } // taking every question ends with ো on the final হ
  eq(nextSuggestion('কর্বে', 'okar').form, 'কোর্বে'); // ক is asked (র্ব is a reph, not a conjunct that closes the ক)
  eq(nextSuggestion('কর্বে', 'okar', 2).form, 'করোবে'); // then the hasanta of র্ব
  eq(nextSuggestion('শাহোশ্', 'okar').form, 'শাহোশো');
  eq(nextSuggestion('বল্তে', 'okar').form, 'বোল্তে'); // the first letter is asked even before a conjunct
  console.log('ok');
}
