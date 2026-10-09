import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header.jsx';
import { BottomPlayer } from './components/BottomPlayer.jsx';
import { HomePage } from './components/HomePage.jsx';
import { BookDetailView } from './components/BookDetailView.jsx';
import { ReaderView, toChunks } from './components/ReaderView.jsx';
import { PageDrawer } from './components/PageDrawer.jsx';
import { VoiceSettingsModal } from './components/VoiceSettingsModal.jsx';
import { AmoledLockOverlay } from './components/AmoledLockOverlay.jsx';
import { DevModeView } from './components/DevModeView.jsx';
import { RespellModal } from './components/RespellModal.jsx';
import {
  browserVoices,
  buildReaders,
  createPlayer,
  DEFAULT_READER,
  loadLexicon,
  setPronMode,
  spoken,
  updateMediaSession,
} from './speech.js';
import {
  getPreferences,
  savePreferences,
  getReadingHistory,
  saveLastRead,
} from './lib/storage.js';
import {
  parseCurrentUrl,
  updateUrl,
  normalizeVolume,
  normalizePage,
} from './lib/urlSync.js';

export default function App() {
  // Navigation & View state: 'home' | 'book-detail' | 'reader' | 'dev'
  const [view, setView] = useState('home');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [vol, setVol] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);

  // Content
  const [rawText, setRawText] = useState('');
  const [srcText, setSrcText] = useState('');
  const [lexVersion, setLexVersion] = useState(0);

  // Preferences & Theme
  const [prefs, setPrefs] = useState(() => getPreferences());
  const [theme, setTheme] = useState(prefs.theme || 'sepia');
  const [fontSize, setFontSize] = useState(prefs.fontSize || 20);
  const [origText, setOrigText] = useState(prefs.origText !== false);
  const [pronMode, setPronModeState] = useState(prefs.pronMode || 'refined');
  const [rate, setRate] = useState(prefs.rate || 1.0);
  const [pitch, setPitch] = useState(prefs.pitch || 0);
  const [readerId, setReaderId] = useState(prefs.readerId || DEFAULT_READER);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(prefs.autoPlayCountdown !== false);
  const [backgroundPlay, setBackgroundPlay] = useState(prefs.backgroundPlay !== false);

  // Modals & Overlays
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [amoledLock, setAmoledLock] = useState(false);
  const [respellPop, setRespellPop] = useState(null);
  const [showSource, setShowSource] = useState(false);
  const [showScan, setShowScan] = useState(false);

  // Player state
  const [voices, setVoices] = useState(browserVoices);
  const [playing, setPlaying] = useState(false);
  const [nowParagraph, setNowParagraph] = useState(-1);
  const [activeLineText, setActiveLineText] = useState('');
  const [countdown, setCountdown] = useState(0);
  const countdownTimer = useRef(null);
  const [playerMsg, setPlayerMsg] = useState('');

  // Flagged words & Reading History
  const [flaggedSet, setFlaggedSet] = useState(() => new Set());
  const [history, setHistory] = useState(() => getReadingHistory());
  const [highlightedJumpPara, setHighlightedJumpPara] = useState(-1);

  // References for live reader instance
  const cutRef = useRef(null);
  const liveRef = useRef({});
  const autoAdvanceRef = useRef(false);
  const initialWordTarget = useRef(null); // { word, place }

  const readers = useMemo(() => buildReaders(voices), [voices]);
  const currentReader = readers.find(r => r.id === readerId) || readers[0];

  const currentPage = pages[pageIndex] || null;
  const currentChunks = useMemo(() => toChunks(rawText, origText), [rawText, origText]);

  liveRef.current = {
    chunks: currentChunks,
    reader: currentReader,
    rate,
    pages,
    pageIndex,
    selectedBook,
    vol,
    currentPage,
  };

  // Create speech player
  const player = useMemo(
    () =>
      createPlayer({
        chunks: () => {
          if (cutRef.current && cutRef.current.text) {
            return liveRef.current.chunks.map((c, i) =>
              i === cutRef.current.paragraph ? cutRef.current.text : c
            );
          }
          return liveRef.current.chunks;
        },
        reader: () => liveRef.current.reader,
        rate: () => liveRef.current.rate,
        at: (k, lineText) => {
          setNowParagraph(k);
          setActiveLineText(lineText);
          if (k >= 0) {
            // Save last read position in storage
            const { selectedBook, vol, currentPage } = liveRef.current;
            if (selectedBook && vol && currentPage) {
              saveLastRead({
                bookId: selectedBook.id,
                bookTitle: selectedBook.title,
                volume: vol,
                page: currentPage,
                paragraph: k,
              });
              setHistory(getReadingHistory());
            }
          }
        },
        msg: setPlayerMsg,
        state: setPlaying,
        end: () => {
          const { pages, pageIndex } = liveRef.current;
          if (pageIndex + 1 >= pages.length) return false;
          autoAdvanceRef.current = true;
          setPageIndex(pageIndex + 1);
          return true;
        },
      }),
    []
  );

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePreferences({ theme });
  }, [theme]);

  // Sync font size
  useEffect(() => {
    document.documentElement.style.setProperty('--fs', `${fontSize}px`);
    savePreferences({ fontSize });
  }, [fontSize]);

  // Sync speech mode
  useEffect(() => {
    setPronMode(pronMode);
    savePreferences({ pronMode });
    loadLexicon().then(() => setLexVersion(v => v + 1));
  }, [pronMode]);

  // Sync voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => setVoices(browserVoices());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  // Fetch Books and Flagged words on init
  useEffect(() => {
    fetch('/api/books')
      .then(r => (r.ok ? r.json() : []))
      .then(bList => {
        setBooks(bList);
        // Process initial URL
        const parsed = parseCurrentUrl();
        if (parsed.view === 'dev') {
          setView('dev');
          return;
        }

        if (parsed.bookId || parsed.vol || parsed.page) {
          const matched =
            bList.find(b => b.id === parsed.bookId || b.slug === parsed.bookId) ||
            bList[0];
          setSelectedBook(matched);

          const targetVol = parsed.vol || matched?.volumes?.[0]?.slug || 'volume-01';
          setVol(targetVol);

          if (parsed.word) {
            initialWordTarget.current = {
              word: parsed.word,
              place: parsed.place || 1,
            };
          }

          fetch(`/api/books/${matched.id}/${targetVol}`)
            .then(r => r.json())
            .then(pList => {
              setPages(pList);
              if (parsed.page) {
                const targetIdx = pList.indexOf(normalizePage(parsed.page));
                setPageIndex(targetIdx >= 0 ? targetIdx : 0);
              } else {
                setPageIndex(0);
              }
              setView('reader');
            });
        }
      })
      .catch(e => console.error('Failed to load books:', e));

    fetch('/flagged.json')
      .then(r => (r.ok ? r.json() : []))
      .then(fList => {
        setFlaggedSet(new Set(fList.map(w => w.normalize('NFC'))));
      })
      .catch(() => {});
  }, []);

  // When volume changes, load pages list
  useEffect(() => {
    if (!selectedBook || !vol) return;
    fetch(`/api/books/${selectedBook.id}/${vol}`)
      .then(r => (r.ok ? r.json() : []))
      .then(pList => {
        setPages(pList);
      })
      .catch(e => console.error('Failed to load volume pages:', e));
  }, [selectedBook, vol]);

  // Load Page Text when book, vol, or page changes
  useEffect(() => {
    if (!selectedBook || !vol || !currentPage) return;
    let isLive = true;

    // Reset cut and jump highlights
    cutRef.current = null;
    setHighlightedJumpPara(-1);

    // Cancel pending countdown
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(0);

    Promise.all([
      fetch(`/api/books/${selectedBook.id}/${vol}/${currentPage}/bangla.md`).then(r =>
        r.ok ? r.text() : '(No translation available)'
      ),
      fetch(`/api/books/${selectedBook.id}/${vol}/${currentPage}/gvrow.txt`).then(r =>
        r.ok ? r.text() : ''
      ),
    ])
      .then(([bangla, gvrow]) => {
        if (!isLive) return;
        setRawText(bangla);
        setSrcText(gvrow);

        // Update URL
        updateUrl({
          view: 'reader',
          bookId: selectedBook.id,
          vol,
          page: currentPage,
        });

        // Update MediaSession
        updateMediaSession({
          title: `Page ${parseInt(currentPage, 10)} - ${selectedBook.title}`,
          bookTitle: selectedBook.title,
          volumeLabel: vol.replace('-', ' ').toUpperCase(),
          onPlay: () => player.play(Math.max(nowParagraph, 0)),
          onPause: () => player.stop(),
          onNext: () => pageIndex < pages.length - 1 && setPageIndex(pageIndex + 1),
          onPrev: () => pageIndex > 0 && setPageIndex(pageIndex - 1),
        });

        // Check if there was an initial word target from URL
        if (initialWordTarget.current) {
          const { word, place } = initialWordTarget.current;
          initialWordTarget.current = null;

          const pageChunks = toChunks(bangla, origText);
          let matchCount = 0;
          let targetPara = -1;

          for (let pIdx = 0; pIdx < pageChunks.length; pIdx++) {
            const wordsInPara = pageChunks[pIdx].split(/\s+/);
            for (const w of wordsInPara) {
              const cleanW = w.normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0];
              if (cleanW === word.normalize('NFC')) {
                matchCount++;
                if (matchCount === place) {
                  targetPara = pIdx;
                  break;
                }
              }
            }
            if (targetPara >= 0) break;
          }

          if (targetPara >= 0) {
            setHighlightedJumpPara(targetPara);
            setTimeout(() => {
              player.play(targetPara);
            }, 300);
            return;
          }
        }

        // Auto advance continuation
        if (autoAdvanceRef.current) {
          autoAdvanceRef.current = false;
          player.play(0);
        } else if (autoPlayCountdown) {
          // 3-second countdown before auto-playing
          let count = 3;
          setCountdown(count);
          countdownTimer.current = setInterval(() => {
            count--;
            if (count <= 0) {
              clearInterval(countdownTimer.current);
              countdownTimer.current = null;
              setCountdown(0);
              player.play(0);
            } else {
              setCountdown(count);
            }
          }, 1000);
        }
      })
      .catch(e => {
        if (isLive) setRawText('(Failed to load page content)');
      });

    return () => {
      isLive = false;
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, [selectedBook, vol, currentPage, pageIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        if (pageIndex > 0) {
          player.stop();
          setPageIndex(pageIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (pageIndex < pages.length - 1) {
          player.stop();
          setPageIndex(pageIndex + 1);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          setCountdown(0);
        }
        if (playing) {
          player.stop();
        } else {
          player.play(Math.max(nowParagraph, 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageIndex, pages.length, playing, nowParagraph, player]);

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
      setCountdown(0);
    }
    if (playing) {
      player.stop();
    } else {
      player.play(Math.max(nowParagraph, 0));
    }
  };

  // Word Long Press Handler
  const handleWordLongPress = ({ paragraph, wordIndex, word, cutText, chunks }) => {
    cutRef.current = cutText ? { paragraph, text: cutText } : null;

    // Calculate occurrence index of this word on this page
    let occurrence = 1;
    if (word) {
      let count = 0;
      for (let p = 0; p < chunks.length; p++) {
        const words = chunks[p].split(/\s+/);
        for (let w = 0; w < words.length; w++) {
          const clean = words[w].normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0];
          if (clean === word) {
            count++;
            if (p === paragraph && w === wordIndex) {
              occurrence = count;
              break;
            }
          }
        }
        if (p === paragraph) break;
      }

      // Update URL with word and place
      updateUrl({
        view: 'reader',
        bookId: selectedBook?.id,
        vol,
        page: currentPage,
        word,
        place: occurrence,
      });
    }

    player.stop();
    player.play(paragraph);
  };

  // Flag Word Handler
  const handleFlagWord = async ({ word, raw, book, volume, page, paragraph, wordIndex }) => {
    if (!word) return;
    const isFlagged = flaggedSet.has(word);

    if (isFlagged) {
      // Unflag
      setFlaggedSet(prev => {
        const next = new Set(prev);
        next.delete(word);
        return next;
      });
      fetch('/unflag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      }).catch(() => {});
    } else {
      // Flag
      setFlaggedSet(prev => new Set(prev).add(word));
      fetch('/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          book,
          volume,
          page,
          paragraph,
          wordIndex,
        }),
      }).catch(() => {});
    }
  };

  // Respell suggestion answer
  const handleRespellAnswer = async keep => {
    if (!respellPop) return;
    const form = keep ? respellPop.sug : respellPop.form;
    const nextSug = nextSuggestion(form, respellPop.phase, respellPop.slot + 1);

    if (nextSug) {
      setRespellPop({
        ...respellPop,
        form,
        phase: nextSug.phase,
        slot: nextSug.slot,
        sug: nextSug.form,
      });
      return;
    }

    setRespellPop(null);

    if (form !== respellPop.start) {
      await fetch('/respell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: respellPop.raw, to: form }),
      }).catch(() => {});
      await loadLexicon();
      setLexVersion(v => v + 1);

      const shownWord = origText
        ? respellPop.start
        : spoken(respellPop.raw).normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0];
      if (shownWord) {
        setFlaggedSet(f => new Set(f).add(shownWord));
        fetch('/flag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: shownWord,
            suggestion: form,
            ...respellPop.loc,
          }),
        }).catch(() => {});
      }
    }
  };

  // Navigation callbacks
  const handleSelectBook = book => {
    setSelectedBook(book);
    player.stop();
    if (book.volumes && book.volumes.length > 0) {
      setView('book-detail');
      updateUrl({ view: 'book-detail', bookId: book.id });
    } else {
      setVol('volume-01');
      setView('reader');
      updateUrl({ view: 'reader', bookId: book.id, vol: 'volume-01', page: '0001' });
    }
  };

  const handleResumeReading = entry => {
    const matched = books.find(b => b.id === entry.bookId || b.slug === entry.bookId) || books[0];
    setSelectedBook(matched);
    setVol(entry.volume || 'volume-01');
    player.stop();

    fetch(`/api/books/${matched.id}/${entry.volume || 'volume-01'}`)
      .then(r => r.json())
      .then(pList => {
        setPages(pList);
        const idx = pList.indexOf(normalizePage(entry.page));
        setPageIndex(idx >= 0 ? idx : 0);
        setView('reader');
        if (entry.paragraph) {
          setHighlightedJumpPara(entry.paragraph);
        }
      });
  };

  const handleSelectPageFromDetail = (bookId, volSlug, pageNum) => {
    player.stop();
    setVol(volSlug);
    fetch(`/api/books/${bookId}/${volSlug}`)
      .then(r => r.json())
      .then(pList => {
        setPages(pList);
        const idx = pList.indexOf(normalizePage(pageNum));
        setPageIndex(idx >= 0 ? idx : 0);
        setView('reader');
      });
  };

  const handleGoHome = () => {
    player.stop();
    setView('home');
    updateUrl({ view: 'home' });
  };

  const handleOpenDevMode = () => {
    player.stop();
    setView('dev');
    updateUrl({ view: 'dev' });
  };

  const handleJumpToDevLocation = item => {
    const matched = books.find(b => b.id === item.bookId || b.slug === item.bookId) || books[0];
    setSelectedBook(matched);
    setVol(item.volume);
    player.stop();

    fetch(`/api/books/${matched.id}/${item.volume}`)
      .then(r => r.json())
      .then(pList => {
        setPages(pList);
        const idx = pList.indexOf(normalizePage(item.page));
        setPageIndex(idx >= 0 ? idx : 0);
        setView('reader');
        setHighlightedJumpPara(item.paragraph || 0);
      });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        view={view}
        book={selectedBook}
        vol={vol}
        page={currentPage}
        theme={theme}
        onThemeChange={setTheme}
        origText={origText}
        onOrigTextToggle={() => {
          player.stop();
          setOrigText(o => !o);
          savePreferences({ origText: !origText });
        }}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenVoiceSettings={() => setVoiceSettingsOpen(true)}
        onGoHome={handleGoHome}
      />

      {/* Main Views */}
      <main style={{ flex: 1 }}>
        {view === 'home' && (
          <HomePage
            books={books}
            history={history}
            onSelectBook={handleSelectBook}
            onResumeReading={handleResumeReading}
            onOpenDevMode={handleOpenDevMode}
          />
        )}

        {view === 'book-detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            lastRead={history[selectedBook.id] || history[selectedBook.slug]}
            onBackToHome={handleGoHome}
            onSelectPage={handleSelectPageFromDetail}
          />
        )}

        {view === 'dev' && (
          <DevModeView
            onBackToHome={handleGoHome}
            onJumpToLocation={handleJumpToDevLocation}
          />
        )}

        {view === 'reader' && (
          <ReaderView
            bookId={selectedBook?.id}
            vol={vol}
            page={currentPage}
            rawText={rawText}
            sourceText={srcText}
            origText={origText}
            lexVersion={lexVersion}
            playing={playing}
            nowParagraph={nowParagraph}
            highlightedJumpPara={highlightedJumpPara}
            flaggedSet={flaggedSet}
            showSource={showSource}
            showScan={showScan}
            onPlayParagraph={k => {
              cutRef.current = null;
              player.stop();
              player.play(k);
            }}
            onWordLongPress={handleWordLongPress}
            onFlagWord={handleFlagWord}
            onOpenRespell={setRespellPop}
          />
        )}
      </main>

      {/* Bottom Floating Player in Reader View */}
      {view === 'reader' && (
        <BottomPlayer
          playing={playing}
          countdown={countdown}
          onTogglePlay={handleTogglePlay}
          onPrevPage={() => {
            if (pageIndex > 0) {
              player.stop();
              setPageIndex(pageIndex - 1);
            }
          }}
          onNextPage={() => {
            if (pageIndex < pages.length - 1) {
              player.stop();
              setPageIndex(pageIndex + 1);
            }
          }}
          pageIndex={pageIndex}
          totalPages={pages.length}
          onJumpToPage={targetIdx => {
            player.stop();
            setPageIndex(targetIdx);
          }}
          onEnterAmoledLock={() => setAmoledLock(true)}
          backgroundPlay={backgroundPlay}
          onToggleBackgroundPlay={() => {
            const next = !backgroundPlay;
            setBackgroundPlay(next);
            savePreferences({ backgroundPlay: next });
          }}
        />
      )}

      {/* Page Navigation Slide-Over Drawer */}
      <PageDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        book={selectedBook}
        volumes={selectedBook?.volumes || []}
        currentVol={vol}
        pages={pages}
        currentPage={currentPage}
        onSelectVolume={newVol => {
          player.stop();
          setVol(newVol);
        }}
        onSelectPage={newPage => {
          player.stop();
          const idx = pages.indexOf(newPage);
          if (idx >= 0) setPageIndex(idx);
        }}
        onGoHome={handleGoHome}
      />

      {/* Voice & Reader Customization Modal */}
      <VoiceSettingsModal
        isOpen={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        readers={readers}
        selectedReaderId={readerId}
        onSelectReader={rId => {
          setReaderId(rId);
          savePreferences({ readerId: rId });
          const r = readers.find(x => x.id === rId);
          if (r) liveRef.current.reader = r;
          if (playing) {
            player.stop();
            player.play(Math.max(nowParagraph, 0));
          }
        }}
        rate={rate}
        onChangeRate={r => {
          setRate(r);
          savePreferences({ rate: r });
          liveRef.current.rate = r;
        }}
        pitch={pitch}
        onChangePitch={p => {
          setPitch(p);
          savePreferences({ pitch: p });
        }}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        autoPlayCountdown={autoPlayCountdown}
        onToggleAutoPlayCountdown={() => {
          const next = !autoPlayCountdown;
          setAutoPlayCountdown(next);
          savePreferences({ autoPlayCountdown: next });
        }}
        backgroundPlay={backgroundPlay}
        onToggleBackgroundPlay={() => {
          const next = !backgroundPlay;
          setBackgroundPlay(next);
          savePreferences({ backgroundPlay: next });
        }}
        showSource={showSource}
        onToggleShowSource={() => setShowSource(s => !s)}
        showScan={showScan}
        onToggleShowScan={() => setShowScan(s => !s)}
        pronMode={pronMode}
        onChangePronMode={setPronModeState}
      />

      {/* AMOLED Focus Lock Overlay */}
      {amoledLock && (
        <AmoledLockOverlay
          activeLine={activeLineText}
          playing={playing}
          onExitLock={() => setAmoledLock(false)}
        />
      )}

      {/* Respell suggestions modal */}
      <RespellModal
        pop={respellPop}
        onAnswer={handleRespellAnswer}
        onClose={() => setRespellPop(null)}
      />
    </div>
  );
}
