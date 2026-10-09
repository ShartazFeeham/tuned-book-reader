import { buildForVoice } from './pronounce.mjs';

// Read-aloud engine: neural voices (server /tts -> mp3) and installed browser voices.
const S = typeof window !== 'undefined' ? window.speechSynthesis : null;

export const NEURAL = [
  ['bn-BD-PradeepNeural', 'Pradeep (Neural ♂ BD)'],
  ['bn-BD-NabanitaNeural', 'Nabanita (Neural ♀ BD)'],
];
export const STY = [
  ['Narrator', 1.0, 1.0],
  ['Storyteller', 0.92, 1.12],
  ['Slow & Clear', 0.82, 0.98],
  ['Fast Read', 1.18, 1.0],
];
export const DEFAULT_READER = 'bn-BD-PradeepNeural|Storyteller';

export const browserVoices = () =>
  S ? S.getVoices().filter(v => /^bn/i.test(v.lang) || /bangla|bengali/i.test(v.name)) : [];

export function buildReaders(voices) {
  const rd = [];
  for (const [nv, nn] of NEURAL) {
    for (const [n, r, pt] of STY) {
      rd.push({ neural: nv, label: '⚡ ' + nn, n, r, pt, id: nv + '|' + n });
    }
  }
  if (voices && voices.length > 0) {
    for (const v of voices) {
      for (const [n, r, pt] of STY) {
        rd.push({
          voice: v,
          label: '🔊 ' + v.name.replace(/^(Microsoft|Google|Apple) /, ''),
          n,
          r,
          pt,
          id: v.name + '|' + n,
        });
      }
    }
  } else {
    for (const [n, r, pt] of STY) {
      rd.push({
        device: true,
        label: '🔊 ডিভাইস ভয়েস (' + n + ')',
        n,
        r,
        pt,
        id: 'device-voice|' + n,
      });
    }
  }
  return rd;
}

// Gentle compressor + makeup gain
let ctx, comp;
const audioCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

function leveler(audio) {
  try {
    audioCtx();
    if (!comp) {
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -32;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      comp.connect(gain).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    ctx.createMediaElementSource(audio).connect(comp);
  } catch {
    /* fallback to unprocessed */
  }
}

// Pronunciation list loader
let forVoice = t => t;
let pronMode = 'refined';
export const setPronMode = m => {
  pronMode = m;
};

let cachedRefined = null;
let cachedHandMade = null;

export function getCustomOverrides() {
  try {
    return JSON.parse(localStorage.getItem('custom_respell') || '{}');
  } catch {
    return {};
  }
}

export function addPronunciationOverride(word, to) {
  const overrides = getCustomOverrides();
  overrides[word] = to;
  try {
    localStorage.setItem('custom_respell', JSON.stringify(overrides));
  } catch {}
  if (cachedRefined || cachedHandMade) {
    forVoice = buildForVoice(cachedRefined || {}, { ...(cachedHandMade || {}), ...overrides });
  }
}

export async function loadLexicon() {
  if (cachedRefined && cachedHandMade) return;
  try {
    const [refined, handMade] = await Promise.all([
      fetch('/pronounce.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch('/pronounce-explicit.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    cachedRefined = refined || {};
    cachedHandMade = handMade || {};
    const overrides = getCustomOverrides();
    forVoice = buildForVoice(cachedRefined, { ...cachedHandMade, ...overrides });
  } catch {
    const overrides = getCustomOverrides();
    forVoice = buildForVoice({}, overrides);
  }
}

// Reading styles by context
export const CTX = {
  n: { r: 1, p: 0, v: 0 },
  q: { r: 0.9, p: -6, v: 0 },
};

// Split paragraph into quoted / unquoted segments
export function segments(text) {
  if (!text) return [{ t: '', s: 'n' }];
  const out = [],
    stack = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: buf, s: stack.at(-1) || 'n' });
    buf = '';
  };
  const close = c => {
    flush();
    const i = stack.lastIndexOf(c);
    if (i >= 0) stack.splice(i, 1);
  };
  [...text].forEach((ch, i, a) => {
    const prev = a[i - 1],
      next = a[i + 1];
    if (ch === '“' || ch === '«') {
      flush();
      stack.push('q');
    } else if (ch === '”' || ch === '»') {
      close('q');
    } else if (ch === '"') {
      if ((!prev || /[\s(\[—–]/.test(prev)) && next && !/\s/.test(next)) {
        flush();
        stack.push('q');
      } else {
        close('q');
      }
    } else {
      buf += ch;
    }
  });
  flush();
  const res = [];
  for (const g of out) g.t = g.t.replace(/["“”„‟«»]/g, '');
  for (const g of out) {
    const last = res.at(-1);
    if (last && (!/[\u0980-\u09FF\w]/.test(g.t) || last.s === g.s)) last.t += g.t;
    else res.push({ ...g });
  }
  if (res.length > 1 && !/[\u0980-\u09FF\w]/.test(res[0].t)) {
    res[1].t = res[0].t + res[1].t;
    res.shift();
  }
  return res.length ? res : [{ t: text, s: 'n' }];
}

// Silence measurement
const SKIP = 1;
const quiet = {};
function silence(url) {
  return (quiet[url] ||= fetch(url)
    .then(r => r.arrayBuffer())
    .then(b => audioCtx().decodeAudioData(b))
    .then(buf => {
      const d = buf.getChannelData(0),
        thr = 0.01,
        sr = buf.sampleRate,
        lim = Math.min(d.length, sr);
      let a = 0,
        z = d.length - 1;
      while (a < lim && Math.abs(d[a]) < thr) a++;
      while (z > d.length - lim && z > a && Math.abs(d[z]) < thr) z--;
      return { lead: a / sr, tail: (d.length - 1 - z) / sr };
    })
    .catch(() => ({ lead: 0, tail: 0 })));
}

export const spoken = t => forVoice(t);

let neuralServerAvailable = null;

const cache = {};
function tts(x, text, rate, c = CTX.n) {
  if (neuralServerAvailable === false) {
    return Promise.reject(new Error('Neural TTS server unavailable'));
  }
  const k = [pronMode, x.id, rate, c.r, c.p, c.v, text].join('|');
  const body = JSON.stringify({
    text: forVoice(text),
    voice: x.neural,
    rate: Math.round((x.r * rate * c.r - 1) * 100),
    pitch: Math.round((x.pt - 1) * 50 + c.p),
    volume: c.v,
  });
  const get = () =>
    fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).then(async r => {
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('audio')) {
        neuralServerAvailable = false;
        throw new Error('TTS server unavailable (' + (r.ok ? 'non-audio response' : r.status) + ')');
      }
      neuralServerAvailable = true;
      return r.blob();
    });
  return (cache[k] ||= get()
    .catch(get)
    .then(URL.createObjectURL)
    .catch(e => {
      delete cache[k];
      throw e;
    }));
}

const ready = {};
function prepare(x, rate, g) {
  const c = CTX[g.s],
    k = [pronMode, x.id, rate, c.r, c.p, c.v, g.t].join('|');
  return (ready[k] ||= tts(x, g.t, rate, c)
    .then(url =>
      silence(url).then(q => {
        const a = new Audio(url);
        a.preload = 'auto';
        leveler(a);
        return { a, q };
      })
    )
    .catch(e => {
      delete ready[k];
      throw e;
    }));
}

const warm = (x, rate, list) =>
  list.forEach(g =>
    tts(x, g.t, rate, CTX[g.s])
      .then(silence)
      .catch(() => {})
  );

// Background Keepalive silent audio (for mobile iOS Safari & Android background playback)
let silentLoop = null;
function startBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (!silentLoop) {
      // 1-second silent WAV base64
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentLoop = new Audio(silentWav);
      silentLoop.loop = true;
      silentLoop.volume = 0.01;
    }
    silentLoop.play().catch(() => {});
  } catch {}
}

function stopBackgroundKeepAlive() {
  if (silentLoop) {
    try {
      silentLoop.pause();
    } catch {}
  }
}

// MediaSession setup
export function updateMediaSession({ title, bookTitle, volumeLabel, onPlay, onPause, onNext, onPrev }) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Tuned Book Reader',
      artist: bookTitle || 'Audio Reader',
      album: volumeLabel || 'Volume',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    if (onPlay) navigator.mediaSession.setActionHandler('play', onPlay);
    if (onPause) navigator.mediaSession.setActionHandler('pause', onPause);
    if (onNext) navigator.mediaSession.setActionHandler('nexttrack', onNext);
    if (onPrev) navigator.mediaSession.setActionHandler('previoustrack', onPrev);
  } catch {}
}

// Main Player factory
// h: { chunks(), reader(), rate(), at(k, lineText), msg(s), state(bool), end() -> bool }
export function createPlayer(h) {
  let run = 0,
    audio = null,
    poll = 0;

  const halt = () => {
    S?.cancel();
    clearInterval(poll);
    if (audio) {
      audio.pause();
      audio = null;
    }
  };

  function step(k, my, j = 0) {
    if (my !== run) return;
    halt();
    const chunks = h.chunks();
    if (k >= chunks.length) {
      if (!h.end()) stop();
      return;
    }

    const currentLine = chunks[k] || '';
    h.at(k, currentLine);

    const x = h.reader(),
      rate = h.rate(),
      segs = segments(chunks[k]),
      sg = segs[j],
      c = CTX[sg?.s || 'n'];
    const next = () => (j + 1 < segs.length ? step(k, my, j + 1) : step(k + 1, my));
    const fail = m => {
      if (my === run) {
        h.msg(m);
        stop();
      }
    };

    const speakBrowser = () => {
      if (!S) return fail('ব্রাউজারে স্পিচ সমর্থিত নয়');
      try {
        S.cancel();
        const textToSpeak = forVoice(sg?.t || '');
        if (!textToSpeak.trim()) {
          next();
          return;
        }
        const u = new SpeechSynthesisUtterance(textToSpeak);
        const voices = S.getVoices();
        const bnVoice =
          x?.voice ||
          voices.find(v => /^bn/i.test(v.lang) || /bangla|bengali/i.test(v.name));
        if (bnVoice) {
          u.voice = bnVoice;
          u.lang = bnVoice.lang || 'bn-BD';
        } else {
          u.lang = 'bn-BD';
        }
        u.rate = Math.max(0.5, Math.min(2.0, (x?.r || 1.0) * rate * (c?.r || 1.0)));
        u.pitch = Math.max(0.5, Math.min(1.8, (x?.pt || 1.0) + (c?.p || 0) / 50));
        u.volume = Math.max(0.1, Math.min(1.0, 1 + (h.volume || 0) / 100));
        u.onend = () => {
          if (my === run) next();
        };
        u.onerror = e => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('SpeechSynthesis error:', e);
            if (my === run) next();
          }
        };
        h.msg('');
        S.speak(u);
      } catch (err) {
        console.error('speakBrowser failed:', err);
        fail('স্পিচ শুরু করা যায়নি');
      }
    };

    if (x?.neural && neuralServerAvailable !== false) {
      h.msg('…');
      warm(x, rate, segs.slice(j));
      for (let n = 1; n <= 3; n++) {
        if (chunks[k + n]) warm(x, rate, segments(chunks[k + n]));
      }
      if (segs[j + 1]) prepare(x, rate, segs[j + 1]).catch(() => {});

      prepare(x, rate, sg)
        .then(({ a, q }) => {
          if (my !== run) return;
          h.msg('');
          audio = a;
          const more = j + 1 < segs.length;
          const start = j > 0 ? q.lead * SKIP : 0;
          let went = false;
          const go = () => {
            if (!went) {
              went = true;
              clearInterval(poll);
              next();
            }
          };

          if (a.readyState >= 1) a.currentTime = start;
          else
            a.addEventListener(
              'loadedmetadata',
              () => {
                a.currentTime = start;
              },
              { once: true }
            );

          if (more && q.tail) {
            poll = setInterval(() => {
              if (a.duration && a.currentTime >= a.duration - q.tail * SKIP) go();
            }, 10);
          }
          a.onended = go;
          a.onerror = () => {
            console.warn('Audio playback error, falling back to browser voice');
            neuralServerAvailable = false;
            speakBrowser();
          };
          a.play().catch(e => {
            console.warn('Audio play failed, falling back to browser voice:', e);
            speakBrowser();
          });
        })
        .catch(e => {
          console.warn('Neural voice failed, falling back to browser voice:', e);
          neuralServerAvailable = false;
          speakBrowser();
        });
      return;
    }

    // Direct browser speech
    speakBrowser();
  }

  function play(k = 0) {
    const my = ++run;
    startBackgroundKeepAlive();
    h.state(true);
    loadLexicon().then(() => step(k, my));
  }

  function stop() {
    run++;
    halt();
    stopBackgroundKeepAlive();
    h.state(false);
    h.at(-1, '');
  }

  return { play, stop };
}
