import React from 'react';
import { Book, Play, Clock, Terminal, ChevronRight } from 'lucide-react';
import { formatTimeAgo, toBnNum } from '../lib/storage.js';

export function HomePage({
  books,
  history,
  onSelectBook,
  onResumeReading,
  onOpenDevMode,
}) {
  const historyEntries = Object.values(history).filter(h => h && h.bookId);

  // Bengali book title and author lookup
  const getBnBookMeta = book => {
    if (book.id === 'tarikh-at-tabari' || book.slug === 'the-history-of-al-tabari') {
      return {
        title: 'তারীখে তাবারী (তারিখুর রুসুল ওয়াল মুলূক)',
        author: 'ইমাম আবু জাফর মুহাম্মদ ইবনে জারীর আত-তাবারী (রহঃ)',
        badges: ['ইতিহাস', 'সীরাত ও খিলাফত'],
        volumeLabel: `${toBnNum(book.volumeCount || 41)}টি খণ্ড`,
      };
    }
    if (book.id === 'ihya-ulumuddin' || book.slug === 'ihya-ulumuddin') {
      return {
        title: 'এহইয়াউ উলুমুদ্দীন',
        author: 'হুজ্জাতুল ইসলাম ইমাম আবু হামিদ আল-গাযযালী (রহঃ)',
        badges: ['তাযকিয়াহ', 'আত্মশুদ্ধি ও আখলাক'],
        volumeLabel: `${toBnNum(book.volumeCount || 5)}টি খণ্ড`,
      };
    }
    return {
      title: book.title,
      author: book.author,
      badges: Array.isArray(book.type) ? book.type : ['কিতাব'],
      volumeLabel: `${toBnNum(book.volumeCount || 1)}টি খণ্ড`,
    };
  };

  return (
    <div className="home-view">
      <div className="brand-section">
        <h1 className="brand-title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          টিউনিং বুক রিডার
        </h1>
        <p className="brand-tagline">
          শ্রুতি ও পাঠের ডিজিটাল কিতাবঘর · স্পষ্ট বাংলা উচ্চারণ ও ফনেটিক টিউনিং
        </p>
      </div>

      {/* Last Listened / Read Section */}
      {historyEntries.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 className="section-heading">
            <Clock size={18} color="var(--accent)" />
            পড়া চালিয়ে যান
          </h2>
          <div className="last-read-grid">
            {historyEntries.map(entry => {
              const matchedBook = books.find(b => b.id === entry.bookId || b.slug === entry.bookId);
              const meta = matchedBook ? getBnBookMeta(matchedBook) : { title: entry.bookTitle };

              const volNum = entry.volume ? entry.volume.replace(/^volume-0?/, '') : '১';
              const pageNum = entry.page ? parseInt(entry.page, 10) : 1;

              return (
                <div
                  key={entry.bookId}
                  className="last-read-card"
                  onClick={() => onResumeReading(entry)}
                >
                  <div className="last-read-info">
                    <div className="last-read-book">{meta.title}</div>
                    <div className="last-read-detail">
                      <span>খণ্ড {toBnNum(volNum)}</span>
                      <span>·</span>
                      <span>পৃষ্ঠা {toBnNum(pageNum)}</span>
                      {entry.word && <span>(শব্দ: "{entry.word}")</span>}
                    </div>
                    <div className="last-read-time">শেষ পঠিত: {formatTimeAgo(entry.timestamp)}</div>
                  </div>
                  <button
                    className="last-read-play-btn"
                    title="পড়া শুরু করুন"
                    onClick={e => {
                      e.stopPropagation();
                      onResumeReading(entry);
                    }}
                    aria-label="পড়া শুরু করুন"
                  >
                    <Play size={18} style={{ marginLeft: 2 }} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Books Library Section */}
      <section>
        <h2 className="section-heading">
          <Book size={18} color="var(--accent)" />
          উপলব্ধ কিতাবসমূহ
        </h2>
        <div className="books-grid">
          {books.map(book => {
            const meta = getBnBookMeta(book);
            const lastRead = history[book.id] || history[book.slug];

            return (
              <div
                key={book.id}
                className="book-card"
                onClick={() => onSelectBook(book)}
              >
                <div className="book-card-header">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {meta.badges.map((badge, i) => (
                      <span key={i} className="book-badge">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <h3 className="book-title">{meta.title}</h3>
                  <p className="book-author">{meta.author}</p>
                </div>

                <div className="book-card-footer">
                  <span className="book-vol-count">{meta.volumeLabel}</span>
                  {lastRead ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem' }}>
                      পৃষ্ঠা {toBnNum(parseInt(lastRead.page, 10))} · {formatTimeAgo(lastRead.timestamp)}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--accent)' }}>
                      পড়ুন <ChevronRight size={15} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dev Mode Link Footer */}
      <footer className="home-footer">
        <button className="dev-link" onClick={onOpenDevMode}>
          <Terminal size={15} />
          <span>ডেভ মোড · চিহ্নিত ও সংশোধিত শব্দসমূহ</span>
        </button>
      </footer>
    </div>
  );
}
