# My Planner - Self-Improvement App

## Project Purpose

This is a personal Progressive Web App (PWA) focused on **self-improvement** through daily habit tracking and time management. The user is a Cantonese speaker in Hong Kong using this app on iPhone (added to home screen).

**Long-term vision**: Evolve from a simple planner into a comprehensive self-improvement companion, with focus on:
- Building consistent habits
- Time awareness and management
- Reflection and self-review
- Data-driven personal insights

## Tech Stack

- **React 18** with functional components + hooks
- **Vite** as build tool
- **Tailwind CSS** (utility classes only, no custom config beyond defaults)
- **lucide-react** for all icons
- **Deployed on Vercel** (via GitHub auto-deploy)
- **localStorage** for all persistence (no backend, no database)

## Architecture

**Single-file app**: `src/App.jsx` contains everything (~1600 lines).
The app uses a `window.storage` shim at the top of the file to abstract localStorage — this makes the code portable back to Claude.ai artifacts if needed.

### Storage Keys
- `activities-v5` — activity types (工作、玩樂 etc.)
- `plan-template-v1` — weekly recurring plan template
- `supp-slots-v1` — supplement slots with times
- `skincare-v1` — skincare steps (AM/PM)
- `skincare-times-v1` — skincare reminder times
- `health:YYYY-MM-DD` — per-day check records

## Current Features (v6)

### 3 main tabs
1. **計劃 (Plan)** - Weekly recurring template, day/week views, activity manager
2. **健康 (Health)** - Supplements + Skincare, per-day check records, auto-focus current time period
3. **統計報告 (Report)** - Time distribution stats + daily report export

### Global features
- **Now Card** at top of Plan tab (shows current activity + next transition)
- **Backup/Import/Clear** modal (top-right database icon)
- **Traditional Chinese UI** with warm stone-color palette

## Design Principles

- **Mobile-first**: Every UI decision should work well on a 375px-wide iPhone screen
- **Language**: All user-facing text in **Traditional Chinese (Hong Kong Cantonese)**. Comments in code can be mixed English/Chinese.
- **Typography**:
  - Headings: `Georgia, serif` (elegant, distinctive)
  - Body: `-apple-system, "Helvetica Neue", sans-serif`
  - Tabular numbers: `fontVariantNumeric: 'tabular-nums'` for time/counts
- **Color palette**: Tailwind `stone-*` for neutrals; accent colors from `COLOR_PALETTE` constant
- **Aesthetic**: Minimalist, calm, no excessive animation. Rounded corners (rounded-xl to rounded-2xl). Soft shadows.
- **Interactions**: `active:scale-95` or `active:scale-[0.98]` on all tappable elements

## Coding Conventions

- **Component naming**: PascalCase for components, camelCase for functions
- **State management**: Local `useState` only, no Redux/Zustand
- **Async patterns**: All storage operations are async with try/catch, silent failures acceptable
- **No emoji rendering issues**: Use inline emoji strings (e.g., `'💊'`) in JSX, they render fine
- **Modal pattern**: `<Modal title="..." onClose={...}>{children}</Modal>` — standardized wrapper
- **Auto-save**: Every state change should trigger a save. Show brief "已儲存" flash indicator.

## Key Data Models

```javascript
// Activity
{ id: string, label: string, emoji: string, color: string }

// Supplement slot
{ id: string, label: string, emoji: string, time: 'HH:MM', items: [{id, name}] }

// Skincare
{ am: [{id, name}], pm: [{id, name}] }

// Per-day health record
{ supps: { 'slotId:itemId': boolean }, skincare: { 'am|pm:stepId': boolean } }

// Weekly plan template
{ '0-9': 'work', '0-10': 'study', ... }  // key: `${dayIdx}-${hour}`, dayIdx: 0=Mon
```

## What NOT to change without discussion

- **Storage key names**: Users have existing data. Any change requires migration logic.
- **Backup format version**: Currently `version: 2`. Bumping requires backward-compat parsing.
- **Language**: Do not translate to English or Simplified Chinese.
- **Single-file structure**: Keep everything in `src/App.jsx` unless doing a major refactor (and discuss first).

## Deployment

- **GitHub → Vercel auto-deploy** on push to `main` branch
- No manual build/deploy needed
- PWA manifest at `public/manifest.json`, icons at `public/icon-*.png`

## Direction: Where to take this app

The user wants to focus on **self-improvement**. Prioritized future features (rough order):
1. **Habit streaks** — Consecutive days completed for supp/skincare/plan adherence
2. **Weekly review** — Reflection prompts, journal entries, weekly summary
3. **Better insights** — Not just "what you did" but patterns ("你週三通常忙嘢，安排少啲")
4. **Focus modes** — Time blocking, pomodoro-style focus sessions
5. **Learning tracker** — Skills, books, deliberate practice logging

Ask the user before adding any new feature — they value focused, intentional additions over feature bloat.

## Testing

There are no tests currently. If adding tests, use Vitest (Vite-native).

## Working with the user

- **Communication style**: Direct, structured, uses tables and comparisons
- **Decision process**: Ask questions before implementing; user likes to think through tradeoffs
- **Approach**: Iterate in small steps, deploy, get feedback, iterate again
- **Preferred response format**: 
  - Short summaries, not walls of text
  - Concrete options over vague suggestions
  - Show tradeoffs explicitly
