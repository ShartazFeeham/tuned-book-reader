import React, { useEffect } from 'react';
import { Unlock } from 'lucide-react';

export function AmoledLockOverlay({ activeLine, playing, onExitLock }) {
  useEffect(() => {
    // Attempt fullscreen
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        onExitLock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
    };
  }, [onExitLock]);

  // Clean the active line to display 1-2 concise lines
  const displayText = activeLine ? activeLine.replace(/<!--[\s\S]*?-->/g, '').trim() : '';

  return (
    <div className="amoled-lock-overlay">
      <div className="amoled-content-center">
        {displayText ? (
          <div className="amoled-reading-text" key={displayText.slice(0, 30)}>
            {displayText}
          </div>
        ) : (
          <div className="amoled-empty-tip">
            {playing ? 'Listening…' : 'Tap play or press space to read'}
          </div>
        )}
      </div>

      <button
        className="amoled-unlock-btn"
        title="Unlock & Exit AMOLED Mode (Esc)"
        onClick={onExitLock}
        aria-label="Unlock"
      >
        <Unlock size={22} />
      </button>
    </div>
  );
}
