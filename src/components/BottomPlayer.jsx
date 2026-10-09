import React, { useState, useEffect } from 'react';
import { Lock, Play, Pause, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import { toBnNum } from '../lib/storage.js';

export function BottomPlayer({
  playing,
  countdown,
  onTogglePlay,
  onPrevPage,
  onNextPage,
  pageIndex,
  totalPages,
  onJumpToPage,
  onEnterAmoledLock,
  backgroundPlay,
  onToggleBackgroundPlay,
}) {
  const [inputVal, setInputVal] = useState(String(pageIndex + 1));

  useEffect(() => {
    setInputVal(String(pageIndex + 1));
  }, [pageIndex]);

  const handleCommitJump = () => {
    const val = parseInt(inputVal, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onJumpToPage(val - 1);
    } else {
      setInputVal(String(pageIndex + 1));
    }
  };

  return (
    <footer className="bottom-player">
      <div className="player-left">
        <button
          className="icon-btn"
          title="অ্যামোলেড ফোকাস মোড (স্ক্রিন লক)"
          onClick={onEnterAmoledLock}
          aria-label="AMOLED Focus Lock"
        >
          <Lock size={19} />
        </button>
      </div>

      <div className="player-center">
        <button
          className="page-nav-btn"
          title="পূর্ববর্তী পৃষ্ঠা"
          disabled={pageIndex <= 0}
          onClick={onPrevPage}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          className="play-main-btn"
          title="পড়া শুরু / বন্ধ (Space)"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {countdown > 0 && (
            <span className="countdown-badge">{toBnNum(countdown)}</span>
          )}
          {playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
        </button>

        <button
          className="page-nav-btn"
          title="পরবর্তী পৃষ্ঠা"
          disabled={pageIndex >= totalPages - 1}
          onClick={onNextPage}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <input
            className="page-jump-input"
            type="number"
            min="1"
            max={totalPages || 9999}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleCommitJump();
              }
            }}
            onBlur={handleCommitJump}
            aria-label="Jump to page"
          />
          <span className="page-count-text">/ {toBnNum(totalPages)}</span>
        </div>
      </div>

      <div className="player-right">
        <button
          className={`icon-btn ${backgroundPlay ? 'active' : ''}`}
          title={backgroundPlay ? 'ব্যাকগ্রাউন্ড অডিও চালু আছে' : 'ব্যাকগ্রাউন্ড অডিও বন্ধ আছে'}
          onClick={onToggleBackgroundPlay}
          aria-label="Toggle background play"
        >
          <Headphones size={19} />
        </button>
      </div>
    </footer>
  );
}
