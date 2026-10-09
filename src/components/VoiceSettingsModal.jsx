import React from 'react';
import { X, Volume2, Type, Sparkles, Clock, Eye, Zap } from 'lucide-react';

export function VoiceSettingsModal({
  isOpen,
  onClose,
  readers,
  selectedReaderId,
  onSelectReader,
  rate,
  onChangeRate,
  pitch,
  onChangePitch,
  fontSize,
  onChangeFontSize,
  autoPlayCountdown,
  onToggleAutoPlayCountdown,
  backgroundPlay,
  onToggleBackgroundPlay,
  pronMode,
  onChangePronMode,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent)" />
            Voice & Reader Settings
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Voice Picker */}
          <div className="setting-group">
            <label className="setting-label">
              <span>Voice Engine & Profile</span>
              <Volume2 size={16} />
            </label>
            <select
              className="setting-select"
              value={selectedReaderId}
              onChange={e => onSelectReader(e.target.value)}
            >
              {readers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label} ({r.n})
                </option>
              ))}
            </select>
          </div>

          {/* Speed Rate */}
          <div className="setting-group">
            <label className="setting-label">
              <span>Reading Speed</span>
              <span className="range-val">{rate.toFixed(2)}x</span>
            </label>
            <div className="range-row">
              <input
                className="range-input"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={rate}
                onChange={e => onChangeRate(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Pitch */}
          <div className="setting-group">
            <label className="setting-label">
              <span>Voice Pitch Shift</span>
              <span className="range-val">{pitch >= 0 ? `+${pitch}` : pitch} Hz</span>
            </label>
            <div className="range-row">
              <input
                className="range-input"
                type="range"
                min="-30"
                max="30"
                step="2"
                value={pitch}
                onChange={e => onChangePitch(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          {/* Font Size */}
          <div className="setting-group">
            <label className="setting-label">
              <span>Reader Text Size</span>
              <span className="range-val">{fontSize}px</span>
            </label>
            <div className="range-row">
              <button
                className="badge-btn"
                onClick={() => onChangeFontSize(Math.max(14, fontSize - 2))}
              >
                A−
              </button>
              <input
                className="range-input"
                type="range"
                min="14"
                max="38"
                step="1"
                value={fontSize}
                onChange={e => onChangeFontSize(parseInt(e.target.value, 10))}
              />
              <button
                className="badge-btn"
                onClick={() => onChangeFontSize(Math.min(38, fontSize + 2))}
              >
                A+
              </button>
            </div>
          </div>

          {/* Pronunciation Mode */}
          <div className="setting-group">
            <label className="setting-label">
              <span>Pronunciation Tuning Rules</span>
              <Zap size={16} />
            </label>
            <select
              className="setting-select"
              value={pronMode}
              onChange={e => onChangePronMode(e.target.value)}
            >
              <option value="refined">Refined Rules (Smart phonetics & Arabic honorifics)</option>
              <option value="explicit">Explicit Dictionary + Refined Rules</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="toggle-row" onClick={onToggleAutoPlayCountdown}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>3-Second Page Entry Countdown</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Counts down before auto-reading when entering from listing/link
              </div>
            </div>
            <label className="toggle-switch" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={autoPlayCountdown}
                onChange={onToggleAutoPlayCountdown}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row" onClick={onToggleBackgroundPlay}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Background Audio Playback</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Keeps audio running in background & lockscreen
              </div>
            </div>
            <label className="toggle-switch" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={backgroundPlay}
                onChange={onToggleBackgroundPlay}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
