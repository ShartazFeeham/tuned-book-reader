// Script to package pure text contents into public/data/books for static/Netlify serving
const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve('/Users/shartazfeeham/Documents/personal/book-extraction');
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'data', 'books');

const BOOKS = [
  {
    id: 'tarikh-at-tabari',
    slug: 'the-history-of-al-tabari',
    title: 'তারীখে তাবারী (তারিখুর রুসুল ওয়াল মুলূক)',
    author: 'ইমাম আবু জাফর মুহাম্মদ ইবনে জারীর আত-তাবারী (রহঃ)',
    publisher: 'ইসলামিক ফাউন্ডেশন / দারুল মাআরিফ',
    badge: 'ইতিহাস ও সীরাত',
    type: ['ইতিহাস', 'ইসলামী ইতিহাস', 'সীরাত', 'তারীখ'],
    sourceDir: path.join(SOURCE_ROOT, 'tarikh-at-tabari'),
  },
  {
    id: 'ihya-ulumuddin',
    slug: 'ihya-ulumuddin',
    title: 'এহইয়াউ উলুমুদ্দীন',
    author: 'হুজ্জাতুল ইসলাম ইমাম আবু হামিদ মুহাম্মদ আল-গাযযালী (রহঃ)',
    publisher: 'মদীনা পাবলিকেশন্স',
    badge: 'তাযকিয়াহ ও আখলাক',
    type: ['তাযকিয়াহ', 'আত্মশুদ্ধি', 'আখলাক', 'দর্শন', 'আধ্যাত্মিকতা'],
    sourceDir: path.join(SOURCE_ROOT, 'gajjali-r', 'ihya-ulumuddin'),
  },
];

const okp = s => /^\d+$/.test(s);

function bundle() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const manifest = [];

  for (const book of BOOKS) {
    console.log(`Packaging ${book.title}...`);
    const bookDest = path.join(OUT_DIR, book.id);
    if (!fs.existsSync(bookDest)) fs.mkdirSync(bookDest, { recursive: true });

    let rawMeta = {};
    const metaPath = path.join(book.sourceDir, 'book.json');
    if (fs.existsSync(metaPath)) {
      try {
        rawMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {}
    }

    const volumeEntries = fs
      .readdirSync(book.sourceDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^volume-\d+$/.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const volumes = [];

    for (const vEntry of volumeEntries) {
      const volSlug = vEntry.name;
      const volNum = parseInt(volSlug.replace('volume-', ''), 10);
      const volLabel = `খণ্ড ${volNum}`;

      const pagesDir = path.join(book.sourceDir, volSlug, 'pages');
      if (!fs.existsSync(pagesDir)) continue;

      const pageDirs = fs.readdirSync(pagesDir).filter(okp).sort();
      const pages = [];

      const volDest = path.join(bookDest, volSlug);
      if (!fs.existsSync(volDest)) fs.mkdirSync(volDest, { recursive: true });

      for (const p of pageDirs) {
        const pDir = path.join(pagesDir, p);
        const candidates = ['bangla.md', 'richtext.md', 'page.md', 'text.md'];
        let mdFile = null;
        for (const c of candidates) {
          const testPath = path.join(pDir, c);
          if (fs.existsSync(testPath)) {
            mdFile = testPath;
            break;
          }
        }
        if (mdFile) {
          pages.push(p);
          const outMd = path.join(volDest, `${p}.md`);
          fs.copyFileSync(mdFile, outMd);
        }
      }

      // Also copy sample volume for tabari if volume-00
      volumes.push({
        slug: volSlug,
        number: volNum,
        label: volLabel,
        pageCount: pages.length,
        pages,
      });
    }

    manifest.push({
      id: book.id,
      slug: book.slug,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      badge: book.badge,
      type: book.type,
      volumeCount: volumes.length,
      volumes,
    });
  }

  // Write manifest
  const manifestPath = path.join(__dirname, '..', 'public', 'data', 'books.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to ${manifestPath} with ${manifest.length} books.`);
}

bundle();
