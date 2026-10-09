import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { formatTimeAgo } from '../lib/storage.js';

export function BookDetailView({
  book,
  lastRead,
  onBackToHome,
  onSelectPage,
}) {
  const [selectedVol, setSelectedVol] = useState(null);
  const [volPages, setVolPages] = useState({});
  const [loadingVol, setLoadingVol] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

  const volumes = book?.volumes || [];

  // Automatically select the volume that has last read if available
  useEffect(() => {
    if (lastRead?.volume && volumes.some(v => v.slug === lastRead.volume)) {
      setSelectedVol(lastRead.volume);
    } else if (volumes.length > 0 && !selectedVol) {
      setSelectedVol(volumes[0].slug);
    }
  }, [book, lastRead]);

  // Load pages for a volume
  const loadPagesForVolume = async volSlug => {
    if (volPages[volSlug]) return;
    setLoadingVol(true);
    try {
      const res = await fetch(`/api/books/${book.id}/${volSlug}`);
      if (res.ok) {
        const pagesList = await res.json();
        setVolPages(prev => ({ ...prev, [volSlug]: pagesList }));
      }
    } catch (e) {
      console.error('Failed to load volume pages:', e);
    } finally {
      setLoadingVol(false);
    }
  };

  useEffect(() => {
    if (selectedVol) {
      loadPagesForVolume(selectedVol);
      // Auto expand batch of last read page if in this volume
      if (lastRead && lastRead.volume === selectedVol && lastRead.page) {
        const pageNum = parseInt(lastRead.page, 10);
        setExpandedBatch(Math.floor((pageNum - 1) / 20));
      } else {
        setExpandedBatch(0);
      }
    }
  }, [selectedVol]);

  const toggleVolume = volSlug => {
    if (selectedVol === volSlug) {
      setSelectedVol(null);
    } else {
      setSelectedVol(volSlug);
    }
  };

  return (
    <div className="book-detail-view">
      <button className="back-btn" onClick={onBackToHome}>
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div className="book-detail-header">
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(book?.type || ['Classic']).slice(0, 2).map((t, i) => (
            <span key={i} className="book-badge">
              {t}
            </span>
          ))}
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
          {book?.title}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
          {book?.author}
        </p>
        {lastRead && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              color: 'var(--accent)',
              fontWeight: 600,
              background: 'var(--accent-soft)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              marginTop: 4,
            }}
          >
            <Clock size={14} />
            <span>
              Last read {lastRead.volume?.replace('-', ' ').toUpperCase()} · Page{' '}
              {parseInt(lastRead.page, 10)} ({formatTimeAgo(lastRead.timestamp)})
            </span>
          </div>
        )}
      </div>

      <div className="volume-list">
        {volumes.map(vol => {
          const isSelected = selectedVol === vol.slug;
          const isLastReadVol = lastRead && lastRead.volume === vol.slug;
          const pages = volPages[vol.slug] || [];

          // Group into 20-page batches
          const batches = [];
          const batchSize = 20;
          for (let i = 0; i < pages.length; i += batchSize) {
            const batchPages = pages.slice(i, i + batchSize);
            const startNum = parseInt(batchPages[0], 10);
            const endNum = parseInt(batchPages[batchPages.length - 1], 10);
            const batchIdx = Math.floor(i / batchSize);
            const hasLastReadInBatch =
              isLastReadVol &&
              lastRead.page &&
              batchPages.includes(lastRead.page);

            batches.push({
              batchIndex: batchIdx,
              startNum,
              endNum,
              label: `Pages ${startNum} – ${endNum}`,
              pages: batchPages,
              hasLastReadInBatch,
            });
          }

          return (
            <div
              key={vol.slug}
              className={`volume-card ${isLastReadVol ? 'has-last-read' : ''}`}
            >
              <div
                className="volume-card-header"
                onClick={() => toggleVolume(vol.slug)}
              >
                <div className="volume-label">
                  <BookOpen size={18} color="var(--accent)" />
                  <span>{vol.label || vol.slug}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isLastReadVol && (
                    <span className="last-read-tag">
                      Last read {formatTimeAgo(lastRead.timestamp)}
                    </span>
                  )}
                  {isSelected ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {isSelected && (
                <div className="volume-body">
                  {loadingVol && !pages.length ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                      Loading pages…
                    </div>
                  ) : (
                    <div className="batches-container">
                      {batches.map(batch => {
                        const isBatchExpanded = expandedBatch === batch.batchIndex;

                        return (
                          <div
                            key={batch.batchIndex}
                            className={`batch-row ${batch.hasLastReadInBatch ? 'has-last-read' : ''}`}
                          >
                            <div
                              className="batch-header"
                              onClick={() =>
                                setExpandedBatch(isBatchExpanded ? null : batch.batchIndex)
                              }
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{batch.label}</span>
                                {batch.hasLastReadInBatch && (
                                  <span className="last-read-tag" style={{ fontSize: '0.68rem' }}>
                                    Page {parseInt(lastRead.page, 10)}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {isBatchExpanded ? '▲' : '▼'}
                              </span>
                            </div>

                            {isBatchExpanded && (
                              <div className="batch-pages-grid">
                                {batch.pages.map(p => {
                                  const isLastReadPage =
                                    isLastReadVol && String(p) === String(lastRead.page);

                                  return (
                                    <div
                                      key={p}
                                      className={`page-cell ${isLastReadPage ? 'is-last-read' : ''}`}
                                      onClick={() => onSelectPage(book.id, vol.slug, p)}
                                    >
                                      <span>Page {parseInt(p, 10)}</span>
                                      {isLastReadPage && <small>Last read</small>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
