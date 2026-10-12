# UI/UX Changes

Front-end review and improvements to Kita Kita (branch `feature/ui-ux-improvements`).
Functionality, the data model, the `kitakita:v1` storage key and every calculation in
`src/utils/finance.js` are unchanged. The Kita Kita branding (black badge, orange/white
wordmark, teal primary colour) is kept.

## What changed and why

| Area | Change | Why |
|---|---|---|
| Dead code | Deleted `src/App.css`, `src/index.css`, `src/assets/{hero.png,react.svg,vite.svg}`, `public/icons.svg` | Leftover Vite demo files. Nothing imported them and no selector in them was used. The built CSS hash was identical before and after removal. |
| Stylesheet | `src/styles.css` rewritten as one sectioned file with design tokens | Colours, type scale, spacing and radii now live in one place. The old file was minified onto single lines, defined the dark palette twice (including an unused `[data-theme]` copy), and repeated `.brand`/`.tag`. |
| Colour | Palette re-checked for WCAG 2.1 AA | Input borders were below 3:1; tip text was coloured text on a coloured background. Tips now use dark body text with a coloured label and edge. |
| Navigation | Tabs are sticky, 44px tall, and expose `aria-current="page"`. Skip link and `header`/`nav`/`main`/`footer` landmarks added. | Easier to reach in long lists and usable with a keyboard or screen reader. |
| Register form | "New entry" heading, inline validation message, live confirmation ("Sale of ₱1,234.50 recorded."), currency symbol inside the amount field, `aria-pressed` Sale/Expense toggle with a check mark | An invalid amount used to fail silently. Selection no longer depends on colour alone. |
| Entries list | Real `<ul>` lists, friendly dates ("Oct 12, 2026"), amounts never wrap, unique delete labels ("Delete Rent, ₱500.00 on Oct 12, 2026") | Raw ISO dates, wrapped minus signs, and 18px "×" targets with the label "Delete entry" on every row. |
| History | Entries grouped under month headings; "Reset sample data" styled as a danger action | Long lists are scannable; the destructive action is distinct from Export. |
| Insights | Stats as `<dl>`; tips have a text label (On track / Heads up / Action needed / Insight); chart shows month names, gridlines, striped expense bars, and has a text alternative plus a "View exact figures" table | Chart labels were `26-07`; red vs green bars were the only difference between series; the chart was invisible to screen readers. |
| Settings | Hint text under each field, `aria-expanded` on the toggle | Clearer meaning of "opening cash balance". |
| Responsive | Mobile-first. Register is two columns from 860px. Entry amounts move under the title below 400px. | Verified with no horizontal overflow at 320, 768 and 1280px (light) and 390 and 1280px (dark). |
| Dark mode | Single token set, `color-scheme: light dark` | Native date picker and select menus now follow the theme. |
| Bug fix | `todayISO()` now uses the local date | It used UTC, so between 00:00 and 08:00 in the Philippines the Date field defaulted to the previous day. Reproduced and fixed. |
| Metadata | New favicon, meta description, `theme-color` | The favicon was the Vite logo and was never linked. |

## Design tokens (top of `src/styles.css`)

- **Colour:** `--bg --card --ink --mut --line --field-line --pri --red --grn --amb` (+ `-bg` / `-soft` variants). Dark values are in the single `prefers-color-scheme: dark` block.
- **Type:** `--fs-xs` (13px, the smallest text used) to `--fs-xl`. Money uses tabular numerals so figures line up.
- **Space and shape:** `--sp-1…6`, `--radius-sm/md/lg`, `--tap` (44px minimum touch target).

To change the look of the app, edit the tokens first; components read from them.

## Accessibility checklist

- [x] Keyboard: skip link is the first Tab stop; every control is reachable; one consistent 3px focus ring.
- [x] Landmarks and headings: one `h1`, `h2` per card, `h3` per month group.
- [x] Names and states: tabs (`aria-current`), toggle (`aria-pressed`), Settings (`aria-expanded`), form errors (`aria-invalid` + `aria-describedby`), save confirmation (`role="status"`).
- [x] Not colour-only: tip labels, check mark on selected type, "+"/"−" on amounts, striped expense bars.
- [x] Contrast: text 4.5:1 or better, control borders 3:1 or better, in light and dark.
- [x] Touch targets: every button, input and select is at least 44px tall.
- [x] Motion: transitions are short and are removed under `prefers-reduced-motion`.

## How it was tested

Run in headless Chromium 141 against the dev server.

- **Regression (30 checks):** add sale, add expense, invalid amount, categories per type, all Insights sections, CSV export contents, delete, Settings persistence, currency symbol, reload persistence, Reset (cancel and confirm), empty states, no console errors. Passed 30/30 on the original code and on the redesign.
- **Date default:** 02:00 Asia/Manila defaults to the same day. Failed on the original, passes now.
- **axe-core (WCAG 2.0/2.1 A and AA + best practices), 3 views × light/dark:** original 12 violations (missing `main` landmark, content outside landmarks); redesign 0.
- **Keyboard and form behaviour (15 checks):** skip link, ARIA states, validation focus handling, 44px targets, unique delete labels.
- **Layout:** no horizontal overflow at 320, 390, 768 and 1280px in light, and 390 and 1280px in dark.
- `npm run build` succeeds (CSS 4.77 kB → about 10 kB raw / 2.9 kB gzip, the cost of the added tokens, states and responsive rules).

**Not tested:** Firefox and Safari, real devices, and manual screen-reader use (NVDA, VoiceOver). Please check those before the final submission.

## Known issues and suggestions (not changed, outside this scope or behaviour-affecting)

1. **Delete has no undo or confirmation.** One tap on "×" removes an entry. Consider an undo toast.
2. **Entry IDs use `Date.now()`** (`App.jsx`). Two entries in the same millisecond would collide. `crypto.randomUUID()` is a drop-in fix.
3. **Opening cash input** uses `parseFloat(value) || 0`, so clearing the field snaps to 0 and typing a leading "−" is lost.
4. **ESLint config exists but is not installed.** `eslint.config.js` imports packages that are not in `devDependencies`, and there is no `lint` script.
5. **README lists `netlify.toml`** in the project tree, but the file is not in the repository.
6. **History filtering/search** (by type, category or month) would be a natural next feature.
