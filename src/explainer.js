// explainer.js — lightweight tokenizer that renders a regex as human-readable
// components. Not a full parser; it recognizes the constructs that show up in
// log-parsing patterns and narrates them.

const CLASS_MEANINGS = {
  d: 'any digit (0-9)',
  D: 'any non-digit',
  w: 'a word char (A-Z a-z 0-9 _)',
  W: 'a non-word char',
  s: 'any whitespace',
  S: 'any non-whitespace',
  b: 'a word boundary',
  B: 'a non-word boundary',
  n: 'a newline',
  r: 'a carriage return',
  t: 'a tab',
  0: 'a NUL byte',
};

export function explain(pattern) {
  const out = [];
  let i = 0;
  const n = pattern.length;

  const push = (sym, desc) => out.push({ sym, desc });

  while (i < n) {
    const c = pattern[i];

    // Anchors
    if (c === '^') { push('^', 'start of line/string'); i++; continue; }
    if (c === '$') { push('$', 'end of line/string'); i++; continue; }

    // Groups
    if (c === '(') {
      if (pattern.startsWith('(?<', i) && pattern[i + 2] !== '=' && pattern[i + 2] !== '!') {
        const close = pattern.indexOf('>', i);
        const name = pattern.slice(i + 3, close);
        push(pattern.slice(i, close + 1), `start named capture group «${name}»`);
        i = close + 1;
        continue;
      }
      if (pattern.startsWith('(?:', i)) { push('(?:', 'start non-capturing group'); i += 3; continue; }
      if (pattern.startsWith('(?=', i)) { push('(?=', 'start positive lookahead'); i += 3; continue; }
      if (pattern.startsWith('(?!', i)) { push('(?!', 'start negative lookahead'); i += 3; continue; }
      if (pattern.startsWith('(?<=', i)) { push('(?<=', 'start positive lookbehind'); i += 4; continue; }
      if (pattern.startsWith('(?<!', i)) { push('(?<!', 'start negative lookbehind'); i += 4; continue; }
      push('(', 'start capture group'); i++; continue;
    }
    if (c === ')') { push(')', 'end group'); i++; continue; }

    // Character classes
    if (c === '[') {
      const close = findClassEnd(pattern, i);
      const body = pattern.slice(i, close + 1);
      const neg = pattern[i + 1] === '^';
      push(body, neg ? 'any char NOT in this set' : 'any one char in this set');
      i = close + 1;
      continue;
    }

    // Escapes
    if (c === '\\') {
      const next = pattern[i + 1] ?? '';
      if (CLASS_MEANINGS[next]) { push('\\' + next, CLASS_MEANINGS[next]); }
      else { push('\\' + next, `literal "${next}"`); }
      i += 2;
      continue;
    }

    // Quantifiers
    if (c === '*') { i++; push('*' + lazy(pattern, i), '0 or more'); if (pattern[i] === '?') i++; continue; }
    if (c === '+') { i++; push('+' + lazy(pattern, i), '1 or more'); if (pattern[i] === '?') i++; continue; }
    if (c === '?') { i++; push('?' + lazy(pattern, i), 'optional (0 or 1)'); if (pattern[i] === '?') i++; continue; }
    if (c === '{') {
      const close = pattern.indexOf('}', i);
      if (close !== -1) {
        const q = pattern.slice(i, close + 1);
        push(q, `repeat ${q.slice(1, -1)} times`);
        i = close + 1;
        if (pattern[i] === '?') i++;
        continue;
      }
    }

    // Alternation / wildcard
    if (c === '|') { push('|', 'OR (alternation)'); i++; continue; }
    if (c === '.') { push('.', 'any char (except newline)'); i++; continue; }

    // Literal run
    let j = i;
    while (j < n && !'^$()[]\\*+?{|.'.includes(pattern[j])) j++;
    if (j === i) j = i + 1;
    push(pattern.slice(i, j), `literal text`);
    i = j;
  }

  return out;
}

function lazy(pattern, i) {
  return pattern[i] === '?' ? '?' : '';
}

function findClassEnd(pattern, start) {
  let i = start + 1;
  if (pattern[i] === '^') i++;
  if (pattern[i] === ']') i++; // leading ] is literal
  while (i < pattern.length) {
    if (pattern[i] === '\\') { i += 2; continue; }
    if (pattern[i] === ']') return i;
    i++;
  }
  return pattern.length - 1;
}
