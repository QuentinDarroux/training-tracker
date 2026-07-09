# Training Tracker — JSON configuration guide for agents

This document explains how to generate a `training-config.json` file that can be pushed to GitHub and consumed by the Training Tracker app.

The JSON config is meant to replace hard-coded TypeScript files such as `weeklyPlan.ts` and `workouts.ts`. Do **not** generate TypeScript from the app. Generate JSON only.

## Target file

Recommended path in the GitHub repository:

```text
public/data/training-config.json
```

Vite copies files from `public/` into the deployed GitHub Pages artifact. After rebuild, this file is served at:

```text
https://quentindarroux.github.io/training-tracker/data/training-config.json
```

The app expects a JSON object with:

- `version`: string
- `exportedAt`: ISO datetime string
- either `plan` for a flexible dated program, or legacy `weeklyPlan`
- `workouts`: array of workout definitions

## Required schema

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-07-09T15:45:00.000Z",
  "plan": {
    "type": "dated",
    "entries": [
      { "date": "2026-07-10", "label": "Matin", "workoutId": "renfo_a" },
      { "date": "2026-07-10", "label": "Après-midi", "workoutId": "footing_ef" }
    ]
  },
  "workouts": []
}
```

## Validation rules

An agent generating this file must follow these rules:

1. Prefer `plan.type = "dated"` for user-authored programs.
2. Every `plan.entries[].workoutId` must match an existing `workouts[].id`.
3. Every workout `id` must be unique and stable. Use lowercase snake_case, for example `renfo_a`, `footing_ef`, `sortie_longue`.
4. `workout.type` must be one of: `strength`, `running`, `rest`.
5. `rest` and `running` workouts should use `"exercises": []`.
6. `strength` workouts should list one or more exercises.
7. Every exercise `id` must be unique enough to avoid ambiguity in performance history. Prefer stable ids; do not rename ids casually.
8. Exercise `unit` must be either `reps` or `seconds`.
9. Exercise `side` must be one of: `both`, `left`, `right`, `unilateral`.
10. Use numbers for `sets` and `reps`, not strings.

## Dated plan format

Use this format when the user wants a program over arbitrary dates, a 10-day plan, or multiple sessions on the same day:

```json
"plan": {
  "type": "dated",
  "entries": [
    {
      "date": "2026-07-10",
      "label": "Matin",
      "workoutId": "renfo_a"
    },
    {
      "date": "2026-07-10",
      "label": "Après-midi",
      "workoutId": "footing_ef"
    },
    {
      "date": "2026-07-11",
      "label": "J2",
      "workoutId": "repos"
    }
  ]
}
```

Notes:

- `date` must be `YYYY-MM-DD`.
- `label` is displayed in Planning and Aujourd'hui. Examples: `Matin`, `Après-midi`, `J1`, `Séance 2`.
- Multiple entries can use the same `date`.
- Entries are shown week-by-week in Planning, with an additional "Tout le programme" tab.
- Optional `id` can be provided for stable session matching. If omitted, the app derives one from `date + label + workoutId`.

## Legacy weekly plan format

The old weekly format is still accepted for backward compatibility:

```json
"weeklyPlan": {
  "monday": "renfo_a",
  "tuesday": "footing_ef",
  "wednesday": "repos",
  "thursday": "seance_qualite",
  "friday": "renfo_b",
  "saturday": "repos",
  "sunday": "sortie_longue"
}
```

## Workout object

```json
{
  "id": "renfo_a",
  "title": "Renforcement A",
  "type": "strength",
  "description": "Jambes + core + prévention TFL",
  "exercises": []
}
```

### Running workout

```json
{
  "id": "footing_ef",
  "title": "Footing EF",
  "type": "running",
  "description": "Endurance fondamentale — allure facile, FC contrôlée, discussion possible.",
  "exercises": []
}
```

### Rest workout

```json
{
  "id": "repos",
  "title": "Repos",
  "type": "rest",
  "description": "Journée de récupération.",
  "exercises": []
}
```

### Strength workout with exercises

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
    },
    {
      "id": "planche",
      "name": "Planche",
      "sets": 3,
      "reps": 30,
      "unit": "seconds",
      "trackWeight": false,
      "trackDuration": true,
      "side": "both"
    }
  ]
}
```

## Complete example

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-07-09T15:45:00.000Z",
  "plan": {
    "type": "dated",
    "entries": [
      { "date": "2026-07-10", "label": "Matin", "workoutId": "renfo_a" },
      { "date": "2026-07-10", "label": "Après-midi", "workoutId": "footing_ef" },
      { "date": "2026-07-11", "label": "J2", "workoutId": "repos" },
      { "date": "2026-07-12", "label": "Sortie longue", "workoutId": "sortie_longue" }
    ]
  },
  "workouts": [
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
        },
        {
          "id": "fentes",
          "name": "Fentes",
          "sets": 3,
          "reps": 10,
          "unit": "reps",
          "trackWeight": true,
          "trackDuration": false,
          "side": "unilateral"
        }
      ]
    },
    {
      "id": "footing_ef",
      "title": "Footing EF",
      "type": "running",
      "description": "Endurance fondamentale — allure facile, FC contrôlée, discussion possible.",
      "exercises": []
    },
    {
      "id": "seance_qualite",
      "title": "Séance qualité",
      "type": "running",
      "description": "Fractionné ou tempo contrôlé.",
      "exercises": []
    },
    {
      "id": "renfo_b",
      "title": "Renforcement B",
      "type": "strength",
      "description": "Jambes + fessiers + stabilité hanche",
      "exercises": [
        {
          "id": "step_up",
          "name": "Step Up",
          "sets": 3,
          "reps": 10,
          "unit": "reps",
          "trackWeight": true,
          "trackDuration": false,
          "side": "unilateral"
        }
      ]
    },
    {
      "id": "sortie_longue",
      "title": "Sortie longue",
      "type": "running",
      "description": "Construire l'endurance progressivement, en zone facile.",
      "exercises": []
    },
    {
      "id": "repos",
      "title": "Repos",
      "type": "rest",
      "description": "Journée de récupération.",
      "exercises": []
    }
  ]
}
```

## Agent checklist before pushing

Before writing or pushing `data/training-config.json`, verify:

1. The JSON parses with `JSON.parse`.
2. If `plan.type` is `dated`, every entry has `date`, `label`, and `workoutId`.
3. Every planned workout id exists in `workouts`.
4. No duplicate workout ids.
5. Strength exercises use valid `unit` and `side` values.
6. Running/rest workouts have an empty `exercises` array.
7. Existing workout and exercise ids are preserved unless the user explicitly wants to reset history linkage.
