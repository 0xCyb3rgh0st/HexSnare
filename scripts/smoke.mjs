import assert from 'node:assert/strict';

import { buildRegex, formatFor } from '../src/regexEngine.js';
import { inferMatchers, PATTERN_LIBRARY } from '../src/patterns.js';
import { runTest } from '../src/tester.js';
import { trimSelection } from '../src/utils.js';

const flags = { g: true, i: false, m: false, s: false, u: false };

const built = buildRegex(
  'ip=192.168.1.1 user=bob',
  [
    { start: 3, end: 14, matcher: '\\d{1,3}(?:\\.\\d{1,3}){3}', name: 'ip' },
    { start: 20, end: 23, matcher: '\\w+', name: 'user' },
  ],
  { generalizeWs: true, anchor: true },
);

assert.equal(built.error, null);
assert.equal(
  built.pattern,
  '^ip=(?<ip>\\d{1,3}(?:\\.\\d{1,3}){3})\\s+user=(?<user>\\w+)$',
);

const py = formatFor('python', built.pattern, { ...flags, i: true });
assert.equal(
  py,
  're.compile(r"^ip=(?P<ip>\\d{1,3}(?:\\.\\d{1,3}){3})\\s+user=(?P<user>\\w+)$", re.IGNORECASE)',
);

const js = formatFor('js', built.pattern, flags);
assert.equal(js, '/^ip=(?<ip>\\d{1,3}(?:\\.\\d{1,3}){3})\\s+user=(?<user>\\w+)$/g');

assert.equal(inferMatchers('192.168.1.1')[0].label, 'IPv4 address');
assert.equal(inferMatchers('deadbeef')[0].label, 'Hex string');
assert.equal(inferMatchers('1331901000.260000')[0].label, 'Epoch timestamp');

const tested = runTest('(?<num>\\d+)', flags, 'a 123 b 456');
assert.equal(tested.error, null);
assert.equal(tested.count, 2);
assert.equal(tested.matches[0].groups[0].text, '123');
assert.deepEqual(tested.matches[0].groups[0].range, { start: 2, end: 5 });
assert.equal(tested.matches[0].groups[0].name, 'num');

// IPv6 "::" compression must be recognized — both loopback/link-local
// shorthand and full expansion — in the smart-matcher inference...
assert.equal(inferMatchers('::1')[0].label, 'IPv6 address');
assert.equal(inferMatchers('fe80::1')[0].label, 'IPv6 address');
assert.equal(inferMatchers('2001:db8::8a2e:370:7334')[0].label, 'IPv6 address');
assert.equal(inferMatchers('2001:0db8:85a3:0000:0000:8a2e:0370:7334')[0].label, 'IPv6 address');

// ...and in the pattern-library snippet, including full-length substring
// extraction from raw log text (not just a truncated partial match).
const ipv6Lib = PATTERN_LIBRARY.find((p) => p.cat === 'Network' && p.label === 'IPv6');
const ipv6Re = new RegExp(ipv6Lib.re, `${ipv6Lib.flags || ''}g`);
assert.deepEqual(
  [...'src=fe80::a1b2:c3d4:e5f6:7890 dst=::ffff:192.168.1.1'.matchAll(ipv6Re)].map((m) => m[0]),
  ['fe80::a1b2:c3d4:e5f6:7890', '::ffff:192.168.1.1'],
);

// Epoch timestamps: label promises "10-13 digit" (seconds vs. millisecond
// epoch) so both lengths must actually match.
const epochLib = PATTERN_LIBRARY.find((p) => p.cat === 'Time' && p.label === 'Epoch (10-13 digit)');
const epochRe = new RegExp(epochLib.re);
assert.ok(epochRe.test('1690000000'), '10-digit (seconds) epoch should match');
assert.ok(epochRe.test('1690000000123'), '13-digit (millisecond) epoch should match');
assert.equal(inferMatchers('1690000000123')[0].label, 'Epoch timestamp');

// trimSelection: a drag/double-click selection that overshoots into an
// adjacent tab/space must not leak that whitespace into the capture's
// offsets — it needs to come back out as ordinary literal text instead,
// otherwise buildRegex silently drops it from the generated pattern.
{
  const line = 'ip=192.168.1.1\tport=443';
  const overshotStart = line.indexOf('192.168.1.1');
  const overshotEnd = overshotStart + '192.168.1.1'.length + 1; // grabs the trailing tab
  const trimmed = trimSelection(line.slice(overshotStart, overshotEnd), overshotStart, overshotEnd);
  assert.equal(trimmed.text, '192.168.1.1');
  assert.equal(trimmed.end, overshotStart + '192.168.1.1'.length);

  const builtWithOvershoot = buildRegex(
    line,
    [{ start: trimmed.start, end: trimmed.end, matcher: '\\d{1,3}(?:\\.\\d{1,3}){3}', name: 'ip' }],
    { generalizeWs: true, anchor: false },
  );
  assert.equal(builtWithOvershoot.pattern, 'ip=(?<ip>\\d{1,3}(?:\\.\\d{1,3}){3})\\s+port=443');
  assert.ok(new RegExp(builtWithOvershoot.pattern).test(line), 'built pattern must still match its own source line');
}

console.log('smoke checks passed');
