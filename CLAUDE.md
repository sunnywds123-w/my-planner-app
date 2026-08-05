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

## User's Core Rules (MUST FOLLOW)

呢啲係用戶明確要求嘅規矩，Claude Code 每次回應都要跟。

### Rule 1: 每次畀選擇都要有你嘅建議
When presenting the user with multiple options or asking them to make a decision, ALWAYS include your recommendation with reasoning. Never present options neutrally without guidance.

**❌ 錯誤例子：**
> 你可以用 A 或者 B，你揀邊個？

**✅ 正確例子：**
> 有兩個 option：
> - A：xxx（好處 / 壞處）
> - B：xxx（好處 / 壞處）
> 
> **我建議 A**，因為 [具體理由基於 project context]。你想點？

### Rule 2: 分開「同用戶講嘅」同「同 Claude Code 講嘅」

When the user is planning work that involves both discussion with you (Claude.ai web) AND execution by Claude Code (terminal), CLEARLY LABEL which parts are for which audience.

Use these labels:

**📋 同用戶（Sunny）講：**
- 討論、意見、tradeoff 分析、建議
- 用繁體中文
- Conversational tone

**🤖 同 Claude Code 講（可 copy 落 terminal）：**
- Task instructions, prompts, commands
- 用 code block 包住方便 copy
- Format 到可以直接 paste

### Rule 3: 每次畀 spec / prompt 都要有可 copy 嘅 code block 版本

When providing a prompt or instruction for Claude Code, ALWAYS wrap it in a code block (```) so the user can copy it easily. Never make the user manually select text from prose.

**❌ 錯誤例子：**
> 你可以叫 Claude Code 幫你 read CLAUDE.md 同 App.jsx 然後...

**✅ 正確例子：**
> 
> ```
> 先讀 CLAUDE.md 同 src/App.jsx，
> 然後幫我加 drag & drop 排序功能到活動類別。
> ```

---

**呢 3 條規矩優先級高過其他所有 preferences。** 如果 Claude Code 忘記，用戶會提示，Claude Code 要即刻改正並記住喺 subsequent responses。

## Development Rules

呢啲係開發流程規矩，Claude Code 每次做嘢都要跟。

### Rule 4: Commit Message Convention

每次 commit 都要跟以下 format：

```
<type>: <繁體中文簡短描述>

[optional body 詳細解釋]
```

**Types:**
- `feat`: 新功能（例：`feat: 活動類別 drag & drop 排序`）
- `fix`: 修 bug（例：`fix: Now Card 唔更新時間`）
- `refactor`: 重構冇改功能（例：`refactor: 拆 BackupModal 出獨立檔案`）
- `style`: 純 UI 樣改（例：`style: 統一 button 顏色`）
- `docs`: CLAUDE.md 或註釋更新（例：`docs: 加 storage key migration 規則`）
- `chore`: 依賴更新、config 改動（例：`chore: 升級 vite 至 5.4`）

**規矩：**
- Subject line ≤ 60 字元
- 一個 commit 只做一件事
- 唔好將唔相關嘅嘢 mix 埋一齊

### Rule 5: Storage Migration Protocol

用戶已經有一次因為 storage key 變動而「app 資料 reset」嘅切膚之痛。**任何 storage key 改動都要有 migration**。

**改 storage key 前必須：**

1. **保留舊 key**：新 code 要有 fallback 讀舊 key
2. **寫 migration function**：讀舊 key → 轉新 key → 儲返落新 key
3. **保留舊 backup**：唔可以直接刪舊 key（起碼 3 個月後先考慮清理）
4. **測試 upgrade path**：模擬舊用戶 upgrade 上嚟嘅場景

**Example pattern:**
```javascript
// 讀 storage 時
async function loadActivities() {
  // 試新 key
  let data = await window.storage.get('activities-v6');
  if (data?.value) return JSON.parse(data.value);
  
  // Migration: 試舊 key
  data = await window.storage.get('activities-v5');
  if (data?.value) {
    const parsed = JSON.parse(data.value);
    // 轉換到新 format
    const migrated = migrateV5toV6(parsed);
    // 儲返落新 key
    await window.storage.set('activities-v6', JSON.stringify(migrated));
    return migrated;
  }
  
  return DEFAULT_ACTIVITIES;
}
```

**唔可以：**
- 直接改 storage key 名而冇 migration
- 覆蓋現有 storage key 嘅 data schema 而冇 fallback
- 未問用戶就 clear 現有 storage

### Rule 6: Testing Checklist Before Commit

每次改完 code，commit 前 Claude Code 必須：

**✅ 必查項：**
- [ ] `npm run dev` 開得到，冇 console error
- [ ] 開改動涉及嘅 page/component，手動 test 過 happy path
- [ ] Backup / 匯入 / 匯出功能仲 work（因為呢個係用戶最緊要嘅安全網）
- [ ] 主要 3 個 tab（計劃 / 健康 / 統計報告）唔可以壞

**🔍 建議查項（大改動時）：**
- [ ] 手機 view (375px width) 睇下 responsive 有冇 break
- [ ] Now Card 顯示正常
- [ ] 一日內 refresh 幾次，storage 保留住
- [ ] Console 冇 warning

**Report format:**
Commit 之前用呢個 format 話用戶知：

```
✅ Testing Report
- npm run dev: OK
- Feature tested: [具體邊個 feature]
- Backup/import: OK
- Console: clean
- Ready to commit
```

如果任何一項唔 OK，**唔可以 commit**，要話用戶知然後 fix。

### Rule 7: 「先問後做」Red Lines

就算用戶話「幫我做」或者「你決定」，以下情況 Claude Code 都**必須先問**：

**🚨 Red Lines（必須先問）：**

1. **刪除任何 storage key** — 除非用戶明確講「delete X data」
2. **大 refactor** — 拆檔案、改 architecture、rename 主要 component
3. **加新 dependency** — `npm install` 前先話用戶知你想加咩、大細幾多、有冇 alternative
4. **改 package.json scripts** — 尤其係 build / dev / deploy 相關
5. **改 vite.config.js / postcss.config.js / tailwind.config.js** — build 配置改壞會出大事
6. **改 manifest.json** — 影響 PWA 行為（icon、name、start_url）
7. **改 storage key naming scheme** — 見 Rule 5
8. **Force push / rewrite git history** — 永遠先問
9. **Delete files / folders** — 用戶要明確 confirm
10. **改動涉及超過 3 個檔案嘅 refactor** — Scope 太大要先商量

**問嘅時候 format：**

```
⚠️ 我想 [具體動作]，因為 [原因]。
Impact: [會影響邊啲嘢]
Alternative: [有冇其他做法]
可以繼續嗎？
```

---

**Rule 4-7 優先級同 Rule 1-3 一樣高。** 呢啲規矩保護用戶嘅時間、data、同心血。


