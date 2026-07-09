# Goal: Training Tracker PWA (course à pied + renforcement musculaire)

## User Request

> Je souhaite créer une application web moderne destinée à être hébergée
> gratuitement sur GitHub Pages. Créer une PWA installable sur
> mobile/desktop pour tracker mon plan d'entraînement course à pied +
> renforcement musculaire, avec suivi des séances, performances, douleur
> TFL, objectifs, historique, dashboard et sauvegarde optionnelle vers
> GitHub.
>
> Contexte utilisateur : je cours 3 fois par semaine et je fais 2 séances
> de renforcement jambes + core. Je reprends/progresse avec un historique
> de TFL, donc l'application doit permettre de suivre la douleur TFL et
> éviter les augmentations de volume trop agressives.
>
> "fais simple pas une usine à gaz"

No Jira ticket. Full verbatim spec (20 sections, provided by the user)
is preserved below in "Detailed Specification" — this is the
authoritative source of truth for the Builder and Inspector.

## Refined Goal

Build a complete, working, installable Progressive Web App called
**"Training Tracker"** using React + TypeScript + Vite + TailwindCSS,
with **no backend**, storing all data locally (IndexedDB preferred,
localStorage fallback), deployable as a static site to GitHub Pages
under repo `training-tracker`. The app tracks running and strength
workouts (with TFL pain monitoring), a preconfigured weekly plan, a
dashboard with charts (Recharts), user goals, JSON-configurable
exercise/session data, JSON export/import, and an optional manual
GitHub REST API backup (token used only in-memory, never persisted).
Keep the implementation simple and pragmatic — avoid over-engineering.

## Acceptance Criteria

- [ ] `npm install && npm run dev` starts the app locally without errors.
- [ ] `npm run build` produces a working production build (static,
      relative/base-path-aware assets) and `npm run preview` serves it
      correctly.
- [ ] App is a valid installable PWA: manifest.json with name
      "Training Tracker", theme dark by default, icons present, service
      worker registered (vite-plugin-pwa recommended), works offline
      after first load, auto-update prompt/logic when a new version is
      deployed.
- [ ] Weekly plan preloaded exactly as specified (Lun: Renforcement A,
      Mar: Footing EF, Mer: Repos, Jeu: Séance qualité, Ven: Renforcement
      B, Sam: Repos, Dim: Sortie longue), visible in a Planning page,
      each day clickable to open/log the session.
- [ ] Exercises/sessions/weekly plan are defined as JSON data files under
      `/src/data`, matching the structure the user provided (id, title,
      type, description, exercises[] with sets/reps/unit/trackWeight/
      trackDuration/side). Adding/editing an exercise or session requires
      only editing JSON, not app code.
- [ ] Initial strength data present: Renforcement A (Squats 3x12, Fentes
      3x10/jambe, Hip Thrust 3x12, Planche 3x30s, Planche latérale G/D
      3x30s) and Renforcement B (Step Up 3x10/jambe, Soulevé de terre
      jambes tendues 3x12, Pont fessier une jambe 3x15, Clamshell
      3x15/côté, Bird Dog 3x15).
- [ ] Initial running session types present: Footing EF, Séance qualité
      (with the example structure: 15min échauffement, 6x2min rapide/2min
      récup, 10min retour au calme), Sortie longue — each with its
      described purpose and recommended tracked fields.
- [ ] Session tracking works: date, status (planned/done/skipped),
      ressenti 1-10, fatigue 1-10, douleur TFL 0-10, notes, durée totale;
      user can mark a session done, edit a completed session, delete an
      entry, and view history.
- [ ] Strength performance tracking per exercise: planned/actual sets,
      planned/actual reps, charge (kg, may be 0/empty for bodyweight),
      duration (for timed exercises), comment, pain; full history kept
      per exercise and viewable (e.g., list of dated entries).
- [ ] Running performance tracking: distance (km), duration (hh:mm:ss or
      mm:ss input), auto-calculated average pace, FC moyenne/max,
      température, RPE 1-10, douleur TFL 0-10, comment, terrain type
      (optional), météo (optional); history view with date/type/distance/
      duration/pace/FC/pain/ressenti.
- [ ] Dashboard page shows at minimum: planned/done sessions this week,
      adherence %, weekly & monthly running volume, strength sessions
      done this week/month, TFL pain trend, average pace trend, average
      HR trend, last completed session, next planned session — using
      Recharts for the listed charts (weekly volume, TFL pain over time,
      avg pace over time, avg HR over time, weekly adherence). Must
      remain readable on mobile.
- [ ] Goals page: 10k goal, half-marathon goal, FC max, EF zone
      low/high, optional weight, weekly volume goal, weekly session
      count goal — with simple progress display.
- [ ] Progression suggestion system (advisory only, never auto-applied):
      strength — after 3 consecutive validated sessions with ressenti<=7,
      douleur TFL<=2, all sets completed, suggest +2.5kg or +1 rep or +1
      set with an explanatory message; running — after 3 EF footings with
      douleur TFL<=2, ressenti<=7, stable avg HR, suggest +5min on long
      run or maintain if fatigue high; hard rule: never suggest >10%
      weekly running volume increase; if douleur TFL>=4, suggest
      reducing/stabilizing load.
- [ ] Settings page: full JSON export (versioned, with
      version/exportedAt/settings/sessions/performances/goals shape),
      JSON import (validates JSON + version, clear error on invalid file,
      confirmation before overwriting local data), reset data button,
      last local backup timestamp shown.
- [ ] Optional GitHub backup (Settings > Backup GitHub): save/restore/
      test-connection buttons; token requested via a password-type modal
      field at the moment of the action only; token held only in a
      runtime variable for the duration of the API call(s) and cleared
      immediately after (never written to localStorage/IndexedDB/code/
      settings); persists owner/repo/branch/path locally but never the
      token; uses GitHub Contents API (GET for existing file+sha, PUT to
      create/update, Base64-encoded body, commit message
      "Update training backup YYYY-MM-DD HH:mm"); handles missing file
      (create), existing file (update with sha), invalid token,
      insufficient permissions, repo not found, conflict, no network,
      invalid remote JSON — each with a clear error message; displays the
      fine-grained-token security warning text; app works fully without
      ever using this feature.
- [ ] Architecture matches the requested layout under `/src`:
      components, pages, hooks, data, types, services, utils, styles;
      services: storageService, backupService, githubBackupService,
      trainingService, progressService, dateService, paceService; types:
      Exercise, Workout, WorkoutType, WorkoutSession, StrengthPerformance,
      RunningPerformance, WeeklyPlan, UserSettings, UserGoal, BackupData,
      GithubBackupConfig, ProgressSuggestion — strictly typed, `any`
      avoided where reasonably possible.
- [ ] Pages implemented: Dashboard, Planning, Séance du jour (Aujourd'hui),
      Historique (filterable by type/date, with session detail),
      Exercices (per-exercise history, last load used, suggested
      progression), Objectifs, Settings — with bottom mobile navigation
      (Dashboard, Planning, Aujourd'hui, Historique, Settings).
- [ ] Utility functions implemented: pace from distance+duration, duration
      <-> seconds conversions (hh:mm:ss), weekly volume, adherence rate,
      per-exercise progression, overload week detection (>10% volume
      increase week-over-week warning), average TFL pain, TFL pain trend
      detection.
- [ ] Local persistence (IndexedDB preferred, localStorage fallback)
      survives refresh, browser close, and offline use; includes a data
      schema version and basic migration/fallback handling for
      missing/corrupt data.
- [ ] UI: dark theme by default, responsive mobile-first, large tap
      targets, minimal required fields, partial-session save allowed,
      immediate save feedback, low visual clutter, no auth required.
- [ ] README documents: project description, stack, install, dev, build,
      preview, GitHub Pages deployment (base path config, e.g.
      `base: "/training-tracker/"`, and how to change it for a different
      repo name), PWA config notes, local storage behavior, export/import
      behavior, GitHub backup behavior + explicit token security warning,
      example backup JSON, project structure.
- [ ] Vite configured for GitHub Pages deployment under repo name
      `training-tracker` (`base: "/training-tracker/"`); a GitHub Actions
      workflow for building & deploying to GitHub Pages is included.
- [ ] `npm run build` and `npm run lint` both pass with no errors (this is
      the project's quality gate — see below). No blocking TODOs or
      pseudo-code in the delivered app.

## Scope Boundaries

**In scope:**
- Everything described in the 20-section detailed specification below.
- A standard Vite React-TS + ESLint scaffold, TailwindCSS, vite-plugin-pwa,
  Recharts.
- A GitHub Actions workflow for GitHub Pages deployment.

**Out of scope:**
- Any real backend/server, authentication/login system, or database
  other than browser-local storage.
- Automated unit/e2e test suites (explicitly requested to keep this
  simple — user confirmed "no automated tests, just build + lint must
  pass").
- Persisting the GitHub token anywhere (must actively be avoided).
- Actually creating/configuring the repository's GitHub Pages hosting
  settings or GitHub Actions secrets on github.com itself (only the
  workflow file and documentation are in scope; the user will enable
  Pages in repo settings themselves).
- Native mobile app packaging (this is a web PWA only).

## Applicable Project Conventions

**Quality gate command:**
- `npm run build && npm run lint` (project is a fresh scaffold; Builder
  must add a `lint` script, e.g. via ESLint, as part of standard Vite
  React-TS setup).

**Commit convention:**
- No pre-existing convention found in the repo (only a placeholder
  README existed). Use conventional commits (default) per the goal
  skill's rules: `type(scope): [B]/[I] description`.
- Assisted-by trailer required: `Assisted-by: Claude:Sonnet-4.6` (Builder)
  / `Assisted-by: Claude:Haiku-4.5` (Inspector).

**Guidelines:**
- None found (`AGENTS.md`, `CONSTITUTION.md`, `.agents/guidelines/` do
  not exist in this repo prior to this goal run).

**Rules:**
- Repo name is `training-tracker` (GitHub: QuentinDarroux/training-tracker)
  → Vite `base` must be `/training-tracker/`.
- User explicitly asked to keep the implementation **simple, not an
  over-engineered "usine à gaz"** — prefer straightforward, readable
  code over excessive abstraction, config layers, or premature
  optimization.

---

## Detailed Specification (verbatim, sections 1-20, provided by user)

### 1. PWA
- Installable on Android / iOS / desktop, clean manifest, placeholder
  icons if needed, service worker, offline support, asset caching,
  automatic update when a new version is available, app name
  "Training Tracker", dark theme by default. Use `vite-plugin-pwa` if
  possible. Should feel like a real mobile app: no address bar once
  installed, one-handed navigation, fast loading, frictionless use
  right after a workout.

### 2. JSON-configurable sessions and exercises
- All exercises, sessions, and weekly plans configurable via JSON files
  under `/src/data`. Example shape:
```json
{
  "id": "renfo_a",
  "title": "Renforcement A",
  "type": "strength",
  "description": "Jambes + core + prévention TFL",
  "exercises": [
    {
      "id": "squat",
      "name": "Squats",
      "sets": 3,
      "reps": 12,
      "unit": "reps",
      "trackWeight": true,
      "trackDuration": false,
      "side": "both"
    }
  ]
}
```
- Adding an exercise = editing JSON only; editing a session doesn't
  touch app code; distinguishes running/strength/rest sessions;
  supports rep-based or time-based exercises.

### 3. Initial weekly plan
- Lundi: Renforcement A / Mardi: Footing EF / Mercredi: Repos /
  Jeudi: Séance qualité / Vendredi: Renforcement B / Samedi: Repos /
  Dimanche: Sortie longue. Each day shown clearly on a Planning page;
  each session clickable to open detail and log performance.

### 4. Initial session data
- **Renforcement A** (jambes + core + prévention TFL): Squats 3x12,
  Fentes 3x10/jambe, Hip Thrust 3x12, Planche 3x30s, Planche latérale
  gauche 3x30s, Planche latérale droite 3x30s.
- **Renforcement B** (jambes + fessiers + stabilité hanche): Step Up
  3x10/jambe, Soulevé de terre jambes tendues 3x12, Pont fessier une
  jambe 3x15, Clamshell 3x15/côté, Bird Dog 3x15.
- **Course** — 3 session types:
  - *Footing EF*: endurance fondamentale, allure facile, FC contrôlée,
    discussion possible. Fields: distance, durée, allure moyenne, FC
    moyenne, FC max, température, ressenti, douleur TFL, notes.
  - *Séance qualité*: fractionné/tempo léger, amélioration allure 10km,
    charge contrôlée. Example: 15min échauffement, 6x(2min rapide/2min
    récup), 10min retour au calme.
  - *Sortie longue*: construire l'endurance, augmenter progressivement
    la durée, rester facile.

### 5. Session tracking
- date, status (planned/done/skipped), ressenti 1-10, fatigue 1-10,
  douleur TFL 0-10, notes libres, durée totale, réalisée ou non. User
  can: mark done, edit a completed session, delete an entry, view
  history.

### 6. Strength tracking
- Per exercise: planned/actual sets, planned/actual reps, charge (kg),
  duration (if timed), comment, pain. Keep full history per exercise
  (e.g. dated log of sets x reps @ weight). Bodyweight exercises: charge
  can be empty/0.

### 7. Running tracking
- distance (km), durée (hh:mm:ss or mm:ss), auto-calculated average
  pace, FC moyenne, FC max, température, RPE 1-10, douleur TFL 0-10,
  comment, terrain type (optional: plat/vallonné/trail/tapis), météo
  (optional). History view: date, type, distance, durée, allure, FC
  moyenne, FC max, douleur TFL, ressenti.

### 8. Dashboard
- Cards + charts (Recharts): sessions planned/done this week, adherence
  %, weekly & monthly running volume, strength sessions done this
  week/month, TFL pain trend, average pace trend, average HR trend,
  last completed session, next planned session. Charts: weekly running
  volume, TFL pain over time, average pace over time, average HR over
  time, weekly adherence. Must stay simple/readable on mobile.

### 9. Goals page
- 10k goal, half-marathon goal, FC max, EF zone low/high, optional
  weight, weekly volume goal, weekly session count goal. Example: FC
  max 195, EF zone 135-155bpm, 10k goal 50min, half goal 1h55. Show
  progress simply.

### 10. Automatic progression suggestions (advisory only, never auto-applied)
- **Strength**: if an exercise is validated 3 consecutive sessions with
  ressenti<=7, douleur TFL<=2, all sets completed → suggest +2.5kg (if
  weighted) or +1 rep/set or +1 set, with explanatory text like: "Tu as
  validé cet exercice 3 fois de suite sans douleur significative. Tu
  peux envisager +2.5 kg ou +1 rep."
- **Running**: if 3 EF footings done with douleur TFL<=2, ressenti<=7,
  stable avg HR → suggest +5min on long run, or maintain if fatigue
  high. Hard rule: never suggest >10% weekly running volume increase;
  if douleur TFL>=4, suggest reducing/stabilizing load. Suggestions
  must be consultative and explainable.

### 11. JSON export/import
- Settings page: full data export as JSON, JSON import, reset-data
  button, automatic local backup, last local backup date shown. Export
  format stable/versioned/documented, e.g.:
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-07-09T10:00:00.000Z",
  "settings": {},
  "sessions": [],
  "performances": [],
  "goals": {}
}
```
- Import must: validate JSON, check version, show clear error if
  invalid, confirm before overwriting local data.

### 12. Optional secure GitHub backup
- Static app on GitHub Pages can't do a real git push locally → must use
  GitHub REST API equivalent (create/update a JSON file in the repo).
- **Security — critical**: never store the GitHub token (not in
  localStorage, not in IndexedDB, not in code, not persisted in
  settings); ask for it only at the moment of push/restore; keep it
  only in an in-memory runtime variable during the API call; erase it
  immediately after use.
- Persisted locally: owner, repo, branch, backup file path (e.g.
  `data/training-backup.json`). NOT persisted: GitHub token.
- Settings > Backup GitHub page actions: "Sauvegarder vers GitHub",
  "Restaurer depuis GitHub", "Tester la connexion". Each opens a modal
  asking for the token (password field + confirm button), uses it only
  for that call, clears the variable immediately after, closes the
  modal, shows success/error.
- Implementation: GitHub REST API, `Authorization` header, GET repo
  contents endpoint to fetch existing file + sha if present, Base64-
  encode the JSON backup, create file if absent, update (with sha) if
  present, commit message `"Update training backup YYYY-MM-DD HH:mm"`.
- Handle: file doesn't exist (create), file exists (update w/ sha),
  invalid token, insufficient permissions, repo not found, GitHub
  conflict, no network, invalid remote JSON.
- Security UX: show a clear warning recommending a fine-grained PAT
  scoped only to this repo with only the necessary Contents permission,
  and stating the token is never saved by the app and used only for
  that action. Recommend private repo for personal data + fine-grained
  token limited to repo + Contents read/write only if possible.
- The app must work perfectly without this GitHub feature.

### 13. Project architecture
```
/src
  /components
  /pages
  /hooks
  /data
  /types
  /services
  /utils
  /styles
```
- Services: storageService.ts, backupService.ts, githubBackupService.ts,
  trainingService.ts, progressService.ts, dateService.ts, paceService.ts.
- Types: Exercise, Workout, WorkoutType, WorkoutSession,
  StrengthPerformance, RunningPerformance, WeeklyPlan, UserSettings,
  UserGoal, BackupData, GithubBackupConfig, ProgressSuggestion. Strict
  types, avoid `any` where reasonably possible.

### 14. Minimal pages
- **Dashboard**: current week summary, sessions done, running volume,
  main charts, last session, next session.
- **Planning**: Monday-Sunday view, planned session per day, visual
  status, quick access to logging.
- **Séance du jour**: view today's session, mark done, quickly log
  perf, add TFL pain + ressenti.
- **Historique**: filterable list (running/strength/rest, by date),
  session detail.
- **Exercices**: list of exercises, per-exercise history, last load
  used, suggested progression.
- **Objectifs**: configure 10k/half goals, FC max, EF zone, weekly
  goals.
- **Settings**: JSON export/import, reset data, GitHub backup, PWA
  info, app version.

### 15. UX/UI
- Dark theme by default, responsive mobile-first, very easy to use
  right after a workout, large tap targets, readable cards, low bottom
  navigation on mobile, sober colors, light animations, uncluttered
  design, no authentication needed. Few required fields, ability to
  save a partial session, simple forms, visible buttons, immediate
  feedback after saving. Mobile nav: Dashboard, Planning, Aujourd'hui,
  Historique, Settings.

### 16. Utility calculations
- Average pace from distance+duration, duration↔seconds conversion
  (hh:mm:ss), weekly volume, adherence rate, per-exercise progression,
  overload week detection, average TFL pain, TFL pain trend detection.
  Volume rule: compare this week's running volume to last week's; warn
  if increase > 10%.

### 17. Local data
- IndexedDB preferred, localStorage fallback. Must survive refresh,
  browser close, offline use. Provide: simple migration if format
  evolves, data schema version, parsing error handling, fallback if no
  data exists.

### 18. README
- Project description, stack, install, local dev, build, preview,
  GitHub Pages deployment, PWA config, local storage behavior,
  export/import behavior, GitHub backup behavior + token security
  warning, example backup JSON, project structure. Commands: `npm
  install`, `npm run dev`, `npm run build`, `npm run preview`.

### 19. GitHub Pages deployment
- Vite configured correctly for GitHub Pages: configurable base path,
  instructions for GitHub Pages, deployable via GitHub Actions, include
  the workflow if relevant. Repo is `training-tracker` →
  `base: "/training-tracker/"`. Document how to change this base path.

### 20. Expected quality
- Complete, directly usable project: no pseudo-code, no blocking TODOs,
  complete code, reusable components, clean TS types, proper error
  handling, functional forms, persisted data, functional export/import,
  functional GitHub backup, functional PWA, clean design. Deliver: full
  project structure, run/build commands, GitHub Pages deployment
  instructions, GitHub token security explanations.

**Priority order:**
1. Functional application
2. Reliable local storage
3. Fast session tracking
4. JSON export/import
5. PWA
6. Optional GitHub backup
7. Charts and suggestions

**Overriding directive:** "fais simple pas une usine à gaz" — keep it
simple, not an over-engineered factory.
