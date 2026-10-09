import React from 'react';
import { Menu, Sun, Moon, BookOpen, Sparkles, Sliders, Home } from 'lucide-react';

export function Header({
  view,
  book,
  vol,
  page,
  theme,
  onThemeChange,
  origText,
  onOrigTextToggle,
  onOpenDrawer,
  onOpenVoiceSettings,
  onGoHome,
}) {
  // Cycle theme: light -> dark -> sepia -> light
  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('sepia');
    else onThemeChange('light');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon size={19} />;
    if (theme === 'light') return <Sun size={19} />;
    return <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>📜</span>;
  };

  return (
    <header className="app-header">
      <div className="header-left">
        {view === 'reader' && (
          <button
            className="icon-btn"
            title="Page Navigation Menu"
            onClick={onOpenDrawer}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        {view !== 'home' && (
          <button
            className="icon-btn"
            title="Back to Home"
            onClick={onGoHome}
            aria-label="Home"
          >
            <Home size={19} />
          </button>
        )}
      </div>

      <div className="header-center">
        {view === 'reader' && (
          <>
            <div className="header-title">
              {vol ? vol.replace('-', ' ').toUpperCase() : ''} · Page {page ? parseInt(page, 10) : ''}
            </div>
            <div className="header-subtitle">{book?.title || 'Tuned Book Reader'}</div>
          </>
        )}
        {view === 'book-detail' && (
          <div className="header-title">{book?.title || 'Book Volumes'}</div>
        )}
        {view === 'home' && (
          <div className="header-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            Tuned Book Reader
          </div>
        )}
        {view === 'dev' && (
          <div className="header-title">Dev Mode · Flagged Words</div>
        )}
      </div>

      <div className="header-right">
        {view === 'reader' && (
          <button
            className={`badge-btn ${origText ? '' : 'active'}`}
            title={origText ? 'Showing Original Text (Click for Refined)' : 'Showing Refined Text (Click for Original)'}
            onClick={onOrigTextToggle}
          >
            {origText ? <BookOpen size={15} /> : <Sparkles size={15} />}
            <span>{origText ? 'Original' : 'Refined'}</span>
          </button>
        )}

        <button
          className="icon-btn"
          title={`Switch theme (current: ${theme})`}
          onClick={cycleTheme}
          aria-label="Switch theme"
        >
          {getThemeIcon()}
        </button>

        {view === 'reader' && (
          <button
            className="icon-btn"
            title="Voice & Audio Settings"
            onClick={onOpenVoiceSettings}
            aria-label="Voice settings"
          >
            <Sliders size={19} />
          </button>
        )}
      </div>
    </header>
  );
}
