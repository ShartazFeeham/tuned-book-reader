import React from 'react';
import { Menu, Sun, Moon, BookOpen, Sparkles, Sliders, Home, ArrowLeft } from 'lucide-react';
import { toBnNum } from '../lib/storage.js';

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
  onBackToBook,
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

  const volNum = vol ? vol.replace(/^volume-0?/, '') : '';
  const pageNum = page ? parseInt(page, 10) : '';

  return (
    <header className="app-header">
      <div className="header-left">
        {view === 'reader' && (
          <>
            <button
              className="icon-btn"
              title="খণ্ডের তালিকায় ফিরুন"
              onClick={onBackToBook}
              aria-label="Back to book"
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className="icon-btn"
              title="পৃষ্ঠা ও খণ্ড নেভিগেশন ড্রয়ার"
              onClick={onOpenDrawer}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </>
        )}
        {view !== 'home' && (
          <button
            className="icon-btn"
            title="লাইব্রেরি হোমে যান"
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
              {volNum ? `খণ্ড ${toBnNum(volNum)}` : ''} · পৃষ্ঠা {toBnNum(pageNum)}
            </div>
            <div className="header-subtitle">{book?.title || 'টিউনিং বুক রিডার'}</div>
          </>
        )}
        {view === 'book-detail' && (
          <div className="header-title">{book?.title || 'কিতাবের খণ্ডসমূহ'}</div>
        )}
        {view === 'home' && (
          <div className="header-title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.05rem' }}>
            টিউনিং বুক রিডার
          </div>
        )}
        {view === 'dev' && (
          <div className="header-title">ডেভ মোড · চিহ্নিত শব্দ তালিকা</div>
        )}
      </div>

      <div className="header-right">
        {view === 'reader' && (
          <button
            className={`badge-btn ${origText ? '' : 'active'}`}
            title={origText ? 'মূল পাঠ দেখানো হচ্ছে (পরিশোধিত পাঠের জন্য ক্লিক করুন)' : 'পরিশোধিত পাঠ দেখানো হচ্ছে (মূল পাঠের জন্য ক্লিক করুন)'}
            onClick={onOrigTextToggle}
          >
            {origText ? <BookOpen size={15} /> : <Sparkles size={15} />}
            <span>{origText ? 'মূল রূপ' : 'পরিশোধিত'}</span>
          </button>
        )}

        <button
          className="icon-btn"
          title={`থিম পরিবর্তন করুন (বর্তমান: ${theme})`}
          onClick={cycleTheme}
          aria-label="Switch theme"
        >
          {getThemeIcon()}
        </button>

        {view === 'reader' && (
          <button
            className="icon-btn"
            title="আওয়াজ ও রিডার সেটিংস"
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
