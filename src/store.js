// store.js — tiny reactive state container with localStorage persistence.

const KEY = '0xreghex.session.v1';

const DEFAULT_INPUT = `1331901000.260000\tC6SwUo2lWDfrpgfgVl\t192.168.202.79\t50504\t192.168.229.251\t80\ttcp\thttp\t0.010000\t182\t214\tSF
1331901001.440000\tC26Bhi2scZzizn7ph9\t192.168.202.79\t50681\t192.168.229.251\t80\ttcp\thttp\t0.010000\t172\t281\tSF
1331901050.450000\tCnbU9V2P0WWwMlO1l\t192.168.202.76\t51719\t213.199.179.147\t80\ttcp\t-\t3.010000\t0\t0\tS0
1331901079.900000\tCyu9CADFj5Kg5rhf4\t192.168.202.79\t48479\t192.168.229.153\t49160\ttcp\t-\t0.010000\t198\t118\tSF
1331901027.780000\tCcUhD5kLSPzplLI5e\t192.168.202.100\t45658\t192.168.27.152\t17533\tudp\t-\t-\t-\t-\tS0`;

const DEFAULTS = {
  input: DEFAULT_INPUT,
  templateLine: null, // zero-based line index of the template, or null
  captures: [], // [{ id, start, end, text, matcher, name, label }]
  flags: { g: true, i: false, m: false, s: false, u: false },
  generalizeWs: true,
  anchor: false,
  outputFormat: 'js', // js | grep | python | raw
  view: 'build', // build | test
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw);
    return { ...DEFAULTS, ...saved, flags: { ...DEFAULTS.flags, ...(saved.flags || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

export const store = {
  state: load(),
  listeners: new Set(),

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  set(patch) {
    Object.assign(this.state, patch);
    this._flush();
  },

  update(fn) {
    fn(this.state);
    this._flush();
  },

  reset() {
    this.state = { ...DEFAULTS };
    this._flush();
  },

  /** Save without notifying subscribers — used for focus-sensitive inline edits. */
  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch { /* storage may be full/blocked — non-fatal */ }
  },

  _flush() {
    for (const l of this.listeners) l(this.state);
    this.persist();
  },
};
