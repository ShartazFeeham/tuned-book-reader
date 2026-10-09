import React, { useEffect, useRef, useMemo } from 'react';
import { spoken } from '../speech.js';
import { nextSuggestion } from '../respell.mjs';

// Chunk converter: splits markdown paragraphs
const dropBrackets = t => {
  for (let u; u !== t; ) {
    u = t;
    t = t.replace(/[ \t]*\([^()]*\)/g, '');
  }
  return t;
};

export function toChunks(raw, orig) {
  if (!raw) return [];
  let t = raw;

  if (!orig) {
    const notes = new Set(
      [...(raw.split(/\n\s*\*\*টীকা\*\*/)[1]?.matchAll(/^\s*([০-৯0-9]+)[.।]/gm) ?? [])].map(m => m[1])
    );
    if (notes.size) {
      t = t.replace(/(?<=[\u0980-\u09E5\u09F0-\u09FF"”’'।.,;:?!)])([০-৯0-9]+)(?![০-৯0-9])/g, (m, n) =>
        notes.has(n) ? '' : m
      );
    }
  }

  if (!orig) {
    t = t
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\n+\s*\*\*টীকা\*\*[\s\S]*$/, '')
      .replace(/\[\^[০-৯0-9]+\]|\^\{[০-৯0-9]+\}|\^[০-৯0-9]+/g, '')
      .replace(/\s*\[[০-৯0-9]+\]/g, '')
      .replace(/[\[\]]/g, '')
      .replace(/\*\*|^#+\s*/gm, '')
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>|[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '')
      .replace(/(?<![\u0980-\u09FF])রা\.|(?<=\()রা(?=\))/g, 'রাদিয়াল্লাহু আনহু')
      .replace(/\(([০-৯0-9]+)\/([০-৯0-9]+)\)/g, '($1 বা $2)')
      .replace(/খ্রি\./g, 'খ্রিস্টাব্দ')
      .replace(/\(আ\.\)/g, '(আলাইহিস সালাম)')
      .replace(/\((রহ|রাহ)\.\)/g, '(রাহমাতুল্লাহি আলাইহি)')
      .replace(/(?<![\u0980-\u09FF])(পৃ|ড|আনু|সম্পা)\./g, (_, a) =>
        ({ পৃ: 'পৃষ্ঠা', ড: 'ডক্টর', আনু: 'আনুমানিক', সম্পা: 'সম্পাদনা' })[a]
      )
      .replace(/(?<![\u0980-\u09FF])সা[.:]|(?<=\()সা(?=\))/g, 'সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম')
      .replace(
        /\(\s*((?:রাদিয়াল্লাহু|সাল্লাল্লাহু|রাহমাতুল্লাহি|রহিমাহুল্লাহ|[‘ʿ’]?আলাইহি)[^()]*?)\s*\)/g,
        '$1'
      )
      .replace(/[\s\S]+/, dropBrackets)
      .replace(/["“”„]/g, '')
      .replace(/।"/g, '"।')
      .replace(/।(["”’')]*)[ \t]+(?=\S)/g, '$1\n\n');
  } else {
    t = t.replace(/।"/g, '"।').replace(/।(["”’')]*)[ \t]+(?=\S)/g, '$1\n\n');
  }

  const chunks = t
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);

  return chunks;
}

export function ReaderView({
  bookId,
  vol,
  page,
  rawText,
  origText,
  lexVersion,
  playing,
  nowParagraph,
  highlightedJumpPara,
  flaggedSet,
  onPlayParagraph,
  onWordLongPress,
  onFlagWord,
  onOpenRespell,
}) {
  const containerRef = useRef(null);
  const press = useRef({ t: 0, done: false, x: 0, y: 0 });
  const seq = useRef(0);

  const chunks = useMemo(() => toChunks(rawText, origText), [rawText, origText]);
  const shown = useMemo(() => (origText ? chunks : chunks.map(spoken)), [chunks, origText, lexVersion]);

  // Auto-scroll active paragraph into view
  useEffect(() => {
    if (nowParagraph >= 0 && containerRef.current) {
      const el = containerRef.current.children[nowParagraph];
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [nowParagraph]);

  // Jump to specific paragraph if arrived via query param or flag jump
  useEffect(() => {
    if (highlightedJumpPara >= 0 && containerRef.current) {
      const el = containerRef.current.children[highlightedJumpPara];
      if (el) {
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
      }
    }
  }, [highlightedJumpPara]);

  const wordIndexAt = (el, node, offset) => {
    const r = document.createRange();
    r.setStart(el, 0);
    r.setEnd(node, offset);
    const pre = r.toString();
    return pre.split(/\s+/).filter(Boolean).length - (/\S$/.test(pre) ? 1 : 0);
  };

  const rawIndex = (k, w) => {
    const toks = chunks[k]?.split(/\s+/) || [];
    const shownCount = i => spoken(toks.slice(0, i).join(' ')).split(/\s+/).filter(Boolean).length;
    let i = 0;
    if (origText) i = w;
    else {
      for (i = 0; i < toks.length && shownCount(i) < w; i++);
    }
    return { toks, i: Math.min(i, toks.length - 1) };
  };

  const pressEnd = () => clearTimeout(press.current.t);

  const pressStart = (k, e) => {
    if (e.button > 0) return;
    const el = e.currentTarget;
    const x = e.clientX;
    const y = e.clientY;

    press.current = {
      t: setTimeout(() => {
        const c = document.caretPositionFromPoint?.(x, y);
        const r = c ? null : document.caretRangeFromPoint?.(x, y);
        const node = c?.offsetNode ?? r?.startContainer;
        const off = c?.offset ?? r?.startOffset;
        if (!node || !el.contains(node)) return;

        press.current.done = true;
        seq.current++;
        window.getSelection()?.removeAllRanges();

        const w = wordIndexAt(el, node, off);
        const { toks, i } = rawIndex(k, w);
        const cutText = i > 0 ? toks.slice(i).join(' ') : null;
        const rawWord = toks[i]?.normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0] || '';

        onWordLongPress({
          paragraph: k,
          wordIndex: w,
          word: rawWord,
          cutText,
          chunks,
        });
      }, 500),
      done: false,
      x,
      y,
    };
  };

  const pressMove = e => {
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) {
      pressEnd();
    }
  };

  const dblPara = (k, e) => {
    const sel = window.getSelection();
    const word = sel?.toString().trim();
    if (!word) return;

    seq.current++;
    navigator.clipboard?.writeText(word).catch(() => {});

    const w = wordIndexAt(e.currentTarget, sel.anchorNode, Math.min(sel.anchorOffset, sel.focusOffset));
    const bn = word.normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0];

    const { toks, i } = rawIndex(k, w);
    const raw1 = (toks[i] || '').normalize('NFC').match(/[\u0980-\u09FF]+/)?.[0];

    onFlagWord({
      word: bn || word,
      raw: raw1,
      book: bookId,
      volume: vol,
      page,
      paragraph: k,
      wordIndex: w,
    });

    if (raw1 && !/[০-৯]/.test(raw1)) {
      const start = origText ? raw1 : spoken(raw1).match(/[\u0980-\u09FF]+/)?.[0] || raw1;
      const q = nextSuggestion(start);
      if (q) {
        onOpenRespell({
          x: e.clientX,
          y: e.clientY,
          loc: { book: bookId, volume: vol, page, paragraph: k, wordIndex: w },
          raw: raw1,
          start,
          form: start,
          phase: q.phase,
          slot: q.slot,
          sug: q.form,
        });
      }
    }
  };

  const renderFormattedParagraph = text => {
    return text
      .normalize('NFC')
      .split(/([\u0980-\u09FF]+)/)
      .map((tok, idx) => {
        if (flaggedSet.has(tok)) {
          return (
            <span key={idx} className="flag">
              {tok}
            </span>
          );
        }
        return tok;
      });
  };

  return (
    <div className="reader-body">
      <div className="reader-text-container" ref={containerRef}>
        {shown.map((chunk, k) => {
          const isActive = k === nowParagraph;
          const isJumpHighlight = k === highlightedJumpPara;

          return (
            <p
              key={k}
              className={`reader-para ${isActive ? 'active' : ''} ${isJumpHighlight ? 'highlighted-jump' : ''}`}
              onClick={() => {
                if (press.current.done) {
                  press.current.done = false;
                  return;
                }
                onPlayParagraph(k);
              }}
              onDoubleClick={e => dblPara(k, e)}
              onPointerDown={e => pressStart(k, e)}
              onPointerUp={pressEnd}
              onPointerLeave={pressEnd}
              onPointerMove={pressMove}
              onContextMenu={e => press.current.done && e.preventDefault()}
            >
              {renderFormattedParagraph(chunk)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
