// regexEngine.js — build a regex pattern from a template line + capture groups.

import { escapeLiteral } from './utils.js';

/**
 * Turn a literal chunk into regex source.
 * When `generalizeWs` is set, runs of whitespace collapse to \s+ so the
 * pattern survives tab/space drift between log lines.
 */
function literalPart(str, generalizeWs) {
  if (!str) return '';
  if (generalizeWs) {
    return str.replace(/\s+|\S+/g, (chunk) =>
      /^\s+$/.test(chunk) ? '\\s+' : escapeLiteral(chunk),
    );
  }
  return escapeLiteral(str);
}

/** Validate a capture-group name (JS identifier-ish). */
export function isValidGroupName(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/**
 * Build the pattern.
 * @param {string} template  the representative line
 * @param {Array}  captures  [{ start, end, matcher, name }] offsets into template
 * @param {object} opts      { generalizeWs, anchor }
 * @returns {{ pattern: string, error: string|null }}
 */
export function buildRegex(template, captures, opts = {}) {
  const { generalizeWs = true, anchor = false } = opts;
  const sorted = [...captures].sort((a, b) => a.start - b.start);

  let cursor = 0;
  let out = '';
  const usedNames = new Set();

  for (const cap of sorted) {
    if (cap.start < cursor) continue; // skip overlapping captures
    out += literalPart(template.slice(cursor, cap.start), generalizeWs);
    const body = cap.matcher && cap.matcher.length ? cap.matcher : '.*?';
    let name = (cap.name || '').trim();
    if (name && isValidGroupName(name) && !usedNames.has(name)) {
      usedNames.add(name);
      out += `(?<${name}>${body})`;
    } else {
      out += `(${body})`;
    }
    cursor = cap.end;
  }
  out += literalPart(template.slice(cursor), generalizeWs);

  if (anchor) out = `^${out}$`;

  // Sanity-compile so the UI can surface errors early.
  try {
    // eslint-disable-next-line no-new
    new RegExp(out);
  } catch (e) {
    return { pattern: out, error: e.message };
  }
  return { pattern: out, error: null };
}

/** Build a flags string from the toggle object. */
export function flagsToString(flags) {
  return ['g', 'i', 'm', 's', 'u'].filter((f) => flags[f]).join('');
}

/** Format the pattern for a target ecosystem. */
export function formatFor(target, pattern, flags) {
  const f = flagsToString(flags);
  switch (target) {
    case 'grep': {
      // grep -P uses PCRE; escape the single-quote-safe way.
      return `grep -P '${pattern.replace(/'/g, `'\\''`)}'`;
    }
    case 'python': {
      const py = [];
      if (flags.i) py.push('re.IGNORECASE');
      if (flags.m) py.push('re.MULTILINE');
      if (flags.s) py.push('re.DOTALL');
      const flagArg = py.length ? `, ${py.join(' | ')}` : '';
      const pyPattern = pattern
        .replace(/\(\?<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?P<$1>')
        .replace(/"/g, '\\"');
      return `re.compile(r"${pyPattern}"${flagArg})`;
    }
    case 'raw':
      return pattern;
    case 'js':
    default:
      return `/${pattern.replace(/\//g, '\\/')}/${f}`;
  }
}
