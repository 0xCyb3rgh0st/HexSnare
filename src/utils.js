// utils.js — escaping, line math, highlight rendering, clipboard, misc helpers.

/** Escape a literal string so it matches itself inside a regex. */
export function escapeLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** Escape text for safe insertion into innerHTML. */
export function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));
}

/**
 * Resolve the line that contains absolute offset `pos`.
 * Returns { index, start, end, text } where start/end are absolute
 * offsets and end excludes the trailing newline.
 */
export function getLineAt(text, pos) {
  const start = text.lastIndexOf('\n', pos - 1) + 1;
  let end = text.indexOf('\n', pos);
  if (end === -1) end = text.length;
  const before = text.slice(0, start);
  const index = before.length ? before.split('\n').length - 1 : 0;
  return { index, start, end, text: text.slice(start, end) };
}

/** Absolute [start,end) offsets of a zero-based line index. */
export function lineBounds(text, index) {
  const lines = text.split('\n');
  let start = 0;
  for (let i = 0; i < index && i < lines.length; i++) start += lines[i].length + 1;
  const end = start + (lines[index] ? lines[index].length : 0);
  return { start, end, text: lines[index] ?? '' };
}

/**
 * Render `text` as HTML with highlight <mark> spans.
 * `ranges` = [{ start, end, cls, title? }] and may overlap arbitrarily;
 * overlapping ranges stack their classes onto the same segment.
 */
export function renderHighlights(text, ranges) {
  const clean = ranges.filter((r) => r.end > r.start);
  if (!clean.length) return escapeHtml(text);

  const points = new Set([0, text.length]);
  for (const r of clean) {
    if (r.start >= 0 && r.start <= text.length) points.add(r.start);
    if (r.end >= 0 && r.end <= text.length) points.add(r.end);
  }
  const bounds = [...points].sort((a, b) => a - b);

  let html = '';
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i];
    const b = bounds[i + 1];
    if (a === b) continue;
    const seg = escapeHtml(text.slice(a, b));
    const active = clean.filter((r) => r.start <= a && r.end >= b);
    if (active.length) {
      const cls = active.map((r) => r.cls).join(' ');
      const title = active.map((r) => r.title).filter(Boolean).join(' • ');
      html += `<mark class="${cls}"${title ? ` title="${escapeHtml(title)}"` : ''}>${seg}</mark>`;
    } else {
      html += seg;
    }
  }
  return html;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* noop */ }
  ta.remove();
  return Promise.resolve();
}

/**
 * Trim leading/trailing whitespace off a raw text-selection span.
 * A drag-select or double-click can overshoot into an adjacent tab/space;
 * if that whitespace is left inside the capture's [start,end) range, the
 * regex builder skips past it as part of the group instead of re-emitting
 * it as literal/\s+ text, silently dropping it from the generated pattern.
 * Returns adjusted absolute-offset-relative start/end plus the trimmed text.
 */
export function trimSelection(text, start, end) {
  const lead = text.match(/^\s+/);
  const trail = text.match(/\s+$/);
  const trimStart = lead ? start + lead[0].length : start;
  const trimEnd = trail ? end - trail[0].length : end;
  return {
    start: trimStart,
    end: trimEnd,
    text: text.slice(lead ? lead[0].length : 0, trail ? text.length - trail[0].length : text.length),
  };
}

/** A short, stable id for capture groups. */
let _idc = 0;
export function uid(prefix = 'c') {
  return `${prefix}${Date.now().toString(36)}${(_idc++).toString(36)}`;
}
