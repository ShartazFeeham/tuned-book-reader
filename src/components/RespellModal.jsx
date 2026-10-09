import React, { useState, useEffect } from 'react';
import { Volume2, X, Flag, Check, ArrowRight } from 'lucide-react';
import { spoken } from '../speech.js';

export function RespellModal({ pop, onAnswer, onToggleFlag, onClose }) {
  if (!pop) return null;

  const [customInput, setCustomInput] = useState('');
  const activeWord = pop.word || pop.raw || '';
  const currentSpoken = spoken(pop.raw || activeWord);

  useEffect(() => {
    setCustomInput(pop.sug || currentSpoken || '');
  }, [pop.sug, currentSpoken, pop.word]);

  const handleSpeak = textToSpeak => {
    const text = textToSpeak || customInput || activeWord;
    if (!text) return;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'bn-BD';
        const voices = window.speechSynthesis.getVoices().filter(v => /^bn[-_]BD/i.test(v.lang) || /bangla|bengali/i.test(v.name));
        if (voices.length > 0) utter.voice = voices[0];
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.warn('Preview speech failed:', e);
    }
  };

  const handleCustomSubmit = e => {
    e?.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed && trimmed !== activeWord) {
      onAnswer('custom', trimmed);
    } else {
      onClose();
    }
  };

  // Keep modal inside viewport
  const posX = Math.max(16, Math.min(pop.x || 100, window.innerWidth - 320));
  const posY = Math.max(16, Math.min((pop.y || 100) + 12, window.innerHeight - 300));

  return (
    <>
      <div className="popback" onClick={onClose} />
      <div
        className="respell-modal-container"
        style={{ left: posX, top: posY }}
        onClick={e => e.stopPropagation()}
      >
        <div className="respell-modal-header">
          <div className="respell-word-info">
            <span className="respell-word-badge">{activeWord}</span>
            <button
              className="respell-speak-btn"
              onClick={() => handleSpeak(currentSpoken)}
              title="বর্তমান উচ্চারণ শুনুন"
              type="button"
            >
              <Volume2 size={15} />
            </button>
          </div>
          <div className="respell-header-actions">
            <button
              className={`respell-flag-toggle ${pop.isFlagged ? 'flagged' : ''}`}
              onClick={() => onToggleFlag(activeWord, pop.raw, pop.loc)}
              title={pop.isFlagged ? 'চিহ্নিত তালিকা থেকে মুছুন' : 'ডেভ তালিকায় চিহ্নিত করুন'}
              type="button"
            >
              <Flag size={14} />
              <span>{pop.isFlagged ? 'চিহ্নিত' : 'চিহ্নিত করুন'}</span>
            </button>
            <button className="respell-close-btn" onClick={onClose} title="বন্ধ করুন" type="button">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Automated suggestion section if available */}
        {pop.sug && (
          <div className="respell-sug-section">
            <div className="respell-sug-label">প্রস্তাবিত উচ্চারণ পরিবর্তন:</div>
            <div className="respell-sug-actions">
              <button
                className="respell-sug-btn"
                onClick={() => onAnswer(true)}
                title="এই প্রস্তাব গ্রহণ করুন"
                type="button"
              >
                <Check size={14} />
                <span>{pop.sug}</span>
              </button>
              <button
                className="respell-next-btn"
                onClick={() => onAnswer(false)}
                title="অন্য বিকল্প দেখুন"
                type="button"
              >
                <ArrowRight size={14} />
                <span>পরবর্তী</span>
              </button>
              <button
                className="respell-speak-btn small"
                onClick={() => handleSpeak(pop.sug)}
                title="প্রস্তাবিত উচ্চারণ শুনুন"
                type="button"
              >
                <Volume2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Custom phonetic override input */}
        <form className="respell-custom-form" onSubmit={handleCustomSubmit}>
          <div className="respell-input-row">
            <input
              type="text"
              className="respell-input"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="কাস্টম উচ্চারণ বা বানান..."
              autoFocus={!pop.sug}
            />
            <button
              type="button"
              className="respell-speak-btn small"
              onClick={() => handleSpeak(customInput)}
              title="ইনপুট উচ্চারণ শুনুন"
            >
              <Volume2 size={14} />
            </button>
            <button type="submit" className="respell-apply-btn">
              সংরক্ষণ
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
