import React, { useState } from 'react';
import { X, Home, ChevronRight, Book, Check } from 'lucide-react';

export function PageDrawer({
  isOpen,
  onClose,
  book,
  volumes,
  currentVol,
  pages,
  currentPage,
  onSelectVolume,
  onSelectPage,
  onGoHome,
}) {
  const [expandedBatch, setExpandedBatch] = useState(() => {
    if (!currentPage || !pages.length) return 0;
    const pageNum = parseInt(currentPage, 10);
    return Math.floor((pageNum - 1) / 20);
  });

  if (!isOpen) return null;

  // Group pages into 20-page batches
  const batches = [];
  const batchSize = 20;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batchPages = pages.slice(i, i + batchSize);
    const startNum = parseInt(batchPages[0], 10);
    const endNum = parseInt(batchPages[batchPages.length - 1], 10);
    batches.push({
      batchIndex: Math.floor(i / batchSize),
      label: `Pages ${startNum} – ${endNum}`,
      pages: batchPages,
    });
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="pages-drawer">
        <div className="drawer-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              {book?.title || 'Book Navigation'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {currentVol ? currentVol.replace('-', ' ').toUpperCase() : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Back to Home Link */}
          <div
            className="drawer-item"
            style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}
            onClick={() => {
              onClose();
              onGoHome();
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Home size={16} /> Back to Library
            </span>
            <ChevronRight size={16} />
          </div>

          {/* Volume selection if multi-volume */}
          {volumes && volumes.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Volumes
              </label>
              <select
                className="setting-select"
                value={currentVol}
                onChange={e => onSelectVolume(e.target.value)}
                style={{ padding: '8px 10px', fontSize: '0.85rem' }}
              >
                {volumes.map(v => (
                  <option key={v.slug} value={v.slug}>
                    {v.label || v.slug}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 20-Page Batches list */}
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Pages in Volume ({pages.length})
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {batches.map(b => {
              const isExpanded = expandedBatch === b.batchIndex;
              const hasCurrentPage = b.pages.includes(currentPage);

              return (
                <div key={b.batchIndex} className={`batch-row ${hasCurrentPage ? 'has-last-read' : ''}`}>
                  <div
                    className="batch-header"
                    onClick={() => setExpandedBatch(isExpanded ? null : b.batchIndex)}
                  >
                    <span>{b.label}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="batch-pages-grid" style={{ padding: 8, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      {b.pages.map(p => {
                        const isSelected = p === currentPage;
                        return (
                          <div
                            key={p}
                            className={`page-cell ${isSelected ? 'is-last-read' : ''}`}
                            onClick={() => {
                              onSelectPage(p);
                              onClose();
                            }}
                          >
                            <span>{parseInt(p, 10)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
