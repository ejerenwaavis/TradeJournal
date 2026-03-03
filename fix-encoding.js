const fs = require('fs');
const f = 'c:/Users/ejere/OneDrive/Documents/Projects/TradeJournal/client/src/pages/TradeDetailPage.jsx';
let c = fs.readFileSync(f, 'utf8');
const fixes = [
  ['\u00e2\u20ac\u201c', '\u2014'],  // â€" → —
  ['\u00e2\u20ac\u00a6', '\u2026'],  // â€¦ → …
  ['\u00e2\u20ac\u00b9', '\u2039'],  // â€¹ → ‹
  ['\u00e2\u20ac\u00ba', '\u203a'],  // â€º → ›
  ['\u00e2\u2020\u2014', '\u2197'],  // â†— → ↗
  ['\u00e2\u2020\u2019', '\u2192'],  // â†' → →
  ['\u00e2\u2020',       '\u2190'],  // â† → ←  (shorter, do after longer matches)
  ['\u00e2\u201c\u20ac', '\u2500'],  // â"€ → ─
  ['\u00c2\u00b7',       '\u00b7'],  // Â· → ·
  ['\u00c3\u00d7',       '\u00d7'],  // Ã— → ×
];
fixes.forEach(([a, b]) => { while (c.includes(a)) c = c.split(a).join(b); });
fs.writeFileSync(f, c, 'utf8');
const remaining = (c.match(/\u00e2\u20ac|\u00c3\u00d7|\u00c2\u00b7/g) || []).length;
console.log('Done. Remaining mojibake:', remaining);
