# Plan: Exercise Type Feature Flags

## Context

User wants to disable Rhythm Trainer (`rt`) by default and have per-exercise-type enable/disable toggles. There is no existing mechanism for this — all 9 types are always active.

## Approach

Add an `enabled` default to each type in the `TYPES` array, persist user overrides in localStorage, and filter disabled types out of the engine selection and UI display.

## Changes

### 1. `src/lib/learning/configs/unified.js` — Add `enabled` defaults + filtering

- Add `enabled: true` to each TYPES entry, except `rt` which gets `enabled: false`
- Add `loadTypeFlags()` / `saveTypeFlags()` helpers using localStorage key `gl_type_flags` (returns `{[typeId]: boolean}` overrides)
- Export a `getEnabledTypes()` function that merges defaults with stored overrides, returning only enabled types
- Update `getTypeIds()` to filter out disabled types
- Update `computeTypeWeights()` to skip disabled types (set weight to 0)

### 2. `src/routes/practice/+page.svelte` — Filter idle view + add toggle UI

- Import `getEnabledTypes`, `loadTypeFlags`, `saveTypeFlags`
- In idle view type bars (`{#each typeStats as ts}`): show all types but add a toggle button per type
- Toggle click calls `saveTypeFlags()` and updates local state
- Disabled types shown grayed out with a toggle indicator

### 3. `src/routes/+page.svelte` — Filter home page type bars

- Use `getEnabledTypes()` to filter which types show progress bars (or show all with disabled styling)

### 4. `src/lib/components/LearningDashboard.svelte` — Filter dashboard

- Use `getEnabledTypes()` to filter Exercise Mastery section

## Files to modify

1. `src/lib/learning/configs/unified.js`
2. `src/routes/practice/+page.svelte`
3. `src/routes/+page.svelte`
4. `src/lib/components/LearningDashboard.svelte`

## Verification

- `npx vitest run` — all existing tests pass
- Start practice → Rhythm Trainer should never appear
- Idle view shows all types with toggles; `rt` is off by default
- Enable `rt` via toggle → it starts appearing in practice
- Disable a type mid-session → engine stops selecting it
