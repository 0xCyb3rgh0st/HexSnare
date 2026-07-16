// tester.js — run a pattern against the full input and collect matches.

import { flagsToString } from './regexEngine.js';

const MATCH_CAP = 5000; // guard against runaway / zero-length loops

/**
 * @returns {{
 *   error: string|null,
 *   matches: Array<{ index, end, text, groups, indices }>,
 *   count: number,
 *   truncated: boolean
 * }}
 */
export function runTest(pattern, flags, input) {
  if (!pattern) return { error: null, matches: [], count: 0, truncated: false };

  let base = flagsToString(flags);
  if (!base.includes('g')) base += 'g';
  // `d` gives per-group indices for precise highlighting (ES2022+).
  let re;
  try {
    re = new RegExp(pattern, base + 'd');
  } catch {
    try {
      re = new RegExp(pattern, base); // fallback without indices
    } catch (e) {
      return { error: e.message, matches: [], count: 0, truncated: false };
    }
  }

  const matches = [];
  let m;
  let truncated = false;
  re.lastIndex = 0;
  while ((m = re.exec(input)) !== null) {
    const groups = [];
    const idx = m.indices; // may be undefined if `d` unsupported
    for (let i = 1; i < m.length; i++) {
      groups.push({
        text: m[i] ?? null,
        range: idx && idx[i] ? { start: idx[i][0], end: idx[i][1] } : null,
        name: nameForIndex(re, i, idx, m),
      });
    }
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      text: m[0],
      groups,
    });
    if (m.index === re.lastIndex) re.lastIndex++; // escape zero-width matches
    if (matches.length >= MATCH_CAP) { truncated = true; break; }
  }

  return { error: null, matches, count: matches.length, truncated };
}

function nameForIndex(re, i, indices, m) {
  if (!m.groups) return null;
  // Map a numbered group back to its name via the named indices, if present.
  if (indices && indices.groups) {
    for (const [name, span] of Object.entries(indices.groups)) {
      if (span && indices[i] && span[0] === indices[i][0] && span[1] === indices[i][1]) {
        return name;
      }
    }
  }
  return null;
}
