// LocalStorage manager for tuned-book-reader

const HISTORY_KEY = 'tbr_history';
const PREFS_KEY = 'tbr_prefs';
const FLAGGED_KEY = 'tbr_flagged';

export function getStorage(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getPreferences() {
  return getStorage(PREFS_KEY, {
    theme: 'light', // 'light' | 'dark' | 'sepia'
    fontSize: 20,
    origText: true, // default original text mode
    pronMode: 'refined', // 'refined' | 'explicit'
    rate: 1.0,
    pitch: 0,
    volume: 0,
    readerId: 'bn-BD-PradeepNeural|Storyteller',
    autoPlayCountdown: true,
    backgroundPlay: true,
  });
}

export function savePreferences(prefs) {
  const current = getPreferences();
  setStorage(PREFS_KEY, { ...current, ...prefs });
}

// History structure per book: { [bookId]: { bookId, bookTitle, volume, page, paragraph, word, place, timestamp } }
export function getReadingHistory() {
  return getStorage(HISTORY_KEY, {});
}

export function getLastRead(bookId) {
  const hist = getReadingHistory();
  return hist[bookId] || null;
}

export function saveLastRead({ bookId, bookTitle, volume, page, paragraph = 0, word = null, place = 1 }) {
  if (!bookId || !volume || !page) return;
  const hist = getReadingHistory();
  hist[bookId] = {
    bookId,
    bookTitle: bookTitle || bookId,
    volume,
    page: String(page).padStart(4, '0'),
    paragraph,
    word,
    place,
    timestamp: Date.now(),
  };
  setStorage(HISTORY_KEY, hist);
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
}
