# HexSnare — User Manual

HexSnare turns a pasted log line into a working regex by letting you
*select* the parts that matter instead of writing the pattern by hand.
Everything runs client-side in the browser — nothing you paste ever
leaves the page.

This manual covers the full workflow, every panel, the pattern
library, and the output formats. For a one-paragraph pitch and install
steps, see [README.md](README.md).

---

## 1. Mental model

HexSnare works on one **template line** at a time:

1. You paste (or keep the sample) multi-line log text into the editor.
2. You pick **one line** to be the template — done automatically the
   first time you select a token.
3. You select tokens on that line (an IP, a hash, a username, a
   status code…) and each selection becomes a **capture group**.
4. HexSnare stitches the literal text between your selections back
   together with the regex bodies you picked, producing one full
   pattern.
5. You flip to **TEST** to run that pattern against *every* line in
   the editor and see what actually matches.
6. You copy the result formatted for JS, Python, `grep -P`, or raw.

You are never fighting a blank regex — you're always looking at a
pattern built from a real line of your own data.

---

## 2. BUILD mode — turning selections into capture groups

1. Click the **◈ BUILD** tab (or `Ctrl/Cmd + Enter` to toggle).
2. In the editor, double-click or drag-select a token — e.g. the IP
   address in `192.168.202.79`.
   - The **first** selection you make on any line locks that line in
     as the template (shown in the editor hint: `template = line N`).
   - Every later selection must stay on that same line. Selecting on
     a different line shows a warning — clear captures first
     (`Ctrl/Cmd + K`) if you want to switch lines.
3. HexSnare guesses the best regex body for what you selected (see
   §4) and adds a **capture group** card in the *capture groups*
   panel on the right.
4. In each capture group card you can:
   - **Name it** (`ip`, `user`, `status`, …) — becomes a named group
     `(?<name>…)` in the output. Leave it blank for a plain
     numbered group `(…)`.
   - **Pick a different matcher** from the suggestion dropdown, or
     choose **✎ custom…** and type your own regex body directly into
     the matcher field below it.
   - **Delete** the group with the ✕ button.
5. Repeat for every token you want captured. The generated pattern
   updates live in the **output panel** and the **explain panel** as
   you go.

Two checkboxes above the editor change how the *literal* (non-captured)
text is turned into regex:

| Option | Effect |
| --- | --- |
| `generalize \s+` | Collapses any run of literal whitespace between tokens into `\s+`, so the pattern survives lines with different tab/space spacing. On by default. |
| `anchor ^$` | Wraps the whole pattern in `^…$` so it only matches a full line, not a substring anywhere in it. |

---

## 3. TEST mode — checking the pattern against real data

Click **◎ TEST** (or `Ctrl/Cmd + Enter`). The editor becomes read-only
and HexSnare runs the current pattern against the *entire* input with
the `g` flag forced on, highlighting:

- **Full matches** in one highlight style.
- **Each capture group's span** inside the match, color-coded per
  group (up to 8 distinct colors before they repeat).

The status bar at the bottom always shows:

- Current mode (`◈ BUILD` / `◎ TEST`)
- Number of capture groups
- Match count vs. total line count (or `⚠ invalid regex` if the
  pattern doesn't compile)
- Active flags

Switch back to BUILD to keep editing groups — TEST always reflects
whatever pattern BUILD currently produces.

---

## 4. Smart matcher suggestions

When you select a token, HexSnare tests it against a list of known
shapes (most specific first) and offers the best-fitting regex body
as the default, with the rest available in the dropdown:

| Detected as | Example | Regex body used |
| --- | --- | --- |
| IPv4 address | `192.168.1.1` | `\d{1,3}(?:\.\d{1,3}){3}` |
| IPv6 address | `fe80::1`, `::ffff:10.0.0.1`, full 8-group form | full RFC 4291 shape incl. `::` compression |
| MAC address | `00:1A:2B:3C:4D:5E` | |
| UUID / GUID | `550e8400-e29b-41d4-a716-446655440000` | |
| SHA-256 / SHA-1 / MD5 | 64 / 40 / 32 hex chars | |
| JWT | `eyJ…….…….…` | |
| Email | `user@example.com` | |
| URL | `https://…` | |
| ISO-8601 timestamp | `2024-01-02T03:04:05Z` | |
| Epoch timestamp | 10–13 digit unix time, optional fraction | `\d{10,13}(?:\.\d+)?` |
| Float / Integer | `-3.14`, `42` | |
| Hex (`0x…`) / hex string | `0xFF`, `deadbeef` | |
| Quoted string | `"like this"` | |
| Word / token | any `\w+` run | |

If nothing specific matches, generic fallbacks are always offered:
lazy `.*?`, greedy `.+`, `\S+`, `[^\s]+`, `[^\t]+` — useful for
delimiter-separated logs (TSV, pipe-separated, etc.).

> **Fixed in this pass:** the IPv6 detector previously only matched
> the fully expanded 8-group form (`2001:0db8:85a3:0000:...`) and
> silently failed on the `::` zero-compression shorthand that almost
> all real IPv6 addresses use — `::1`, `fe80::1`,
> `2001:db8::8a2e:370:7334`, IPv4-mapped `::ffff:10.0.0.1`, etc. Those
> now resolve correctly, both as a BUILD suggestion and in the
> pattern-library snippet below (including full-length extraction
> from raw text, not a truncated partial match).
> Likewise, **Epoch (10-13 digit)** was labeled for both second- and
> millisecond-precision unix time but its regex only ever matched
> exactly 10 digits — a 13-digit millisecond epoch (e.g. from
> JavaScript's `Date.now()`, or most modern JSON logs) silently
> failed to match. It now matches 10–13 digits as advertised.

---

## 5. Pattern library

The right-hand **▤ pattern library** panel holds ready-to-use regex
snippets, grouped by category and searchable (`Ctrl/Cmd + L` focuses
the search box).

**Click a library item:**
- If a capture group's matcher field currently has focus, the
  snippet **replaces that group's matcher** in place.
- Otherwise, the snippet is **copied to the clipboard** so you can
  paste it directly into `grep -P`, a script, or anywhere else.

| Category | Patterns |
| --- | --- |
| Network | IPv4, IPv6 (with `::` compression), CIDR, MAC address, host:port, Domain/FQDN, URL, Email, User-Agent |
| Crypto | MD5, SHA-1, SHA-256, UUID/GUID, Base64 blob, JWT, PEM private-key header |
| Secrets | AWS Access Key, AWS Secret Key, GitHub token, Slack token, Google API key, generic `api_key=`/`token=`/`password=` |
| Time | Epoch (10–13 digit), ISO-8601, syslog date, Apache CLF date |
| Web | HTTP method, HTTP status, request line, query param |
| System | Windows path, Unix path, registry key, PID/process |
| Intel | CVE ID, Bitcoin address, credit card, US SSN |
| Generic | Integer, Float, hex number, word, quoted string, whitespace run |

> **Heads-up on approximate patterns:** a few library entries are
> intentionally loose/heuristic rather than strict validators — e.g.
> **CIDR** and the smart-matcher's **IPv4** body don't re-check that
> each octet is ≤ 255 the way the IPv4 *detector* does, **Credit
> card** matches digit-count shape rather than a Luhn-valid number,
> and **Bitcoin address** matches base58/bech32 shape, not a
> checksum-verified address. Treat these as "looks like" filters for
> triage, not as validators — that's the standard trade-off for
> log-hunting regex and matches how `grep -P` triage patterns are
> normally used.

---

## 6. Output panel

Along the top of the output panel, pick the target ecosystem:

| Format | Output |
| --- | --- |
| `JS` | `/pattern/flags` — a literal JavaScript RegExp |
| `grep -P` | `grep -P 'pattern'` — quoted for a shell, PCRE named groups kept as `(?<name>…)` |
| `Python` | `re.compile(r"pattern", re.IGNORECASE \| …)` — named groups rewritten to `(?P<name>…)` |
| `raw` | Just the pattern string, no wrapper |

Flags (`g`, `i`, `m`, `s`) toggle at the top of the window and feed
into whichever format is active. Click **⧉ copy** (or
`Ctrl/Cmd + Shift + C`) to copy the formatted string.

---

## 7. Explain panel

The **❯ explain** panel breaks the current pattern down token by
token — anchors, groups, character classes, escapes, quantifiers,
alternation — with a one-line plain-English description for each
piece. Useful for sanity-checking a pattern you just built, or one
you pasted in via a custom matcher.

---

## 8. Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + Enter` | Toggle BUILD / TEST |
| `Ctrl/Cmd + K` | Clear all capture groups |
| `Ctrl/Cmd + Shift + C` | Copy the current output |
| `Ctrl/Cmd + L` | Focus the pattern-library search box |
| `Ctrl/Cmd + B` | Switch to BUILD |

---

## 9. Session, privacy, and reset

- Your input, capture groups, and settings **autosave to
  `localStorage`** as you work, so a page reload picks up where you
  left off.
- **`sample`** (toolbar button) discards your session and reloads the
  built-in example log — useful for a clean slate or to see the tool
  in action.
- **`clear`** (`Ctrl/Cmd + K`) removes capture groups and unlocks the
  template line, but keeps your pasted text.
- Nothing is ever sent over the network — there is no backend. Don't
  paste real secrets/PII into any public deployment of this tool (or
  any browser tool) unless you understand and accept that risk.

---

## 10. Troubleshooting

- **"⚠ invalid regex" / red status.** One of your capture group
  matchers doesn't compile (unbalanced parens, bad escape, etc.) —
  check the *explain* panel or the matcher field highlighted by the
  error flash message.
- **A capture group disappeared.** Editing the input text can shift
  or invalidate offsets; groups that no longer fit inside the
  (possibly shorter) template line are dropped automatically. Reselect
  the token.
- **Selecting text does nothing.** Selections are only captured in
  BUILD mode, and only within a single line — a selection spanning a
  newline is clipped to the first line's remainder.
- **The pattern matches more/less than expected in TEST.** Check the
  `generalize \s+` and `anchor ^$` toggles — both change how strict
  or loose the *literal* portions of the pattern are, independent of
  what each capture group itself matches.

---

## 11. Developer notes (for anyone extending HexSnare)

- `src/patterns.js` — detector list (`inferMatchers`) and the
  insertable `PATTERN_LIBRARY`. This is where to add a new smart
  matcher or library snippet.
- `src/regexEngine.js` — turns a template line + capture list into a
  final pattern string, and formats it per target ecosystem.
- `src/tester.js` — runs a pattern against the full input for TEST
  mode, capped at 5000 matches to guard against runaway/zero-width
  loops.
- `src/explainer.js` — the token-by-token breakdown used by the
  *explain* panel. It's a light lexer, not a full regex parser — it
  recognizes the constructs that actually show up in log-parsing
  patterns.
- `scripts/smoke.mjs` (`npm test`) — fast assertions covering
  pattern building, formatting, matcher inference, and the live
  match engine. Run this after touching any of the above; it now
  also pins the IPv6 `::`-compression and 10–13 digit epoch behavior
  described in §4 so they can't silently regress again.
