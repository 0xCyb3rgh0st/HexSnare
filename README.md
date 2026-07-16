# 0xRegHex ⌗

**Regex forge for log hunters & pentesters.** Paste raw logs, *select* the tokens you care about, and 0xRegHex forges a portable, capture-group regex you can drop into `grep -P`, Python, or JS.

A 100% client-side SPA — no backend, no telemetry, no runtime dependencies. Your logs never leave the browser.

## Features

- **Select-to-forge** — highlight any token on a log line to mint a color-coded capture group.
- **Smart inference** — selecting `192.168.1.1`, a SHA-256, a JWT, an epoch, etc. suggests a tuned matcher automatically (override or name each group).
- **Security pattern library** — one-click IPv4/6, MAC, MD5/SHA/UUID, JWT, Base64, AWS/GitHub/Slack keys, CVE-ID, private-key headers, Apache/syslog timestamps, and more.
- **Live tester** — runs your pattern over every line, counts matches, and highlights hits + extracted groups in-editor.
- **Multi-target export** — JS `/…/gi`, `grep -P '…'`, or `re.compile(r"…")`.
- **Regex explainer** — plain-English breakdown of the generated pattern.
- **Whitespace generalization** (`\s+`) and `^…$` anchoring toggles for robust log lines.
- **Session autosave** to `localStorage`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl/⌘ + Enter` | Toggle BUILD ⇄ TEST |
| `Ctrl/⌘ + K` | Clear captures |
| `Ctrl/⌘ + Shift + C` | Copy current output |
| `Ctrl/⌘ + L` | Focus library filter |

## Run

```bash
npm install
npm run dev      # http://localhost:1337
npm run build    # static bundle → dist/
```

## Stack

Vanilla JS (ES2022 modules) · Vite · hand-written CSS. That's it.

```
src/
  main.js         bootstrap
  ui.js           DOM rendering + events
  store.js        reactive state + localStorage
  regexEngine.js  template → capture-group regex
  patterns.js     token inference + security library
  tester.js       live match engine (uses /d group indices)
  explainer.js    regex → human-readable breakdown
  utils.js        escaping, line math, highlight renderer
  styles.css      terminal/hacker theme
```

## License

MIT
