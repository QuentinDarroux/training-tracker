# Training Tracker

A Progressive Web App (PWA) to track running and strength training sessions — with TFL pain monitoring, weekly planning, dashboard with charts, goals, progression suggestions, and optional GitHub backup.

> "fais simple pas une usine à gaz" — built to be installed on mobile, used right after a workout.

## Stack

- **React 18** + **TypeScript** — UI
- **Vite 5** — build tool
- **TailwindCSS 3** — styling (dark theme by default)
- **Recharts** — charts (volume, TFL, pace, HR)
- **vite-plugin-pwa** + Workbox — PWA/service worker
- **idb** — IndexedDB wrapper (localStorage fallback)
- **React Router v6** — client-side routing

## Install & Run

```bash
npm install
npm run dev        # dev server → http://localhost:5173/training-tracker/
npm run build      # production build in /dist
npm run preview    # preview production build
npm run lint       # ESLint check
```

## GitHub Pages Deployment

### Base path configuration

The Vite `base` is configured for `training-tracker` repo:

```ts
// vite.config.ts
const BASE_PATH = '/training-tracker/'
```

To deploy under a different repo name, change `BASE_PATH`:
```ts
const BASE_PATH = '/my-other-repo-name/'
```

### GitHub Actions

The workflow `.github/workflows/deploy.yml` automatically builds and deploys to GitHub Pages on every push to `main`.

**Setup steps:**
1. Push this repo to GitHub
2. Go to **Settings > Pages** → set Source to **GitHub Actions**
3. Push to `main` — the workflow handles the rest

## PWA

- Installable on Android, iOS, desktop
- Works offline after first load (assets precached)
- Auto-updates when a new version is deployed
- Dark theme by default, no address bar once installed

## Local Data Persistence

- All data stored **locally** in IndexedDB (localStorage fallback)
- Data survives refresh, browser close, and offline use
- Schema version: `1.0.0` — basic migration handled at load time
- **No server, no authentication, no telemetry**

## Export / Import

- **Export**: Settings → "Exporter en JSON" → downloads a `training-tracker-backup-YYYY-MM-DD.json`
- **Import**: Settings → "Importer un JSON" → validates format, confirms before overwriting

Export format:
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-07-09T10:00:00.000Z",
  "settings": {},
  "sessions": [],
  "strengthPerformances": [],
  "runningPerformances": [],
  "goals": {}
}
```

## Optional GitHub Backup

Settings → Backup GitHub → configure owner/repo/branch/path.

**⚠️ Token security:**
- The GitHub Personal Access Token is **never saved** by this app
- It is requested via a password input **at the moment of the action only**
- It lives only in a runtime variable for the duration of the API call
- It is cleared immediately after use
- Recommendation: use a **fine-grained PAT** scoped only to this repo with Contents (read/write) permission only, in a **private** repo for your personal data

## Project Structure

```
src/
├── components/     # BottomNav, PageLayout, RatingInput, WorkoutBadge, TokenModal
├── pages/          # DashboardPage, PlanningPage, TodayPage, SessionPage,
│                   # HistoriquePage, ExercicesPage, ObjectifsPage, SettingsPage
├── hooks/          # useData (central data hook)
├── data/           # workouts.ts (JSON config), weeklyPlan.ts
├── types/          # index.ts (all TypeScript types)
├── services/       # storageService, backupService, githubBackupService, progressService
├── utils/          # calc.ts (pace, dates, volume, adherence, TFL trend)
├── styles/         # (index.css with Tailwind)
└── sw.ts           # Service worker (Workbox injectManifest)
```

## Weekly Plan (default)

| Day       | Session           |
|-----------|-------------------|
| Lundi     | Renforcement A    |
| Mardi     | Footing EF        |
| Mercredi  | Repos             |
| Jeudi     | Séance qualité    |
| Vendredi  | Renforcement B    |
| Samedi    | Repos             |
| Dimanche  | Sortie longue     |

Edit `src/data/weeklyPlan.ts` to change the default plan, or update it in the app (future: Settings > Plan).
