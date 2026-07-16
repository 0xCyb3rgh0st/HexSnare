# HexSnare

**Capture signals from noisy logs.**

HexSnare is a terminal-styled regex forge for log hunters, pentesters, DFIR analysts, and bug bounty researchers. Paste raw logs, select the tokens that matter, and generate clean capture-group regex for `grep -P`, Python, JavaScript, or raw workflows.

No backend. No telemetry. No log upload. Everything runs in your browser.

![Static](https://img.shields.io/badge/static-client--side-00ff9c?style=for-the-badge&labelColor=070a0f)
![Vite](https://img.shields.io/badge/vite-powered-35e0ff?style=for-the-badge&labelColor=070a0f)
![License](https://img.shields.io/badge/license-MIT-ffcf4d?style=for-the-badge&labelColor=070a0f)

## What It Does

HexSnare turns messy log lines into reusable regex patterns.

1. Paste raw logs.
2. Highlight an IP, hash, token, path, user, status code, or timestamp.
3. HexSnare creates a capture group.
4. Tune the matcher, name the group, and test against all lines.
5. Export the regex for your target tool.

## Features

- Select-to-forge capture groups from real log tokens
- Smart matcher suggestions for IPs, hashes, JWTs, timestamps, UUIDs, and security artifacts
- Live TEST mode with match counts and highlighted captures
- Pattern library for common hunting and pentest regex snippets
- Output formats for JavaScript, Python, `grep -P`, and raw regex
- Regex explanation panel for quick pattern review
- Whitespace generalization with `\s+`
- Full-line anchoring with `^...$`
- Session autosave in `localStorage`
- Hacker-style UI with onboarding tips and hover hints

## Use Cases

- Build regex from proxy, access, auth, syslog, or app logs
- Extract indicators of compromise from noisy text
- Prepare `grep -P` commands during recon or triage
- Create reusable capture groups for scripts and reports
- Test log parsing ideas without sending logs to a server

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:1337
```

Build static files:

```bash
npm run build
```

Run smoke checks:

```bash
npm test
```

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Command + Enter` | Toggle BUILD / TEST |
| `Ctrl/Command + K` | Clear captures |
| `Ctrl/Command + Shift + C` | Copy current output |
| `Ctrl/Command + L` | Focus pattern library search |

## Project Structure

```text
src/
  main.js         App bootstrap
  ui.js           DOM rendering, events, onboarding
  store.js        Reactive state and localStorage
  regexEngine.js  Capture groups to generated regex
  patterns.js     Matcher inference and pattern library
  tester.js       Live match engine
  explainer.js    Regex breakdown
  utils.js        Escaping, line math, highlighting
  styles.css      Terminal UI theme

scripts/
  smoke.mjs       Smoke checks
```

## Privacy

HexSnare is fully client-side. Logs stay in the browser unless you copy, export, or deploy modified code that sends them elsewhere.

Do not put secrets, API keys, private payloads, or sensitive investigation data into any public frontend app unless you understand the risk.

## Stack

- Vanilla JavaScript
- Vite
- CSS
- Browser `localStorage`

## License

MIT
