import React from 'react';

export function RespellModal({ pop, onAnswer, onClose }) {
  if (!pop) return null;

  return (
    <>
      <div className="popback" onClick={onClose} />
      <div
        className="respell-pop"
        style={{
          left: Math.max(12, Math.min(pop.x, window.innerWidth - 240)),
          top: Math.max(12, Math.min(pop.y + 12, window.innerHeight - 120)),
        }}
        onClick={e => e.stopPropagation()}
      >
        <button className="respell-sug-btn" onClick={() => onAnswer(true)}>
          {pop.sug}
        </button>
        <button className="respell-next-btn" onClick={() => onAnswer(false)}>
          Next
        </button>
      </div>
    </>
  );
}
