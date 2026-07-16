import assert from 'node:assert/strict';

import { buildRegex, formatFor } from '../src/regexEngine.js';
import { inferMatchers } from '../src/patterns.js';
import { runTest } from '../src/tester.js';

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

console.log('smoke checks passed');
