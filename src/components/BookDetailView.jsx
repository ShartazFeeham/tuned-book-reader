import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Clock, ChevronDown, ChevronRight, Play } from 'lucide-react';
import { formatTimeAgo, toBnNum } from '../lib/storage.js';

export function BookDetailView({
  book,
  lastRead,
  onBackToHome,
  onSelectPage,
}) {
  const volumes = book?.volumes || [];

  // Determine initial selected volume (default to last read volume if present, or null for volume selector)
  const [selectedVol, setSelectedVol] = useState(() => {
    if (lastRead?.volume && volumes.some(v => v.slug === lastRead.volume)) {
      return lastRead.volume;
    }
    return volumes[0]?.slug || null;
  });

  const [volPages, setVolPages] = useState({});
  const [loadingVol, setLoadingVol] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

  const getBnBookTitle = b => {
    if (b.id === 'tarikh-at-tabari' || b.slug === 'the-history-of-al-tabari') {
      return 'তারীখে তাবারী (তারিখুর রুসুল ওয়াল মুলূক)';
    }
    if (b.id === 'ihya-ulumuddin' || b.slug === 'ihya-ulumuddin') {
      return 'এহইয়াউ উলুমুদ্দীন';
    }
    return b.title;
  };

  const getBnBookAuthor = b => {
    if (b.id === 'tarikh-at-tabari' || b.slug === 'the-history-of-al-tabari') {
      return 'ইমাম আবু জাফর মুহাম্মদ ইবনে জারীর আত-তাবারী (রহঃ)';
    }
    if (b.id === 'ihya-ulumuddin' || b.slug === 'ihya-ulumuddin') {
      return 'হুজ্জাতুল ইসলাম ইমাম আবু হামিদ আল-গাযযালী (রহঃ)';
    }
    return b.author;
  };

  // Load pages for selected volume
  const loadPagesForVolume = async volSlug => {
    if (!volSlug) return;
    if (volPages[volSlug] && volPages[volSlug].length > 0) return;

    // Check if the book object itself already contains pages for this volume
    const foundVol = book?.volumes?.find(v => v.slug === volSlug);
    if (foundVol?.pages && foundVol.pages.length > 0) {
      setVolPages(prev => ({ ...prev, [volSlug]: foundVol.pages }));
      return;
    }

    setLoadingVol(true);
    try {
      // 1. Try static manifest
      const mRes = await fetch('/data/books.json');
      const mCt = mRes.headers.get('content-type') || '';
      if (mRes.ok && mCt.includes('json')) {
        const manifest = await mRes.json();
        const curBook = manifest.find(b => b.id === book.id || b.slug === book.id);
        const curVol = curBook?.volumes?.find(v => v.slug === volSlug);
        if (curVol?.pages && curVol.pages.length > 0) {
          setVolPages(prev => ({ ...prev, [volSlug]: curVol.pages }));
          setLoadingVol(false);
          return;
        }
      }

      // 2. Try API endpoint fallback
      const res = await fetch(`/api/books/${book.id}/${volSlug}`);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('json')) {
        const pagesList = await res.json();
        if (Array.isArray(pagesList) && pagesList.length > 0) {
          setVolPages(prev => ({ ...prev, [volSlug]: pagesList }));
        }
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
      if (lastRead && lastRead.volume === selectedVol && lastRead.page) {
        const pageNum = parseInt(lastRead.page, 10);
        setExpandedBatch(Math.floor((pageNum - 1) / 20));
      } else {
        setExpandedBatch(0);
      }
    }
  }, [selectedVol]);

  const activeVolObj = volumes.find(v => v.slug === selectedVol) || volumes[0];
  const pages = (selectedVol && volPages[selectedVol]) || [];

  // Group pages into 20-page batches
  const batches = [];
  const batchSize = 20;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batchPages = pages.slice(i, i + batchSize);
    const startNum = parseInt(batchPages[0], 10);
    const endNum = parseInt(batchPages[batchPages.length - 1], 10);
    const batchIdx = Math.floor(i / batchSize);
    const hasLastReadInBatch =
      lastRead &&
      lastRead.volume === selectedVol &&
      lastRead.page &&
      batchPages.includes(lastRead.page);

    batches.push({
      batchIndex: batchIdx,
      startNum,
      endNum,
      label: `পৃষ্ঠা ${toBnNum(startNum)} – ${toBnNum(endNum)}`,
      pages: batchPages,
      hasLastReadInBatch,
    });
  }

  return (
    <div className="book-detail-view">
      <button className="back-btn" onClick={onBackToHome}>
        <ArrowLeft size={16} /> লাইব্রেরিতে ফিরুন
      </button>

      <div className="book-detail-header">
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
          {getBnBookTitle(book)}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
          {getBnBookAuthor(book)}
        </p>

        {lastRead && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              background: 'var(--last-read-bg)',
              border: '1px solid var(--last-read-border)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginTop: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--last-read-text)' }}>
                শেষ পঠিত: খণ্ড {toBnNum(lastRead.volume?.replace(/^volume-0?/, ''))} · পৃষ্ঠা{' '}
                {toBnNum(parseInt(lastRead.page, 10))} ({formatTimeAgo(lastRead.timestamp)})
              </span>
            </div>
            <button
              className="badge-btn"
              style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
              onClick={() => onSelectPage(book.id, lastRead.volume, lastRead.page)}
            >
              <Play size={13} /> পড়ুন
            </button>
          </div>
        )}
      </div>

      {/* Volume Selector Horizontal Tabs / Grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
            খণ্ড নির্বাচন করুন ({toBnNum(volumes.length)}টি খণ্ড)
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {volumes.map(v => {
            const isCur = v.slug === selectedVol;
            const isLastReadVol = lastRead && lastRead.volume === v.slug;
            const volNum = parseInt(v.slug.replace('volume-', ''), 10);

            return (
              <button
                key={v.slug}
                onClick={() => setSelectedVol(v.slug)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: isCur
                    ? '2px solid var(--accent)'
                    : isLastReadVol
                    ? '1.5px solid var(--last-read-border)'
                    : '1px solid var(--border)',
                  background: isCur
                    ? 'var(--accent-soft)'
                    : isLastReadVol
                    ? 'var(--last-read-bg)'
                    : 'var(--surface-subtle)',
                  color: isCur ? 'var(--accent)' : 'var(--text)',
                  fontWeight: isCur || isLastReadVol ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'var(--transition)',
                }}
              >
                <span>খণ্ড {toBnNum(volNum)}</span>
                {isLastReadVol && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600 }}>
                    শেষ পড়া
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 20-Page Batches for Currently Selected Volume */}
      {selectedVol && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={17} color="var(--accent)" />
              খণ্ড {toBnNum(parseInt(selectedVol.replace('volume-', ''), 10))} এর পৃষ্ঠাসমূহ ({toBnNum(pages.length)} পৃষ্ঠা)
            </h3>
          </div>

          {loadingVol && !pages.length ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              পৃষ্ঠাসমূহ লোড হচ্ছে…
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
                          <span className="last-read-tag" style={{ fontSize: '0.72rem' }}>
                            শেষ পড়া: পৃষ্ঠা {toBnNum(parseInt(lastRead.page, 10))}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {isBatchExpanded ? '▲' : '▼'}
                      </span>
                    </div>

                    {isBatchExpanded && (
                      <div className="batch-pages-grid">
                        {batch.pages.map(p => {
                          const isLastReadPage =
                            lastRead &&
                            lastRead.volume === selectedVol &&
                            String(p) === String(lastRead.page);
                          const pageNum = parseInt(p, 10);

                          return (
                            <div
                              key={p}
                              className={`page-cell ${isLastReadPage ? 'is-last-read' : ''}`}
                              onClick={() => onSelectPage(book.id, selectedVol, p)}
                            >
                              <span>পৃষ্ঠা {toBnNum(pageNum)}</span>
                              {isLastReadPage && <small>শেষ পঠিত</small>}
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
}
