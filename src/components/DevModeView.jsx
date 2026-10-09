import React, { useState, useEffect } from 'react';
import { ArrowLeft, Terminal, Trash2, ExternalLink, RefreshCw } from 'lucide-react';

export function DevModeView({ onBackToHome, onJumpToLocation }) {
  const [flaggedWords, setFlaggedWords] = useState([]);
  const [whereList, setWhereList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, wRes] = await Promise.all([
        fetch('/flagged.json').then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/flagged/where').then(r => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      setFlaggedWords(Array.isArray(fRes) ? fRes : []);
      setWhereList(Array.isArray(wRes) ? wRes : []);
    } catch (e) {
      console.error('Failed to load dev data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUnflag = async (word, e) => {
    e.stopPropagation();
    try {
      await fetch('/unflag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      loadData();
    } catch (e) {
      console.error('Failed to unflag:', e);
    }
  };

  return (
    <div className="dev-view">
      <button className="back-btn" onClick={onBackToHome}>
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={20} color="var(--accent)" />
            Dev Mode · Flagged Words & Pronunciations
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All words flagged during reading or double-clicked for phonetic correction
          </p>
        </div>
        <button className="icon-btn" onClick={loadData} title="Refresh data">
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Loading marked words…
        </div>
      ) : whereList.length === 0 && flaggedWords.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          No words have been marked or flagged yet.
          <div style={{ fontSize: '0.82rem', marginTop: 6, color: 'var(--text-muted)' }}>
            Double-click any word while reading in Refined mode to flag and suggest pronunciation corrections.
          </div>
        </div>
      ) : (
        <div className="dev-table-container">
          <table className="dev-table">
            <thead>
              <tr>
                <th>Word / Text</th>
                <th>Suggestion</th>
                <th>Book & Volume</th>
                <th>Page · ¶</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {whereList.map((item, idx) => {
                const volLabel = item.volume ? item.volume.replace('-', ' ').toUpperCase() : '';
                const pageNum = parseInt(item.page, 10);

                return (
                  <tr key={idx}>
                    <td>
                      <span className="flag" style={{ fontSize: '0.95rem' }}>
                        {item.word}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontStyle: item.suggestion ? 'normal' : 'italic' }}>
                      {item.suggestion || '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.book || 'tarikh-at-tabari'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{volLabel}</div>
                    </td>
                    <td>
                      Page {pageNum} · ¶{item.paragraph + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="badge-btn"
                          style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                          onClick={() =>
                            onJumpToLocation({
                              bookId: item.book || 'tarikh-at-tabari',
                              volume: item.volume,
                              page: item.page,
                              paragraph: item.paragraph,
                              word: item.word,
                            })
                          }
                          title="Jump to reading location"
                        >
                          <ExternalLink size={12} />
                          <span>Jump</span>
                        </button>
                        <button
                          className="icon-btn"
                          style={{ width: 28, height: 28, color: 'var(--flagged)' }}
                          onClick={e => handleUnflag(item.word, e)}
                          title="Clear / Unflag word"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
