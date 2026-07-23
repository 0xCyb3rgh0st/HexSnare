// ui.js — DOM rendering + event wiring for HexSnare.

import { store } from './store.js';
import { inferMatchers, PATTERN_LIBRARY, LIBRARY_CATEGORIES } from './patterns.js';
import { buildRegex, formatFor, flagsToString } from './regexEngine.js';
import { runTest } from './tester.js';
import { explain } from './explainer.js';
import {
  escapeHtml, getLineAt, lineBounds, renderHighlights, copyToClipboard, uid, trimSelection,
} from './utils.js';

const GROUP_COLORS = 8;
const ONBOARD_KEY = 'hexsnare.hideOnboard';
const TIPS = [
  'Hover over panels and controls to get quick hints while you explore.',
  'Start in BUILD: select a token in one log line to create a capture group.',
  'Name capture groups like ip, user, path, or status so the regex stays readable.',
  'Use TEST to see which log lines your pattern actually catches.',
  'Turn on anchor ^$ when the regex should match the whole log line.',
  'Use generalize \\s+ when logs may have changing spaces or tabs.',
  'Click a pattern library item to copy it, or focus a group matcher to insert it there.',
  'Pick JS, grep -P, Python, or raw before copying the final regex.',
];
let el = {};
let currentPattern = '';
let activeMatcherId = null; // capture whose matcher input last had focus
let libFilter = '';
let tipIndex = 0;
let tipTimer = null;

// ── helpers ────────────────────────────────────────────────────────────────

function templateText() {
  const { input, templateLine } = store.state;
  if (templateLine == null) return '';
  return lineBounds(input, templateLine).text;
}

/** Drop captures that no longer fit the current template line. */
function validCaptures() {
  const tpl = templateText();
  return store.state.captures.filter((c) => c.start >= 0 && c.end <= tpl.length && c.end > c.start);
}

function flash(msg, kind = 'ok') {
  el.outStatus.textContent = msg;
  el.outStatus.className = `out-status ${kind}`;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    el.outStatus.className = 'out-status';
    renderStatus(store.state);
  }, 2200);
}

function showTip(next = false) {
  if (!el.onboardTip) return;
  if (next) tipIndex = (tipIndex + 1) % TIPS.length;
  el.onboardTip.textContent = TIPS[tipIndex];
}

function initOnboarding() {
  if (!el.onboard) return;
  if (localStorage.getItem(ONBOARD_KEY) === '1') {
    el.onboard.classList.add('hidden');
    return;
  }

  showTip();
  tipTimer = setInterval(() => showTip(true), 6000);
}

function dismissOnboarding() {
  if (!el.onboard) return;
  el.onboard.classList.add('hidden');
  localStorage.setItem(ONBOARD_KEY, '1');
  clearInterval(tipTimer);
}

// ── selection → capture ─────────────────────────────────────────────────────

function onSelect() {
  const ta = el.input;
  if (store.state.view !== 'build') {
    if (ta.selectionStart !== ta.selectionEnd) {
      flash('switch to ◈ BUILD to forge a capture group from a selection', 'warn');
    }
    return;
  }
  const rawStart = ta.selectionStart;
  const rawEnd = ta.selectionEnd;
  if (rawStart === rawEnd) return;

  const rawText = ta.value.slice(rawStart, rawEnd);
  if (!rawText.trim()) return;

  // Drop any leading/trailing whitespace the raw selection picked up so it
  // doesn't get silently swallowed by the capture's offsets (see trimSelection).
  const { start: s, end: e, text } = trimSelection(rawText, rawStart, rawEnd);

  const line = getLineAt(ta.value, s);
  // Keep selections inside a single line (per-line log records).
  const relEnd = Math.min(e, line.end) - line.start;
  const relStart = s - line.start;
  if (relEnd <= relStart) return;

  const st = store.state;
  if (st.templateLine == null) {
    st.templateLine = line.index;
  } else if (line.index !== st.templateLine) {
    flash('captures must stay on the template line — clear to switch lines', 'warn');
    return;
  }

  // Ignore duplicate identical spans.
  if (st.captures.some((c) => c.start === relStart && c.end === relEnd)) return;

  const suggestions = inferMatchers(text);
  st.captures.push({
    id: uid(),
    start: relStart,
    end: relEnd,
    text,
    matcher: suggestions[0].matcher,
    name: '',
  });
  store._flush();
}

// ── renderers ────────────────────────────────────────────────────────────────

function renderTabsAndFlags(state) {
  el.viewTabs.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.view === state.view);
  });
  el.fmtTabs.querySelectorAll('.fmt').forEach((t) => {
    t.classList.toggle('active', t.dataset.fmt === state.outputFormat);
  });
  el.flags.querySelectorAll('.flag').forEach((f) => {
    f.classList.toggle('active', !!state.flags[f.dataset.flag]);
  });
  el.optWs.checked = state.generalizeWs;
  el.optAnchor.checked = state.anchor;
  el.input.readOnly = state.view === 'test';
  el.editor.classList.toggle('testing', state.view === 'test');
}

function renderCaptures(state) {
  const caps = validCaptures();
  el.capCount.textContent = String(caps.length);

  if (!caps.length) {
    el.captures.innerHTML = `<div class="empty">No groups yet.<br><span>Switch to <b>◈ BUILD</b>, then select any token in a log line to forge a capture group.</span></div>`;
    return;
  }

  el.captures.innerHTML = caps.map((c, i) => {
    const color = `grp-${i % GROUP_COLORS}`;
    const suggestions = inferMatchers(c.text);
    const inList = suggestions.some((s) => s.matcher === c.matcher);
    const opts = suggestions.map((s) =>
      `<option value="${escapeHtml(s.matcher)}"${s.matcher === c.matcher ? ' selected' : ''}>${escapeHtml(s.label)}</option>`,
    ).join('');
    const customOpt = `<option value="__custom"${inList ? '' : ' selected'}>✎ custom…</option>`;
    const preview = c.text.length > 24 ? c.text.slice(0, 24) + '…' : c.text;
    return `
      <div class="cap" data-id="${c.id}">
        <div class="cap-top">
          <span class="swatch ${color}"></span>
          <span class="cap-idx" title="Capture group number">#${i + 1}</span>
          <code class="cap-text" title="Captured text: ${escapeHtml(c.text)}">${escapeHtml(preview) || '∅'}</code>
          <button class="cap-del" data-act="del" title="Remove group">✕</button>
        </div>
        <div class="cap-row">
          <input class="cap-name mono" data-act="name" placeholder="group name" value="${escapeHtml(c.name)}" spellcheck="false" title="Optional name for this group" />
          <select class="cap-suggest" data-act="suggest" title="Pick a matcher for this token">${opts}${customOpt}</select>
        </div>
        <input class="cap-matcher mono" data-act="matcher" value="${escapeHtml(c.matcher)}" spellcheck="false" title="Regex used inside this capture" />
      </div>`;
  }).join('');
}

function renderLibrary() {
  const q = libFilter.trim().toLowerCase();
  const groups = LIBRARY_CATEGORIES.map((cat) => {
    const items = PATTERN_LIBRARY.filter((p) => p.cat === cat)
      .filter((p) => !q || p.label.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) || p.re.toLowerCase().includes(q));
    if (!items.length) return '';
    const rows = items.map((p) =>
      `<button class="lib-item" data-re="${escapeHtml(p.re)}" data-label="${escapeHtml(p.label)}" title="Use pattern: ${escapeHtml(p.re)}">
         <span class="lib-label">${escapeHtml(p.label)}</span>
         <code class="lib-re">${escapeHtml(p.re)}</code>
       </button>`).join('');
    return `<div class="lib-cat"><div class="lib-cat-head">${escapeHtml(cat)}</div>${rows}</div>`;
  }).join('');
  el.library.innerHTML = groups || `<div class="empty">no patterns match “${escapeHtml(q)}”</div>`;
}

function computePattern(state) {
  const tpl = templateText();
  const { pattern, error } = buildRegex(tpl, validCaptures(), {
    generalizeWs: state.generalizeWs,
    anchor: state.anchor,
  });
  currentPattern = pattern;
  return { pattern, error };
}

function renderOutput(state) {
  const { pattern, error } = computePattern(state);
  if (!pattern) {
    el.outRegex.innerHTML = `<span class="dim">// select tokens in the editor to forge a pattern…</span>`;
  } else {
    const formatted = formatFor(state.outputFormat, pattern, state.flags);
    el.outRegex.textContent = formatted;
  }
  if (error) flash('⚠ ' + error, 'err');
}

function renderExplain(state) {
  const { pattern } = computePattern(state);
  if (!pattern) { el.explain.innerHTML = `<div class="empty">the breakdown of your pattern shows up here</div>`; return; }
  const parts = explain(pattern);
  el.explain.innerHTML = parts.map((p) =>
    `<div class="ex-row"><code class="ex-sym">${escapeHtml(p.sym)}</code><span class="ex-desc">${escapeHtml(p.desc)}</span></div>`,
  ).join('');
}

function renderHighlightsView(state) {
  const input = state.input;
  let ranges = [];

  if (state.view === 'build') {
    if (state.templateLine != null) {
      const lb = lineBounds(input, state.templateLine);
      ranges.push({ start: lb.start, end: lb.end, cls: 'tpl', title: 'template line' });
      validCaptures().forEach((c, i) => {
        ranges.push({
          start: lb.start + c.start,
          end: lb.start + c.end,
          cls: `grp grp-${i % GROUP_COLORS}`,
          title: `#${i + 1} ${c.name || ''} → ${c.matcher}`,
        });
      });
    }
  } else {
    // TEST: highlight live matches + their capture groups.
    const res = runTest(currentPattern, state.flags, input);
    if (!res.error) {
      for (const m of res.matches) {
        ranges.push({ start: m.index, end: m.end, cls: 'hit', title: m.text });
        m.groups.forEach((g, i) => {
          if (g.range && g.text != null) {
            ranges.push({
              start: g.range.start,
              end: g.range.end,
              cls: `grp grp-${i % GROUP_COLORS}`,
              title: `${g.name || '#' + (i + 1)}: ${g.text}`,
            });
          }
        });
      }
    }
  }
  el.highlights.innerHTML = renderHighlights(input, ranges);
  syncScroll();
}

function renderStatus(state) {
  const caps = validCaptures();
  el.stMode.textContent = state.view === 'build' ? '◈ BUILD' : '◎ TEST';
  el.stCaptures.textContent = `${caps.length} group${caps.length === 1 ? '' : 's'}`;
  el.stFlags.textContent = `flags: ${flagsToString(state.flags) || '∅'}`;

  if (currentPattern) {
    const res = runTest(currentPattern, state.flags, state.input);
    if (res.error) {
      el.stMatches.textContent = '⚠ invalid regex';
      el.stMatches.className = 'st-err';
    } else {
      const lines = state.input ? state.input.split('\n').length : 0;
      el.stMatches.textContent = `${res.count}${res.truncated ? '+' : ''} match${res.count === 1 ? '' : 'es'} / ${lines} lines`;
      el.stMatches.className = res.count ? 'st-ok' : '';
    }
  } else {
    el.stMatches.textContent = '—';
    el.stMatches.className = '';
  }
}

/** Full re-render (store subscriber). */
export function renderAll(state) {
  renderTabsAndFlags(state);
  renderCaptures(state);
  renderLibrary();
  renderOutput(state);
  renderExplain(state);
  renderHighlightsView(state);
  renderStatus(state);
  if (el.input.value !== state.input) el.input.value = state.input;
  el.editorHint.textContent = state.templateLine == null
    ? 'select a token to forge a group'
    : `template = line ${state.templateLine + 1}`;
}

/** Focus-preserving partial update for inline text edits. */
function renderDerived(state) {
  renderOutput(state);
  renderExplain(state);
  renderHighlightsView(state);
  renderStatus(state);
}

// ── scroll sync (backdrop follows textarea) ──────────────────────────────────

function syncScroll() {
  el.backdrop.scrollTop = el.input.scrollTop;
  el.backdrop.scrollLeft = el.input.scrollLeft;
}

// ── event wiring ─────────────────────────────────────────────────────────────

function wire() {
  // textarea
  el.input.addEventListener('select', onSelect);
  el.input.addEventListener('mouseup', onSelect);
  el.input.addEventListener('scroll', syncScroll);
  el.input.addEventListener('input', () => {
    store.state.input = el.input.value;
    // drop captures orphaned by an edit, then re-render
    store.state.captures = validCaptures();
    if (store.state.templateLine != null
        && store.state.templateLine >= el.input.value.split('\n').length) {
      store.state.templateLine = null;
      store.state.captures = [];
    }
    store._flush();
  });

  // view tabs
  el.viewTabs.addEventListener('click', (ev) => {
    const t = ev.target.closest('.tab');
    if (t) store.set({ view: t.dataset.view });
  });

  // format tabs
  el.fmtTabs.addEventListener('click', (ev) => {
    const t = ev.target.closest('.fmt');
    if (t) store.set({ outputFormat: t.dataset.fmt });
  });

  // flags
  el.flags.addEventListener('click', (ev) => {
    const f = ev.target.closest('.flag');
    if (!f) return;
    const flags = { ...store.state.flags, [f.dataset.flag]: !store.state.flags[f.dataset.flag] };
    store.set({ flags });
  });

  // options
  el.optWs.addEventListener('change', () => store.set({ generalizeWs: el.optWs.checked }));
  el.optAnchor.addEventListener('change', () => store.set({ anchor: el.optAnchor.checked }));

  // toolbar
  el.btnClear.addEventListener('click', clearCaptures);
  el.btnSample.addEventListener('click', () => {
    store.reset();
    flash('sample restored', 'ok');
  });
  el.btnCopy.addEventListener('click', doCopy);
  el.btnTipNext?.addEventListener('click', () => showTip(true));
  el.btnOnboardClose?.addEventListener('click', dismissOnboarding);

  // captures (event delegation)
  el.captures.addEventListener('click', (ev) => {
    const del = ev.target.closest('[data-act="del"]');
    if (del) {
      const id = ev.target.closest('.cap').dataset.id;
      store.state.captures = store.state.captures.filter((c) => c.id !== id);
      if (!store.state.captures.length) store.state.templateLine = null;
      store._flush();
    }
  });
  el.captures.addEventListener('change', (ev) => {
    const sel = ev.target.closest('[data-act="suggest"]');
    if (sel && sel.value !== '__custom') {
      const id = ev.target.closest('.cap').dataset.id;
      const cap = store.state.captures.find((c) => c.id === id);
      if (cap) { cap.matcher = sel.value; store._flush(); }
    }
  });
  el.captures.addEventListener('input', (ev) => {
    const cap = capFromEvent(ev);
    if (!cap) return;
    if (ev.target.dataset.act === 'name') cap.name = ev.target.value;
    else if (ev.target.dataset.act === 'matcher') cap.matcher = ev.target.value;
    store.persist();
    renderDerived(store.state);
  });
  el.captures.addEventListener('focusin', (ev) => {
    if (ev.target.dataset.act === 'matcher') {
      activeMatcherId = ev.target.closest('.cap').dataset.id;
    }
  });

  // library
  el.libSearch.addEventListener('input', () => { libFilter = el.libSearch.value; renderLibrary(); });
  el.library.addEventListener('click', (ev) => {
    const item = ev.target.closest('.lib-item');
    if (!item) return;
    const re = item.dataset.re;
    const label = item.dataset.label;
    const cap = activeMatcherId && store.state.captures.find((c) => c.id === activeMatcherId);
    if (cap) {
      cap.matcher = re;
      store._flush();
      flash(`→ #${store.state.captures.indexOf(cap) + 1} set to ${label}`, 'ok');
    } else {
      copyToClipboard(re);
      flash(`copied ${label}`, 'ok');
    }
  });
}

function capFromEvent(ev) {
  const wrap = ev.target.closest('.cap');
  if (!wrap) return null;
  return store.state.captures.find((c) => c.id === wrap.dataset.id);
}

function clearCaptures() {
  store.set({ captures: [], templateLine: null });
  flash('captures cleared', 'ok');
}

function doCopy() {
  const state = store.state;
  const { pattern, error } = computePattern(state);
  if (!pattern || error) { flash('nothing valid to copy', 'warn'); return; }
  copyToClipboard(formatFor(state.outputFormat, pattern, state.flags));
  flash('⧉ copied to clipboard', 'ok');
}

// ── keyboard shortcuts ───────────────────────────────────────────────────────

function shortcuts() {
  window.addEventListener('keydown', (ev) => {
    const mod = ev.ctrlKey || ev.metaKey;
    if (!mod) return;
    if (ev.key === 'k' || ev.key === 'K') { ev.preventDefault(); clearCaptures(); }
    else if (ev.key === 'Enter') {
      ev.preventDefault();
      store.set({ view: store.state.view === 'build' ? 'test' : 'build' });
    } else if ((ev.key === 'b' || ev.key === 'B')) { ev.preventDefault(); store.set({ view: 'build' }); }
    else if ((ev.key === 'l' || ev.key === 'L')) { ev.preventDefault(); el.libSearch.focus(); }
    else if (ev.shiftKey && (ev.key === 'c' || ev.key === 'C')) { ev.preventDefault(); doCopy(); }
  });
}

// ── init ─────────────────────────────────────────────────────────────────────

export function init() {
  el = {
    input: document.getElementById('input'),
    backdrop: document.getElementById('backdrop'),
    highlights: document.getElementById('highlights'),
    editor: document.getElementById('editor'),
    editorHint: document.getElementById('editorHint'),
    onboard: document.getElementById('onboard'),
    onboardTip: document.getElementById('onboardTip'),
    viewTabs: document.getElementById('viewTabs'),
    fmtTabs: document.getElementById('fmtTabs'),
    flags: document.getElementById('flags'),
    optWs: document.getElementById('optWs'),
    optAnchor: document.getElementById('optAnchor'),
    captures: document.getElementById('captures'),
    capCount: document.getElementById('capCount'),
    library: document.getElementById('library'),
    libSearch: document.getElementById('libSearch'),
    explain: document.getElementById('explain'),
    outRegex: document.getElementById('outRegex'),
    outStatus: document.getElementById('outStatus'),
    btnCopy: document.getElementById('btnCopy'),
    btnClear: document.getElementById('btnClear'),
    btnSample: document.getElementById('btnSample'),
    btnTipNext: document.getElementById('btnTipNext'),
    btnOnboardClose: document.getElementById('btnOnboardClose'),
    stMode: document.getElementById('stMode'),
    stCaptures: document.getElementById('stCaptures'),
    stMatches: document.getElementById('stMatches'),
    stFlags: document.getElementById('stFlags'),
  };

  el.input.value = store.state.input;
  wire();
  shortcuts();
  initOnboarding();
  store.subscribe(renderAll);
  renderAll(store.state);
}
