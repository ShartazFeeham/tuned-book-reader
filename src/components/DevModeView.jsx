import React, { useState, useEffect } from 'react';
import { ArrowLeft, Terminal, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { toBnNum } from '../lib/storage.js';

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
        <ArrowLeft size={16} /> লাইব্রেরিতে ফিরুন
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={20} color="var(--accent)" />
            ডেভ মোড · চিহ্নিত ও সংশোধিত শব্দসমূহ
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            পড়ার সময় চিহ্নিত বা উচ্চারণের সুবিধার্থে সংরক্ষিত শব্দের অবস্থান ও তালিকা
          </p>
        </div>
        <button className="icon-btn" onClick={loadData} title="রিফ্রেশ করুন">
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          চিহ্নিত শব্দের তালিকা লোড হচ্ছে…
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
          এখনো কোনো শব্দ চিহ্নিত বা ফ্ল্যাগ করা হয়নি।
          <div style={{ fontSize: '0.82rem', marginTop: 6, color: 'var(--text-muted)' }}>
            পরিশোধিত পাঠ পড়ার সময় যেকোনো শব্দে ডাবল ক্লিক করে উচ্চারণ সংশোধন বা ফ্ল্যাগ করা যায়।
          </div>
        </div>
      ) : (
        <div className="dev-table-container">
          <table className="dev-table">
            <thead>
              <tr>
                <th>শব্দ / পাঠ</th>
                <th>সংশোধন প্রস্তাব</th>
                <th>কিতাব ও খণ্ড</th>
                <th>পৃষ্ঠা · অনুচ্ছেদ</th>
                <th>পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody>
              {whereList.map((item, idx) => {
                const volLabel = item.volume ? item.volume.replace(/^volume-0?/, 'খণ্ড ') : '';
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
                      <div style={{ fontWeight: 600 }}>{item.book === 'tarikh-at-tabari' ? 'তারীখে তাবারী' : (item.book || 'তারীখে তাবারী')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{volLabel}</div>
                    </td>
                    <td>
                      পৃষ্ঠা {toBnNum(pageNum)} · ¶{toBnNum(item.paragraph + 1)}
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
                          title="এই পৃষ্ঠায় যান"
                        >
                          <ExternalLink size={12} />
                          <span>যান</span>
                        </button>
                        <button
                          className="icon-btn"
                          style={{ width: 28, height: 28, color: 'var(--flagged)' }}
                          onClick={e => handleUnflag(item.word, e)}
                          title="চিহ্ন মুছে ফেলুন"
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
