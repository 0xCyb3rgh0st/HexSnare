// patterns.js — token-type inference + curated security pattern library.
//
// Two exports:
//   inferMatchers(text)  -> ordered candidate capture matchers for a selection
//   PATTERN_LIBRARY      -> insertable, categorized regex snippets for pentesters
//
// A "matcher" is the INNER body of a capture group (no surrounding parens);
// regexEngine wraps it in ( ... ) or (?<name> ... ).

// ---- Detectors: full-selection type guesses -------------------------------
// Each detector's `test` is anchored against the WHOLE selection. When it
// matches, `matcher` is offered as a smart capture body, most-specific first.

const DETECTORS = [
  {
    label: 'IPv4 address',
    test: /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/,
    matcher: '\\d{1,3}(?:\\.\\d{1,3}){3}',
    name: 'ip',
  },
  {
    label: 'IPv6 address',
    test: /^(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}$|^::(?:[A-F0-9]{1,4}:){0,6}[A-F0-9]{1,4}$/i,
    matcher: '[A-Fa-f0-9:]+',
    name: 'ip6',
  },
  {
    label: 'MAC address',
    test: /^(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,
    matcher: '(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}',
    name: 'mac',
  },
  {
    label: 'UUID / GUID',
    test: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    matcher: '[0-9a-fA-F-]{36}',
    name: 'uuid',
  },
  {
    label: 'SHA-256 hash',
    test: /^[0-9a-f]{64}$/i,
    matcher: '[0-9a-fA-F]{64}',
    name: 'sha256',
  },
  {
    label: 'SHA-1 hash',
    test: /^[0-9a-f]{40}$/i,
    matcher: '[0-9a-fA-F]{40}',
    name: 'sha1',
  },
  {
    label: 'MD5 hash',
    test: /^[0-9a-f]{32}$/i,
    matcher: '[0-9a-fA-F]{32}',
    name: 'md5',
  },
  {
    label: 'JWT',
    test: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    matcher: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
    name: 'jwt',
  },
  {
    label: 'Email',
    test: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    matcher: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    name: 'email',
  },
  {
    label: 'URL',
    test: /^[a-z][a-z0-9+.-]*:\/\/\S+$/i,
    matcher: '[a-z][a-z0-9+.-]*:\\/\\/\\S+',
    name: 'url',
  },
  {
    label: 'ISO-8601 timestamp',
    test: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
    matcher: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?',
    name: 'ts',
  },
  {
    label: 'Epoch timestamp',
    test: /^\d{10}(?:\.\d+)?$/,
    matcher: '\\d{10}(?:\\.\\d+)?',
    name: 'epoch',
  },
  {
    label: 'Float',
    test: /^-?\d+\.\d+$/,
    matcher: '-?\\d+\\.\\d+',
    name: 'num',
  },
  {
    label: 'Integer',
    test: /^-?\d+$/,
    matcher: '\\d+',
    name: 'num',
  },
  {
    label: 'Hex (0x)',
    test: /^0x[0-9a-f]+$/i,
    matcher: '0x[0-9a-fA-F]+',
    name: 'hex',
  },
  {
    label: 'Hex string',
    test: /^[0-9a-f]+$/i,
    matcher: '[0-9a-fA-F]+',
    name: 'hex',
  },
  {
    label: 'Quoted string',
    test: /^"[^"]*"$/,
    matcher: '"[^"]*"',
    name: 'str',
  },
  {
    label: 'Word / token',
    test: /^\w+$/,
    matcher: '\\w+',
    name: 'word',
  },
];

// Generic fallbacks appended to every suggestion list.
const GENERIC = [
  { label: 'Any (lazy)', matcher: '.*?', name: 'field' },
  { label: 'Any (greedy)', matcher: '.+', name: 'field' },
  { label: 'Non-space run', matcher: '\\S+', name: 'field' },
  { label: 'Up to whitespace', matcher: '[^\\s]+', name: 'field' },
  { label: 'Up to tab', matcher: '[^\\t]+', name: 'field' },
];

/**
 * Return ordered candidate matchers for a selection, most-specific first,
 * always ending with generic fallbacks. First entry is the default.
 */
export function inferMatchers(text) {
  const trimmed = text.trim();
  const hits = [];
  const seen = new Set();
  for (const d of DETECTORS) {
    if (trimmed && d.test.test(trimmed) && !seen.has(d.matcher)) {
      hits.push({ label: d.label, matcher: d.matcher, name: d.name });
      seen.add(d.matcher);
    }
  }
  for (const g of GENERIC) {
    if (!seen.has(g.matcher)) {
      hits.push(g);
      seen.add(g.matcher);
    }
  }
  return hits;
}

// ---- Security pattern library ---------------------------------------------
// Full, insertable regex (with recommended flags where relevant). Aimed at
// log-hunting, DFIR, and pentest triage.

export const PATTERN_LIBRARY = [
  // Network
  { cat: 'Network', label: 'IPv4', re: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b' },
  { cat: 'Network', label: 'IPv6', re: '(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}', flags: 'i' },
  { cat: 'Network', label: 'CIDR', re: '(?:\\d{1,3}\\.){3}\\d{1,3}\\/\\d{1,2}' },
  { cat: 'Network', label: 'MAC address', re: '(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}' },
  { cat: 'Network', label: 'Port (host:port)', re: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}:(\\d{1,5})\\b' },
  { cat: 'Network', label: 'Domain / FQDN', re: '\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}\\b', flags: 'i' },
  { cat: 'Network', label: 'URL', re: '\\b[a-z][a-z0-9+.-]*:\\/\\/[^\\s"\'<>]+', flags: 'i' },
  { cat: 'Network', label: 'Email', re: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b' },
  { cat: 'Network', label: 'User-Agent', re: 'Mozilla\\/\\d\\.\\d \\([^)]*\\)[^"]*' },

  // Hashes & crypto
  { cat: 'Crypto', label: 'MD5', re: '\\b[a-f0-9]{32}\\b', flags: 'i' },
  { cat: 'Crypto', label: 'SHA-1', re: '\\b[a-f0-9]{40}\\b', flags: 'i' },
  { cat: 'Crypto', label: 'SHA-256', re: '\\b[a-f0-9]{64}\\b', flags: 'i' },
  { cat: 'Crypto', label: 'UUID / GUID', re: '\\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\b', flags: 'i' },
  { cat: 'Crypto', label: 'Base64 blob', re: '(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?' },
  { cat: 'Crypto', label: 'JWT', re: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+' },
  { cat: 'Crypto', label: 'Private key header', re: '-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----' },

  // Secrets & keys
  { cat: 'Secrets', label: 'AWS Access Key', re: '\\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}\\b' },
  { cat: 'Secrets', label: 'AWS Secret Key', re: '(?<![A-Za-z0-9/+])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+])' },
  { cat: 'Secrets', label: 'GitHub token', re: 'gh[pousr]_[A-Za-z0-9]{36,}' },
  { cat: 'Secrets', label: 'Slack token', re: 'xox[baprs]-[0-9A-Za-z-]{10,}' },
  { cat: 'Secrets', label: 'Google API key', re: 'AIza[0-9A-Za-z_-]{35}' },
  { cat: 'Secrets', label: 'Generic api_key=', re: '(?:api[_-]?key|secret|token|passwd|password)\\s*[=:]\\s*["\']?([^"\'\\s]+)', flags: 'i' },

  // Timestamps
  { cat: 'Time', label: 'Epoch (10-13 digit)', re: '\\b\\d{10}(?:\\.\\d+)?\\b' },
  { cat: 'Time', label: 'ISO-8601', re: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?' },
  { cat: 'Time', label: 'Syslog date', re: '[A-Z][a-z]{2}\\s+\\d{1,2}\\s\\d{2}:\\d{2}:\\d{2}' },
  { cat: 'Time', label: 'Apache CLF date', re: '\\[\\d{2}\\/[A-Za-z]{3}\\/\\d{4}:\\d{2}:\\d{2}:\\d{2} [+-]\\d{4}\\]' },

  // Web / HTTP
  { cat: 'Web', label: 'HTTP method', re: '\\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\\b' },
  { cat: 'Web', label: 'HTTP status', re: '\\b[1-5]\\d{2}\\b' },
  { cat: 'Web', label: 'Request line', re: '"(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) [^"]*? HTTP\\/\\d\\.\\d"' },
  { cat: 'Web', label: 'Query param', re: '[?&]([^=&\\s]+)=([^&\\s]*)' },

  // Filesystem
  { cat: 'System', label: 'Windows path', re: '[A-Za-z]:\\\\(?:[^\\\\\\/:*?"<>|\\r\\n]+\\\\?)*' },
  { cat: 'System', label: 'Unix path', re: '\\/(?:[^\\/\\0\\s]+\\/?)+' },
  { cat: 'System', label: 'Registry key', re: 'HK(?:LM|CU|CR|U|CC)\\\\[^\\r\\n]+' },
  { cat: 'System', label: 'PID / process', re: '\\b\\w+\\[(\\d+)\\]' },

  // Threat intel
  { cat: 'Intel', label: 'CVE ID', re: 'CVE-\\d{4}-\\d{4,7}' },
  { cat: 'Intel', label: 'Bitcoin address', re: '\\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\\b' },
  { cat: 'Intel', label: 'Credit card', re: '\\b(?:\\d[ -]*?){13,16}\\b' },
  { cat: 'Intel', label: 'US SSN', re: '\\b\\d{3}-\\d{2}-\\d{4}\\b' },

  // Generic
  { cat: 'Generic', label: 'Integer', re: '-?\\d+' },
  { cat: 'Generic', label: 'Float', re: '-?\\d+\\.\\d+' },
  { cat: 'Generic', label: 'Hex number', re: '0x[0-9a-fA-F]+' },
  { cat: 'Generic', label: 'Word', re: '\\w+' },
  { cat: 'Generic', label: 'Quoted string', re: '"[^"]*"' },
  { cat: 'Generic', label: 'Whitespace run', re: '\\s+' },
];

export const LIBRARY_CATEGORIES = [...new Set(PATTERN_LIBRARY.map((p) => p.cat))];
