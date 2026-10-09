import React from 'react';
import { Book, Play, Clock, Sparkles, Terminal, ChevronRight } from 'lucide-react';
import { formatTimeAgo } from '../lib/storage.js';

export function HomePage({
  books,
  history,
  onSelectBook,
  onResumeReading,
  onOpenDevMode,
}) {
  const historyEntries = Object.values(history).filter(h => h && h.bookId);

  return (
    <div className="home-view">
      <div className="brand-section">
        <h1 className="brand-title">Tuned Book Reader</h1>
        <p className="brand-tagline">
          Clean, audio-enhanced Islamic literature reader with smart Bengali phonetic tuning
        </p>
      </div>

      {/* Last Listened / Read Section */}
      {historyEntries.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 className="section-heading">
            <Clock size={18} color="var(--accent)" />
            Continue Reading
          </h2>
          <div className="last-read-grid">
            {historyEntries.map(entry => {
              const matchedBook = books.find(b => b.id === entry.bookId || b.slug === entry.bookId);
              const volLabel = entry.volume ? entry.volume.replace('-', ' ').toUpperCase() : '';
              const pageNum = entry.page ? parseInt(entry.page, 10) : 1;

              return (
                <div
                  key={entry.bookId}
                  className="last-read-card"
                  onClick={() => onResumeReading(entry)}
                >
                  <div className="last-read-info">
                    <div className="last-read-book">{entry.bookTitle || matchedBook?.title}</div>
                    <div className="last-read-detail">
                      <span>{volLabel}</span>
                      <span>·</span>
                      <span>Page {pageNum}</span>
                      {entry.word && <span>(at "{entry.word}")</span>}
                    </div>
                    <div className="last-read-time">Last read {formatTimeAgo(entry.timestamp)}</div>
                  </div>
                  <button
                    className="last-read-play-btn"
                    title="Resume reading"
                    onClick={e => {
                      e.stopPropagation();
                      onResumeReading(entry);
                    }}
                    aria-label="Resume"
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
          Available Books
        </h2>
        <div className="books-grid">
          {books.map(book => {
            const lastRead = history[book.id] || history[book.slug];
            const typeBadges = Array.isArray(book.type) ? book.type.slice(0, 2) : [book.badge || 'Classic'];

            return (
              <div
                key={book.id}
                className="book-card"
                onClick={() => onSelectBook(book)}
              >
                <div className="book-card-header">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {typeBadges.map((badge, i) => (
                      <span key={i} className="book-badge">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                </div>

                <div className="book-card-footer">
                  <span className="book-vol-count">
                    {book.volumeCount} {book.volumeCount === 1 ? 'Volume' : 'Volumes'}
                  </span>
                  {lastRead ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.78rem' }}>
                      Page {parseInt(lastRead.page, 10)} · {formatTimeAgo(lastRead.timestamp)}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      Read <ChevronRight size={14} />
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
          <span>Dev Mode · Flagged Words & Suggestions</span>
        </button>
      </footer>
    </div>
  );
}
