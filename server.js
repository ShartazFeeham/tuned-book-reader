// Multi-book audio & text server
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 7861;

// Resolve book extraction locations
const POSSIBLE_ROOTS = [
  path.resolve(__dirname, '..', 'book-extraction'),
  path.resolve('/Users/shartazfeeham/Documents/personal/book-extraction'),
  path.resolve(__dirname, 'books'),
];

function findExistingPath(relPaths) {
  for (const root of POSSIBLE_ROOTS) {
    for (const rel of relPaths) {
      const full = path.join(root, rel);
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

const BOOK_CONFIGS = [
  {
    id: 'tarikh-at-tabari',
    slug: 'the-history-of-al-tabari',
    aliases: ['tarikh-at-tabari', 'the-history-of-al-tabari', 'tabari'],
    relPaths: ['tarikh-at-tabari'],
    defaultTitle: "The History of al-Ṭabarī (Ta'rīkh al-rusul wa'l-mulūk)",
    defaultAuthor: "Abu Ja'far Muhammad ibn Jarir al-Tabari (ইমাম আবু জাফর মুহাম্মদ ইবনে জারীর আত-তাবারী)",
    badge: "History & Sirah",
  },
  {
    id: 'ihya-ulumuddin',
    slug: 'ihya-ulumuddin',
    aliases: ['ihya-ulumuddin', 'gajjali-ihya', 'ihya'],
    relPaths: [path.join('gajjali-r', 'ihya-ulumuddin'), 'ihya-ulumuddin'],
    defaultTitle: "এহইয়াউ উলুমুদ্দীন (Ihya Ulumuddin)",
    defaultAuthor: "হুজ্জাতুল ইসলাম ইমাম আবু হামিদ মুহাম্মদ ইবনে মুহাম্মদ আল-গাযযালী (রহঃ)",
    badge: "Tazkiyah & Akhlaq",
  },
];

function getBookRegistry() {
  const books = [];
  for (const cfg of BOOK_CONFIGS) {
    const bookDir = findExistingPath(cfg.relPaths);
    if (!bookDir) continue;

    let bookMeta = {};
    const metaFile = path.join(bookDir, 'book.json');
    if (fs.existsSync(metaFile)) {
      try {
        bookMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      } catch (e) {
        console.error(`Error reading ${metaFile}:`, e);
      }
    }

    // Discover volumes on disk
    let volumes = [];
    if (bookMeta.volumes && Array.isArray(bookMeta.volumes)) {
      volumes = bookMeta.volumes.filter(v => {
        const p = path.join(bookDir, v.slug, 'pages');
        return fs.existsSync(p);
      });
    }

    if (volumes.length === 0) {
      // Disk scan
      try {
        const entries = fs.readdirSync(bookDir, { withFileTypes: true });
        volumes = entries
          .filter(e => e.isDirectory() && /^volume-\d+$/.test(e.name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
          .map(e => ({ slug: e.name, label: e.name.replace('-', ' ').toUpperCase() }));
      } catch {}
    }

    // Add sample volume for tarikh-at-tabari if available
    const sampleDir = path.join(__dirname, 'sample');
    if (cfg.id === 'tarikh-at-tabari' && fs.existsSync(sampleDir)) {
      volumes = [{ slug: 'volume-00', label: 'Volume 0 — Sample' }, ...volumes];
    }

    books.push({
      id: cfg.id,
      slug: bookMeta.slug || cfg.slug,
      title: bookMeta.title || cfg.defaultTitle,
      author: bookMeta.author || cfg.defaultAuthor,
      publisher: bookMeta.publisher || '',
      type: bookMeta.type || [cfg.badge],
      badge: cfg.badge,
      dir: bookDir,
      volumeCount: volumes.length,
      volumes,
    });
  }
  return books;
}

function resolveBook(bookKey) {
  const books = getBookRegistry();
  if (!bookKey || bookKey === 'default') return books[0];
  const normalized = decodeURIComponent(bookKey).toLowerCase();
  return (
    books.find(
      b =>
        b.id.toLowerCase() === normalized ||
        b.slug.toLowerCase() === normalized ||
        BOOK_CONFIGS.find(c => c.id === b.id && c.aliases.some(a => a.toLowerCase() === normalized))
    ) || books[0]
  );
}

const ok = s => /^volume-\d+$/.test(s);
const okp = s => /^\d+$/.test(s);
const send = (res, code, type, body) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};
const json = (res, o) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(o));

const DIST = path.join(__dirname, 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function serveDist(res, urlPath) {
  const f = path.join(DIST, urlPath === '/' ? 'index.html' : path.normalize(urlPath));
  if (!f.startsWith(DIST + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile())
    return send(res, 404, 'text/plain', 'not found');
  send(res, 200, MIME[path.extname(f)] || 'application/octet-stream', fs.readFileSync(f));
}

// Edge TTS Engine
const VOICES = ['bn-BD-PradeepNeural', 'bn-BD-NabanitaNeural'];
const TTS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tunedreader-tts-'));
let busy = 0;
const waiting = [];
const queue = job => {
  const run = () => {
    busy++;
    job(() => {
      busy--;
      waiting.length && waiting.shift()();
    });
  };
  busy < 4 ? run() : waiting.push(run);
};

function tts(req, res) {
  let b = '';
  req.on('data', c => {
    b += c;
    if (b.length > 30000) req.destroy();
  });
  req.on('end', () => {
    let q;
    try {
      q = JSON.parse(b);
    } catch {
      return send(res, 400, 'text/plain', 'bad json');
    }
    const rate = Math.max(-80, Math.min(100, +q.rate || 0));
    const pitch = Math.max(-50, Math.min(50, +q.pitch || 0));
    const vol = Math.max(-50, Math.min(50, +q.volume || 0));
    const voice = q.voice || 'bn-BD-PradeepNeural';

    if (!VOICES.includes(voice) || !q.text || typeof q.text !== 'string') {
      return send(res, 400, 'text/plain', 'bad request');
    }

    const out = path.join(
      TTS_DIR,
      crypto.createHash('sha1').update(JSON.stringify([voice, rate, pitch, vol, q.text])).digest('hex') + '.mp3'
    );
    const done = () => {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
      fs.createReadStream(out).pipe(res);
    };

    if (fs.existsSync(out)) return done();

    queue(cb =>
      execFile(
        'python3',
        [
          '-m',
          'edge_tts',
          '--voice',
          voice,
          '--text=' + q.text,
          '--rate=' + (rate >= 0 ? '+' : '') + rate + '%',
          '--pitch=' + (pitch >= 0 ? '+' : '') + pitch + 'Hz',
          '--volume=' + (vol >= 0 ? '+' : '') + vol + '%',
          '--write-media',
          out,
        ],
        { timeout: 60000 },
        err => {
          cb();
          err ? send(res, 502, 'text/plain', String(err.message).slice(0, 200)) : done();
        }
      )
    );
  });
}

// Word Flagging / Corrections
const FLAGGED = path.join(__dirname, 'flagged.json');
const WHERE = path.join(__dirname, 'flagged-where.json');
const readWhere = () => {
  try {
    return JSON.parse(fs.readFileSync(WHERE, 'utf8'));
  } catch {
    return [];
  }
};

function flag(req, res) {
  let b = '';
  req.on('data', c => {
    b += c;
    if (b.length > 2000) req.destroy();
  });
  req.on('end', () => {
    let q, w;
    try {
      q = JSON.parse(b);
      w = q.word;
    } catch {
      return send(res, 400, 'text/plain', 'bad json');
    }
    if (typeof w !== 'string' || !/^[\u0980-\u09FF]{1,60}$/.test(w)) return send(res, 400, 'text/plain', 'bad word');
    let list = [];
    try {
      list = JSON.parse(fs.readFileSync(FLAGGED, 'utf8'));
    } catch {}

    if (
      ok(q.volume) &&
      okp(String(q.page)) &&
      Number.isInteger(q.paragraph) &&
      Number.isInteger(q.wordIndex) &&
      q.paragraph >= 0 &&
      q.wordIndex >= 0
    ) {
      const where = readWhere();
      const exists = where.some(
        e =>
          e.word === w &&
          e.volume === q.volume &&
          e.page === String(q.page) &&
          e.paragraph === q.paragraph &&
          e.wordIndex === q.wordIndex &&
          (e.book || 'tarikh-at-tabari') === (q.book || 'tarikh-at-tabari')
      );
      if (!exists) {
        fs.writeFileSync(
          WHERE,
          JSON.stringify(
            [
              ...where,
              {
                word: w,
                book: q.book || 'tarikh-at-tabari',
                volume: q.volume,
                page: String(q.page),
                paragraph: q.paragraph,
                wordIndex: q.wordIndex,
                suggestion: q.suggestion || '',
                at: new Date().toISOString(),
              },
            ],
            null,
            1
          )
        );
      }
    }
    if (!list.includes(w)) {
      list.push(w);
      fs.writeFileSync(FLAGGED, JSON.stringify(list, null, 1));
    }
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify(list));
  });
}

const server = http.createServer((req, res) => {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/tts') return tts(req, res);

  if (req.url === '/flagged.json' && req.method === 'GET') {
    return send(res, 200, 'application/json; charset=utf-8', fs.existsSync(FLAGGED) ? fs.readFileSync(FLAGGED) : '[]');
  }

  if (req.url.split('?')[0] === '/flagged/where' && req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost');
    const w = urlObj.searchParams.get('word');
    const all = readWhere();
    return send(
      res,
      200,
      'application/json; charset=utf-8',
      JSON.stringify(w ? all.filter(e => e.word === w.normalize('NFC')) : all)
    );
  }

  if (req.url === '/unflag' && req.method === 'POST') {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 2000) req.destroy();
    });
    return req.on('end', () => {
      let w;
      try {
        w = JSON.parse(b).word;
      } catch {
        return send(res, 400, 'text/plain', 'bad json');
      }
      if (typeof w !== 'string') return send(res, 400, 'text/plain', 'bad word');
      let list = [];
      try {
        list = JSON.parse(fs.readFileSync(FLAGGED, 'utf8'));
      } catch {}
      list = list.filter(x => x !== w);
      fs.writeFileSync(FLAGGED, JSON.stringify(list, null, 1));
      if (fs.existsSync(WHERE)) {
        fs.writeFileSync(WHERE, JSON.stringify(readWhere().filter(e => e.word !== w), null, 1));
      }
      send(res, 200, 'application/json; charset=utf-8', JSON.stringify(list));
    });
  }

  if (req.url === '/respell' && req.method === 'POST') {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 2000) req.destroy();
    });
    return req.on('end', () => {
      let q;
      try {
        q = JSON.parse(b);
      } catch {
        return send(res, 400, 'text/plain', 'bad json');
      }
      const bn = /^[\u0980-\u09FF]{1,60}$/;
      if (typeof q.word !== 'string' || typeof q.to !== 'string' || !bn.test(q.word) || !bn.test(q.to)) {
        return send(res, 400, 'text/plain', 'bad word');
      }
      const expDir = path.join(__dirname, 'explicit');
      if (!fs.existsSync(expDir)) fs.mkdirSync(expDir, { recursive: true });
      const f = path.join(expDir, 'part-user.json');
      let m = {};
      try {
        m = JSON.parse(fs.readFileSync(f, 'utf8'));
      } catch {}
      m[q.word] = q.to;
      fs.writeFileSync(f, JSON.stringify(m, null, 1));

      const p = path.join(__dirname, 'pronounce.json');
      if (fs.existsSync(p)) {
        const t = fs.readFileSync(p, 'utf8').replace(/\s*}\s*$/, '');
        fs.writeFileSync(p, t + ',\n  ' + JSON.stringify(q.word) + ': ' + JSON.stringify(q.to) + '\n}\n');
      }
      send(res, 200, 'application/json; charset=utf-8', '{"ok":true}');
    });
  }

  if (req.url === '/flag' && req.method === 'POST') return flag(req, res);

  const u = decodeURIComponent(req.url.split('?')[0]).split('/').filter(Boolean);

  try {
    if (u[0] === 'pronounce-explicit.json') {
      const dir = path.join(__dirname, 'explicit');
      const all = {};
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir).sort()) {
          if (f.endsWith('.json')) {
            try {
              Object.assign(all, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
            } catch {}
          }
        }
      }
      return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(all));
    }

    if (u[0] === 'pronounce.json') {
      const p = path.join(__dirname, 'pronounce.json');
      return send(res, 200, 'application/json; charset=utf-8', fs.existsSync(p) ? fs.readFileSync(p) : '{}');
    }

    // Books API
    if (u[0] === 'api' && u[1] === 'books') {
      const books = getBookRegistry();
      if (u.length === 2) {
        // Return list of books
        return json(
          res,
          books.map(b => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            type: b.type,
            badge: b.badge,
            volumeCount: b.volumeCount,
            volumes: b.volumes,
          }))
        );
      }

      const book = resolveBook(u[2]);
      if (!book) return send(res, 404, 'text/plain', 'book not found');

      if (u.length === 3 || (u.length === 4 && u[3] === 'volumes')) {
        return json(res, book.volumes);
      }

      const volSlug = u[3];
      const volPath = volSlug === 'volume-00' ? path.join(__dirname, 'sample') : path.join(book.dir, volSlug, 'pages');

      if (u.length === 4) {
        // Pages in volume
        if (!fs.existsSync(volPath)) return json(res, []);
        const pages = fs.readdirSync(volPath).filter(okp).sort();
        return json(res, pages);
      }

      const pageNum = u[4];
      const file = u[5] || 'bangla.md';
      if (!['bangla.md', 'gvrow.txt', 'photo.jpg'].includes(file)) return send(res, 400, 'text/plain', 'bad file');

      const target = path.join(volPath, pageNum, file);
      if (!fs.existsSync(target)) return send(res, 404, 'text/plain', 'not found');
      return send(res, 200, file.endsWith('.jpg') ? 'image/jpeg' : 'text/plain; charset=utf-8', fs.readFileSync(target));
    }

    // Legacy default /api fallback routes
    if (u[0] === 'api') {
      const defaultBook = resolveBook('tarikh-at-tabari');
      if (u[1] === 'volumes') {
        return json(res, defaultBook.volumes);
      }
      if (ok(u[1])) {
        const volPath = u[1] === 'volume-00' ? path.join(__dirname, 'sample') : path.join(defaultBook.dir, u[1], 'pages');
        if (u.length === 2) {
          if (!fs.existsSync(volPath)) return json(res, []);
          return json(res, fs.readdirSync(volPath).filter(okp).sort());
        }
        const pageNum = u[2];
        const file = u[3] || 'bangla.md';
        if (!okp(pageNum) || !['bangla.md', 'gvrow.txt', 'photo.jpg'].includes(file))
          return send(res, 400, 'text/plain', 'bad path');
        const target = path.join(volPath, pageNum, file);
        if (!fs.existsSync(target)) return send(res, 404, 'text/plain', 'not found');
        return send(res, 200, file.endsWith('.jpg') ? 'image/jpeg' : 'text/plain; charset=utf-8', fs.readFileSync(target));
      }
    }

    if (fs.existsSync(DIST)) {
      return serveDist(res, req.url.split('?')[0]);
    }
    return send(res, 200, 'text/plain', 'Tuned Book Reader Backend is running');
  } catch (e) {
    send(res, 500, 'text/plain', String(e));
  }
});

server.listen(PORT, () => {
  console.log(`Tuned Book Reader Server running on http://localhost:${PORT}`);
});
