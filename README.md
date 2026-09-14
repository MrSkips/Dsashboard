# WIT Dashboard

A personal, local-first workspace for classes, assignments, tasks, calendar events,
co-op applications, budgeting, grades, habits, and focus sessions.

## Run and verify

The application is plain HTML, CSS, and JavaScript. There is no application build,
backend, runtime package dependency, or required environment secret. Serve this
folder with any static HTTP server, or use the existing GitHub Pages deployment.
Keep `index.html`, `dashboard-ui.js`, `app.js`, `styles.css`, `sw.js`, `manifest.json`,
and the icon files together. HTTPS is required for encrypted sync and installable
offline support.

Development checks (Node 24 recommended):

```sh
npm ci
npm run check
npm test
```

The development-only `jsdom` dependency runs complete-app DOM tests. The regression
suite also tests dates, paydays, timers, restoration validation, recurrence, links,
and service-worker scope. `tests/responsive.html` renders the real application at
390 px and 768 px for visual review; it uses the same browser-local data as the app.
There is no TypeScript or separate linter configuration.

## Daily use

- Quick add understands tasks, expenses (`$12 lunch`), deadlines (`essay due Friday
  !high`), and timed calendar events. The Add button also works on touch screens.
- `/` searches dashboard content; Ctrl/Command + K opens commands. `?` shows help.
- The daily planner includes classes, events, overdue assignments, and actionable
  tasks. Completed tasks can be hidden without deleting them.
- Change a co-op status with its select control or by dragging. Dashboard cards can
  move between columns; use Alt + an arrow key on the reorder handle for keyboard
  control. Reordering is disabled on touch screens so it cannot interfere with scrolling.
- Budget opens with transactions. The optional monthly planning simulator expands
  separately. Weekly income records the latest scheduled payday, once per source;
  it does not reconstruct all missed weeks.
- Calendar export includes imported classes, manual classes, deadlines, and in-app
  events, with in-app recurrence rules and skipped dates.

## Data and recovery

Existing `wit_*` browser-storage keys and the JSON backup format are preserved.
Fresh installs have no invented classes, assignments, balances, or applications.
Existing saved content is never cleared by the redesign.

Export backup downloads your current dashboard without the GitHub token. Import
validates every recognized section before changing storage, asks before replacing
sections, and saves the previous state under `wit_before_restore`. Export recovery
copy downloads that previous state. If none exists, it downloads raw dashboard
storage for manual recovery. Malformed saved sections are copied to their
`*_recovery` key before a fallback is used. Keep downloaded backups somewhere safe:
normal backups and browser-local data are plaintext, even when cloud sync is used.

Optional sync retains the existing encrypted GitHub Gist flow (AES-GCM with a
passphrase-derived key). Sync is user-initiated; the dashboard stays usable without
unlocking it. Loading a differing cloud copy asks before replacing local sections.
Budget shows whether it is currently local-only or cloud-synced and provides a
direct Sync now/Unlock sync control. The weekly view can reset on any chosen
weekday (for example, payday). Transactions, weekly and monthly limits,
recurring income and bills, the income ledger, and the planning simulator are all
included in the encrypted sync payload. Unlock sync in each browser session before
editing if you want those changes available on another computer.
Unchecking Remember token removes any previously saved token on successful unlock.
Do not use simultaneous editing on multiple devices: automatic conflict merging is
not implemented. Remembered tokens are stored in this browser, not in the repo.

The service worker only caches this app's public shell. It does not intercept
weather, favicon, authenticated GitHub, or other external API requests, and only
removes older caches belonging to this dashboard. After upgrading an older cached
version, a second reload may be needed to activate the updated worker.

## Boundaries

- Basic ICS import supports one-off, daily, and weekly classes, BYDAY, and UNTIL.
  Full TZID interpretation, recurrence exceptions, COUNT/INTERVAL rules in imported
  files, and recurring-event edits from other calendar products are not supported.
  Check imported times and dates against the source calendar. Manual classes remain
  daily entries; use calendar events or imported schedules for specific weekdays.
- GPA uses Wentworth's published undergraduate numerical ranges and grade weights.
  It remains a planning estimate rather than an official transcript calculation.
- The focus timer handles background throttling and resumes an active session after
  a reload. Notifications require browser permission and an open page; this is not
  a background push-notification service.
- Weather, favicon services, and live encrypted sync require a network connection.
  Credentials are intentionally not provided by the repository or tests.

## Structure

- `index.html`: semantic markup and existing inline event bindings.
- `styles.css`: shared design tokens, component styles, and phone/tablet layouts.
- `dashboard-ui.js`: reusable editor, confirmation dialog, and compact tool-menu behavior.
- `app.js`: persistence, rendering, and domain logic.
- `sw.js`: narrowly scoped offline shell cache.
- `tests/`: deterministic regression and complete-app DOM coverage.
