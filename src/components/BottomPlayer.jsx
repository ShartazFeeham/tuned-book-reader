import React from 'react';
import { Lock, Play, Pause, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';

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
  return (
    <footer className="bottom-player">
      <div className="player-left">
        <button
          className="icon-btn"
          title="AMOLED Focus Lock Mode (Fullscreen dark reading)"
          onClick={onEnterAmoledLock}
          aria-label="AMOLED Focus Lock"
        >
          <Lock size={19} />
        </button>
      </div>

      <div className="player-center">
        <button
          className="page-nav-btn"
          title="Previous Page (Left Arrow)"
          disabled={pageIndex <= 0}
          onClick={onPrevPage}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          className="play-main-btn"
          title="Play / Pause (Space)"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {countdown > 0 && (
            <span className="countdown-badge">{countdown}</span>
          )}
          {playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
        </button>

        <button
          className="page-nav-btn"
          title="Next Page (Right Arrow)"
          disabled={pageIndex >= totalPages - 1}
          onClick={onNextPage}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <input
            className="page-jump-input"
            type="number"
            min="1"
            max={totalPages || 9999}
            value={pageIndex + 1}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onJumpToPage(val - 1);
              }
            }}
            aria-label="Jump to page number"
          />
          <span className="page-count-text">/ {totalPages}</span>
        </div>
      </div>

      <div className="player-right">
        <button
          className={`icon-btn ${backgroundPlay ? 'active' : ''}`}
          title={backgroundPlay ? 'Background Play is ON (Audio continues when tab blurred/locked)' : 'Background Play is OFF'}
          onClick={onToggleBackgroundPlay}
          aria-label="Toggle background play"
        >
          <Headphones size={19} />
        </button>
      </div>
    </footer>
  );
}
