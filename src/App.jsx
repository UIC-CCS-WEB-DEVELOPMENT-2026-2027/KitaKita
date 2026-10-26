/*
 * =============================================================================
 * FILE OVERVIEW: App.jsx
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * App.jsx is the root of the "Kita Kita" cash-register app. It exports one
 * component, <App />, and defines a second, internal one, <Tracker />.
 *   - <App />     checks whether a user is logged in (via the useAuth hook).
 *                 Logged out -> renders <Auth /> (login / sign-up screen).
 *                 Logged in  -> renders <Tracker /> (the real app).
 *   - <Tracker /> is the signed-in app. It OWNS all the data (transactions,
 *                 opening cash, currency symbol, budget plan), loads it from
 *                 localStorage, saves it back whenever it changes, and passes
 *                 slices of it plus handler functions down to the tab
 *                 components (Register, Dashboard, History, Budget, Settings).
 *                 This pattern is called "lifting state up".
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   main.jsx (not shown) renders <App />
 *     App
 *      |-- Auth (when logged out)
 *      '-- Tracker (when logged in)  <-- holds the single source of truth
 *            |-- Settings   (props: open, cur, onChange)
 *            |-- Register   (props: tx, stats, cur, onAdd, onDelete)
 *            |-- Dashboard  (props: stats, cur, hasData)   [tab id "dash", labelled "Insights"]
 *            |-- History    (props: tx, cur, onDelete, onClear, onLoadSample, sampleLoaded, canLoadSample)
 *            '-- Budget     (props: budget, onChange, cur)
 *   Helper modules: utils/finance.js (math), utils/auth.js (DEMO_ID),
 *   hooks/useAuth.js (login state), data/mockData.json (sample data).
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState):
 *   - data         : { tx, open, cur, budget }. The main app data. Its initial
 *                    value is computed lazily by load().
 *   - tab          : which tab is visible ('reg' | 'dash' | 'hist' | 'budget').
 *   - showSettings : boolean, whether the Settings panel is open.
 * EFFECT (useEffect):
 *   - Writes `data` to localStorage every time `data` or `storageKey` changes.
 * DERIVED VALUES (not stored in state):
 *   - stats (computeStats), isDemo, sampleLoaded, storageKey. They are
 *     recalculated on every render, so they can never disagree with `data`.
 * PROPS RECEIVED:
 *   - Tracker receives `user` (the logged-in user object) and `onLogout` (a function).
 * PROPS PASSED DOWN:
 *   - Data props (tx, stats, cur, open, budget, hasData, sampleLoaded, canLoadSample)
 *     and callback props (onAdd, onDelete, onChange, onClear, onLoadSample) so
 *     children can request changes without owning the state.
 * ARRAY METHODS:
 *   - .map()    : build the tab buttons from TABS; copy mock transactions;
 *                 build a Set of existing ids.
 *   - .filter() : remove one transaction (deleteTx); find sample entries not yet saved (loadSample).
 *   - .every()  : check that ALL sample entries already exist (sampleLoaded).
 *   - .some()   : check that at least one saved entry has a given id (inside .every()).
 * IMMUTABLE UPDATES:
 *   - Spread syntax ({ ...d }, [...d.tx]) builds NEW objects and arrays so React
 *     detects the change. State is never mutated directly.
 * CONDITIONAL RENDERING:
 *   - `cond && <Component />` and the ternary `user ? ... : ...`.
 * `key` PROP:
 *   - key={id} on mapped buttons (list identity) and key={user.id} on <Tracker />
 *     (forces a full reset when a different user logs in).
 * =============================================================================
 */

// =============================================================================
// App.jsx: the app shell.
//
// Two components live here:
//   - App      decides between the login screen (<Auth />) and the signed-in app.
//   - Tracker  the signed-in app. It owns ALL the data (transactions, opening cash,
//              currency, budget), saves it to localStorage, and passes slices of it
//              down to the tab components as props ("lifting state up").
//
// Mock data flow (this sprint):
//   src/data/mockData.json  ->  imported here  ->  seeded into the "Dummy" account
//   on first open, and also available through the "Load sample data" button.
// =============================================================================

// Import the useEffect (run side effects after render) and useState (hold changing data) hooks from React.
import { useEffect, useState } from 'react'
// Import the Auth component (login/sign-up screen), shown when nobody is logged in.
import Auth from './components/Auth.jsx'
// Import the Register component (the tab where new entries are added), rendered when tab === 'reg'.
import Register from './components/Register.jsx'
// Import the Dashboard component (the "Insights" tab), rendered when tab === 'dash'.
import Dashboard from './components/Dashboard.jsx'
// Import the History component (list of all entries plus clear/sample buttons), rendered when tab === 'hist'.
import History from './components/History.jsx'
// Import the Budget component (weekly budget planner), rendered when tab === 'budget'.
import Budget from './components/Budget.jsx'
// Import the Settings component (opening cash and currency panel), rendered when showSettings is true.
import Settings from './components/Settings.jsx'
// Import the mock data JSON file as a JavaScript object (Vite allows importing JSON directly).
import mockData from './data/mockData.json' // the local mockup data file (Vite imports JSON directly)
// Start a named import of helper items from the finance utilities file.
import {
  // Import computeStats: a function that turns the transaction list + opening cash into totals, monthly figures and runway.
  computeStats,
  // Import cumulativeTotalCents: a function that sums existing entries of one type, in cents.
  cumulativeTotalCents,
  // Import MAX_CUMULATIVE_TOTAL_CENTS: the maximum allowed running total, in cents.
  MAX_CUMULATIVE_TOTAL_CENTS,
// Close the import list and name the file the helpers come from.
} from './utils/finance.js'
// Import the LogOutIcon component, an icon drawn inside the Log out button.
import { LogOutIcon } from './components/Icons.jsx'
// Import the custom useAuth hook, which supplies the current user and a logout function.
import { useAuth } from './hooks/useAuth.js'
// Import DEMO_ID, the id of the seeded "Dummy" account, used to decide who may see sample data.
import { DEMO_ID } from './utils/auth.js' // id of the seeded "Dummy" account

// Base key for localStorage. The signed-in user's id is appended below, so every
// account has its own separate saved data.
// Declare the constant base storage key; Tracker appends ":" + user.id to it so each account is stored separately.
const KEY = 'kitakita:v1'

// Brand-new accounts start completely empty: no entries, ₱0.00 opening cash.
// It is a function (not a constant) so every call returns a fresh object that
// can be changed without affecting the next one.
// Define emptyState as an arrow function returning a fresh blank data object: no transactions, 0 opening cash, ₱ currency, and an empty weekly budget.
const emptyState = () => ({ tx: [], open: 0, cur: '₱', budget: { weeks: {} } })

// The demo account starts with the sample entries and opening cash from mockData.json.
// Each entry is copied ({ ...t }) so the imported JSON module is never modified.
// Define demoState as an arrow function that returns an object (the opening parenthesis wraps the object literal).
const demoState = () => ({
  // Start from the blank state so the demo has every field (cur, budget, etc.) and then override some below.
  ...emptyState(),
  // .map() loops over the mock transactions and returns a NEW array of shallow copies ({ ...t }), so the imported JSON is never mutated.
  tx: mockData.transactions.map((t) => ({ ...t })),
  // Use the sample opening cash balance from the mock data file.
  open: mockData.openingCash,
// Close the object literal and the wrapping parenthesis of the arrow function.
})

// Read this account's saved data from the browser.
// Saved data wins. Only when nothing is saved yet does the demo account get its sample data,
// so edits, deletions and "Clear all data" are never undone by a refresh or a redeploy.
// The try/catch covers blocked storage (private mode) and corrupted JSON; in both cases
// we simply fall back to a starting state instead of crashing.
// Declare load(key, userId): it returns the initial state object for useState; it is a plain function, not a hook.
function load(key, userId) {
  // Begin a try block because reading storage or parsing JSON can throw an error.
  try {
    // Read the saved text from localStorage and convert it from a JSON string back into an object (null if nothing is saved).
    const saved = JSON.parse(localStorage.getItem(key))
    // Only trust the saved value if it exists and its `tx` field is really an array (guards against corrupted data).
    if (saved && Array.isArray(saved.tx)) {
      // Spread order matters: defaults first, then saved values on top. This also fills in
      // fields that older saves did not have yet (such as `budget`).
      // Return defaults overlaid with saved values, and make sure `budget` is a valid object (otherwise reset it to an empty weekly plan).
      return { ...emptyState(), ...saved, budget: saved.budget && typeof saved.budget === 'object' ? saved.budget : { weeks: {} } }
    // Close the if block.
    }
  // Catch any error (blocked storage or bad JSON) and ignore it, so the code falls through to the fallback below.
  } catch {}
  // Fallback: the demo account gets sample data, everyone else gets a blank account.
  return userId === DEMO_ID ? demoState() : emptyState()
// Close the load function.
}

// Tabs as [id, label] pairs, rendered with .map() in the nav below.
// Declare the TABS array of [id, label] pairs; the id is stored in the `tab` state and the label is the button text.
const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History'], ['budget', 'Budget']]

// Sample entries come from src/data/mockData.json (ids 9001+ never clash with Date.now() ids).
// Keep a module-level reference to the sample transaction array; used to detect and load missing sample entries.
const SAMPLE_TX = mockData.transactions

// The signed-in app. Each account gets its own saved data (key includes the user id).
// Declare the Tracker component; it receives two props via destructuring: `user` (the logged-in user object) and `onLogout` (a function from useAuth).
function Tracker({ user, onLogout }) {
  // Build this account's unique localStorage key by joining the base key and the user's id.
  const storageKey = `${KEY}:${user.id}`

  // Lazy initial state: passing a function means load() runs only once, on the first render,
  // not on every re-render.
  // useState holds ALL app data in `data`; setData replaces it; the function passed in runs load() only on the first render.
  const [data, setData] = useState(() => load(storageKey, user.id))
  // State for the active tab; starts on 'reg' (Register). Changing it re-renders and shows another tab.
  const [tab, setTab] = useState('reg')            // which tab is showing
  // Boolean state controlling whether the Settings panel is visible; starts closed.
  const [showSettings, setShowSettings] = useState(false) // is the settings panel open

  // Save to localStorage whenever the data changes. This is what makes entries survive a
  // refresh. It is browser storage, so it is per browser and per site address (it works the
  // same on localhost and on Vercel, but the two places do not share it).
  // useEffect runs this side effect after a render when `data` or `storageKey` has changed (see the dependency array below).
  useEffect(() => {
    // Convert `data` to a JSON string and store it under this user's key; the try/catch ignores errors such as blocked storage.
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}
  // Dependency array: re-run the effect only when `data` or `storageKey` changes.
  }, [data, storageKey])

  // Destructure the four fields out of state: tx (array of entries), open (opening cash), cur (currency symbol); the budget is read later as data.budget.
  const { tx, open, cur } = data
  // Totals, monthly figures and runway are derived from the data on every render
  // instead of being stored, so they can never disagree with the entries.
  // Compute derived statistics from the current entries and opening cash on every render; this is derived data, not state.
  const stats = computeStats(tx, open)

  // Only the seeded Dummy account may use sample data. Checked by account id (not by the
  // typed username), so renaming or look-alike usernames cannot unlock it.
  // Boolean: true only when the logged-in user's id equals the demo account's id.
  const isDemo = user.id === DEMO_ID

  // True once every sample entry is already in this account (the button then disables).
  // .every() + .some() = "for each sample entry, is there a saved entry with the same id?"
  // .every() checks all sample entries; for each one, .some() searches saved entries for the same id; the result is true only if none is missing.
  const sampleLoaded = SAMPLE_TX.every((s) => tx.some((t) => t.id === s.id))

  // Add one entry. Returns false (and saves nothing) if the amount is invalid or would push
  // the running total past the limit; Register.jsx uses that to show an error message.
  // Amounts are converted to whole cents first, because decimal maths like 0.1 + 0.2
  // is not exact in JavaScript.
  // Define addTx, passed to Register as the `onAdd` prop; `entry` is the new entry object coming from the Register form.
  const addTx = (entry) => {
    // Convert the typed amount to a number, multiply by 100 and round, giving whole cents (avoids floating-point errors).
    const amountCents = Math.round(Number(entry.amt) * 100)
    // Reject the entry (return false) if the cents value is not a safe integer (NaN, Infinity, too large) or is zero or negative.
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return false
    // Get the current running total, in cents, of existing entries of the same type (for example all income or all expenses).
    const currentCents = cumulativeTotalCents(data.tx, entry.type)
    // Reject the entry (return false) if adding it would push that running total over the allowed maximum.
    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) return false
    // The functional form setData((d) => ...) always works from the latest data,
    // which avoids stale-state bugs when several updates happen close together.
    // Update state with the functional form: `d` is the latest data, and the function returns the new data object.
    setData((d) => ({
      // Copy all existing fields (open, cur, budget) so they are preserved.
      ...d,
      // Replace tx with a NEW array: the old entries, plus the new entry with the cleaned amount (back in pesos) and a unique id from the current timestamp.
      tx: [...d.tx, { ...entry, amt: amountCents / 100, id: Date.now() }],
    // Close the returned object and the setData call.
    }))
    // Tell the caller (Register) that the entry was saved successfully.
    return true
  // Close the addTx function.
  }
  // Never mutate state directly: each update below builds a NEW object/array so React notices the change.
  // deleteTx (passed as `onDelete`): .filter() builds a NEW array keeping every entry whose id is NOT the one being deleted, so that entry disappears.
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  // updateSettings (passed to Settings as `onChange`): merges a partial object (for example { cur: '$' }) over the existing data.
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  // updateBudget (passed to Budget as `onChange`): replaces only the `budget` field with the new budget object.
  const updateBudget = (budget) => setData((d) => ({ ...d, budget }))
  // "Clear all data" resets entries and opening cash but deliberately keeps the budget plan.
  // clearAll (passed to History as `onClear`): resets to a blank state but copies the existing budget back in so the plan survives.
  const clearAll = () => setData((d) => ({ ...emptyState(), budget: d.budget }))

  // Adds only the sample entries that are not there yet, so clicking twice never duplicates.
  // Opening cash is filled in only when it is still 0, so a balance you set yourself is kept.
  // Define loadSample (passed to History as `onLoadSample`).
  const loadSample = () => {
    // Guard clause: non-demo users exit immediately, even if the button were somehow triggered.
    if (!isDemo) return // second line of defence: the button is hidden for everyone else too
    // Update state using the latest data `d`.
    setData((d) => {
      // .map() turns the saved entries into a list of their ids, and new Set() makes it fast to check whether an id already exists.
      const have = new Set(d.tx.map((t) => t.id)) // ids already saved, for fast lookup
      // .filter() keeps only the sample entries whose id is NOT already saved, so nothing is duplicated.
      const fresh = SAMPLE_TX.filter((s) => !have.has(s.id))
      // Return the new state object.
      return {
        // Keep all existing fields.
        ...d,
        // New tx array: existing entries first, then the missing sample entries.
        tx: [...d.tx, ...fresh],
        // Use the sample opening cash only if the current one is exactly 0; otherwise keep the user's own value.
        open: d.open === 0 ? mockData.openingCash : d.open,
      // Close the returned object.
      }
    // Close the setData callback and the call.
    })
  // Close the loadSample function.
  }

  // Start the JSX that Tracker renders.
  return (
    // Outer wrapper div; the CSS class "wrap" controls the page layout.
    <div className="wrap">
      {/* Accessibility: lets keyboard users jump straight past the header. */}
      {/* Skip link: pressing Tab on page load focuses this link, and activating it jumps to the element with id "main". */}
      <a className="skip-link" href="#main">Skip to main content</a>
      {/* Semantic <header> element wrapping the title and the action buttons. */}
      <header className="app-header">
        {/* Container div for the brand title and tagline. */}
        <div>
          {/* Main page heading, with the two words styled separately through CSS classes k1 and k2. */}
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          {/* Tagline paragraph under the title. */}
          <p className="tag">cash register for startups</p>
        {/* Close the title container div. */}
        </div>
        {/* Container div for the user name and the buttons on the right of the header. */}
        <div className="header-actions">
          {/* Show the logged-in user's name (a `user` prop value); hovering shows their email through the title attribute. */}
          <span className="user-name" title={user.email}>{user.name}</span>
          {/* Settings button: aria-expanded tells screen readers whether the panel is open, aria-controls links it to the panel id, and onClick toggles showSettings (s => !s flips true/false). */}
          <button type="button" className="btn" aria-expanded={showSettings} aria-controls="settings-panel" onClick={() => setShowSettings((s) => !s)}>
            {/* Decorative gear icon (aria-hidden hides it from screen readers) followed by the word "Settings". */}
            <span aria-hidden="true">⚙</span> Settings
          {/* Close the Settings button. */}
          </button>
          {/* Log out button: onClick calls the onLogout function that was passed down from App as a prop. */}
          <button type="button" className="btn" onClick={onLogout}><LogOutIcon /> Log out</button>
        {/* Close the header actions div. */}
        </div>
      {/* Close the header element. */}
      </header>
      {/* Conditional rendering: when showSettings is true, render Settings and pass it the opening cash (open), currency symbol (cur), and the onChange callback (updateSettings) so it can edit the data owned by Tracker. */}
      {showSettings && <Settings open={open} cur={cur} onChange={updateSettings} />}
      {/* Tab buttons are generated from the TABS array with .map(). aria-current marks the active one. */}
      {/* Navigation element for the tab buttons; aria-label names this navigation region for screen readers. */}
      <nav className="tabs" aria-label="Sections">
        {/* .map() loops over TABS; the ([id, label]) destructures each pair; it returns one button per tab. */}
        {TABS.map(([id, label]) => (
          // Each button needs a unique `key` (the tab id) so React can track list items; aria-current marks the active tab; onClick sets the tab state to this button's id, causing a re-render that shows that tab.
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
        // Close the .map() call and the JSX expression.
        ))}
      {/* Close the nav element. */}
      </nav>
      {/* Conditional rendering: only the selected tab is mounted. Data lives here in Tracker,
          so switching tabs never loses anything. */}
      {/* Main content region; id="main" is the target of the skip link at the top. */}
      <main id="main">
        {/* Show Register only when tab is 'reg'. Props: tx (entries to display), stats (totals), cur (currency symbol), onAdd (addTx, to create entries), onDelete (deleteTx, to remove entries). */}
        {tab === 'reg' && <Register tx={tx} stats={stats} cur={cur} onAdd={addTx} onDelete={deleteTx} />}
        {/* Show Dashboard only when tab is 'dash'. Props: stats (figures to display), cur (currency symbol), hasData (true if tx has at least one entry, so it can show an empty message instead). */}
        {tab === 'dash' && <Dashboard stats={stats} cur={cur} hasData={tx.length > 0} />}
        {/* Show History only when tab is 'hist'; the opening parenthesis lets the multi-line JSX follow. */}
        {tab === 'hist' && (
          // Start the History element.
          <History
            /* tx: the full entries array, so History can list them. */
            tx={tx}
            /* cur: the currency symbol used when displaying amounts. */
            cur={cur}
            /* onDelete: deleteTx, so each History row can request its own removal by id. */
            onDelete={deleteTx}
            /* onClear: clearAll, called by the "Clear all data" action. */
            onClear={clearAll}
            /* onLoadSample: loadSample, called by the "Load sample data" button. */
            onLoadSample={loadSample}
            /* sampleLoaded: true when all sample entries already exist, so the button can be disabled. */
            sampleLoaded={sampleLoaded}
            /* canLoadSample: true only for the demo account, so other users never see the sample button. */
            canLoadSample={isDemo}
          /* Self-close the History element. */
          />
        // Close the conditional expression's parenthesis and the JSX expression.
        )}
        {/* Show Budget only when tab is 'budget'. Props: budget (the plan, with a fallback empty plan in case it is missing), onChange (updateBudget, to save edits), cur (currency symbol). */}
        {tab === 'budget' && <Budget budget={data.budget || { weeks: {} }} onChange={updateBudget} cur={cur} />}
      {/* Close the main element. */}
      </main>
      {/* Footer with a disclaimer paragraph: guidance is not financial advice and data lives in this browser. */}
      <footer><p className="note">Guidance is based only on the numbers you enter and is a starting point, not financial or tax advice. Data is saved in this browser.</p></footer>
    {/* Close the outer wrapper div. */}
    </div>
  // Close the parenthesis that opened after `return`.
  )
// Close the Tracker function.
}

// Top level: signed in -> the app, signed out -> the login/sign-up screen.
// `key={user.id}` makes React rebuild Tracker from scratch when a different user logs in,
// so one account's data can never briefly show up in another account's session.
// Export the App component as the file's default export; it is the root component rendered by main.jsx.
export default function App() {
  // Call the useAuth hook and destructure `user` (null when logged out) and `logout` (a function that signs the user out).
  const { user, logout } = useAuth()
  // Ternary: if `user` exists render Tracker, passing the user object, the logout function as the `onLogout` prop, and a key so a user switch remounts it; otherwise render the Auth screen.
  return user ? <Tracker key={user.id} user={user} onLogout={logout} /> : <Auth />
// Close the App function.
}