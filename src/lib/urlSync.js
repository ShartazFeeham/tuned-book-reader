// Deep URL synchronization & query parser

export function normalizeVolume(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^volume-\d+$/i.test(s)) {
    const num = parseInt(s.replace(/volume-/i, ''), 10);
    return `volume-${String(num).padStart(2, '0')}`;
  }
  if (/^\d+$/.test(s)) {
    return `volume-${String(parseInt(s, 10)).padStart(2, '0')}`;
  }
  return s;
}

export function normalizePage(p) {
  if (!p) return null;
  const s = String(p).trim();
  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10)).padStart(4, '0');
  }
  return s;
}

// Parses URL query parameters flexibly:
// Handles standard `?book=...&vol=...&page=...&word=...&place=...`
// And also comma separated `?vol=28,page=100,word=আলি,place=3`
export function parseCurrentUrl() {
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const search = url.search.startsWith('?') ? url.search.slice(1) : url.search;

  const params = {};

  if (search) {
    const tokens = search.split(/[&,]/);
    for (const token of tokens) {
      const [rawKey, ...valParts] = token.split('=');
      if (rawKey && valParts.length > 0) {
        const k = decodeURIComponent(rawKey.trim()).toLowerCase();
        const v = decodeURIComponent(valParts.join('=').trim());
        params[k] = v;
      }
    }
  }

  // Hash support for legacy links
  if (url.hash && url.hash.length > 1) {
    const hashStr = url.hash.slice(1);
    if (hashStr.includes('/')) {
      const [hv, hp] = hashStr.split('/');
      if (!params.vol && hv) params.vol = hv;
      if (!params.page && hp) params.page = hp;
    }
  }

  let bookId = params.book || null;
  if (!bookId && pathParts[0] === 'book' && pathParts[1]) {
    bookId = pathParts[1];
  }

  const vol = normalizeVolume(params.vol);
  const page = normalizePage(params.page);
  const word = params.word ? params.word.trim() : null;
  const place = params.place ? Math.max(1, parseInt(params.place, 10) || 1) : 1;

  let view = 'home';
  if (pathParts[0] === 'dev' || params.view === 'dev') {
    view = 'dev';
  } else if (vol || page) {
    view = 'reader';
  } else if (bookId || params.view === 'book-detail') {
    view = 'book-detail';
  }

  return {
    view,
    bookId,
    vol,
    page,
    word,
    place,
  };
}

export function buildUrl({ view = 'home', bookId, vol, page, word, place }) {
  const url = new URL(window.location.origin);

  if (view === 'dev') {
    url.pathname = '/';
    url.search = '?view=dev';
    return url.pathname + url.search;
  }

  if (view === 'home' && !bookId && !vol && !page) {
    url.pathname = '/';
    url.search = '';
    return '/';
  }

  const searchParams = new URLSearchParams();
  if (bookId) searchParams.set('book', bookId);

  if (view === 'book-detail') {
    url.pathname = '/';
    url.search = searchParams.toString();
    return url.pathname + (url.search ? '?' + url.search : '');
  }

  if (vol) {
    const vNum = vol.replace(/^volume-0?/, '');
    searchParams.set('vol', vNum || vol);
  }
  if (page) {
    const pNum = parseInt(page, 10);
    searchParams.set('page', isNaN(pNum) ? page : String(pNum));
  }
  if (word) {
    searchParams.set('word', word);
    if (place && place > 1) {
      searchParams.set('place', String(place));
    }
  }

  url.pathname = '/';
  url.search = searchParams.toString();
  return url.pathname + (url.search ? '?' + url.search : '');
}

export function updateUrl(state, replace = false) {
  const newUrl = buildUrl(state);
  const currentUrl = window.location.pathname + window.location.search;
  if (newUrl !== currentUrl) {
    if (replace) {
      window.history.replaceState({ ...state }, '', newUrl);
    } else {
      window.history.pushState({ ...state }, '', newUrl);
    }
  }
}
