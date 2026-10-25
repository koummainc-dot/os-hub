# 🧠 HABIT OS — Independent Application Build Specification

**Version:** 2.0
**Product family:** Personal OS
**Reference:** Personal Notion OS — Official Master System Reference v4.0
**Purpose:** Build Habit OS as a standalone application experience, while preserving its links to the Personal OS.

---

## 1. Scope and product boundary

Habit OS owns exactly these seven domain entities:

1. Habit Library
2. Daily Log
3. Relapse Log
4. Journal
5. Books
6. Weekly Focus
7. Achievements

It does not own Projects, Learning, Finance, Home, or Content records. When one of those concepts appears in a habit category or context, reference the owning system instead of creating a duplicate entity.

### Core mental model

> Track everything; focus daily on only 3–5 habits.

Habit levels:
- **Growth:** currently focused, normally 3–5 habits.
- **Maintenance:** stable habits.
- **Automatic:** tracked mainly through statistics.
- **Deferred:** intentionally postponed.

Bad habits use **clean days + relapse logic**, not normal success streak semantics.

---

## 2. Module navigation / screen map

```text
Habit OS
├── Dashboard
│   ├── Today / Focus
│   ├── Streaks
│   ├── Clean Days
│   └── Weekly Snapshot
├── Habits
│   ├── All
│   ├── Growth
│   ├── Maintenance
│   ├── Automatic
│   └── Archived
├── Daily Log
├── Relapses
├── Journal
├── Books
├── Weekly Focus
└── Achievements
```

### Primary UX rule
The fastest path is:

```text
Open Habit OS
→ see Focus 3–5
→ one-tap log
→ optional quantity/note/trigger
→ immediately see updated streak/progress
```

Do not make the user open a generic database form for the normal daily logging action.

---

## 3. Database architecture

Use a real relational schema or the existing project's equivalent.

Every table is user-scoped and has stable identifiers. Common infrastructure fields (`id`, `user_id`, `created_at`, `updated_at`) belong to the shared application layer and are not shown repeatedly in every logical field list below.

### Domain ERD

```text
Habit
 ├──< DailyLog
 ├──< Relapse
 ├──< Achievement
 ├──< WeeklyFocusHabit >── WeeklyFocus
 ├──< HabitRelation >── Habit
 ├──< HabitBook >── Book
 └──< JournalHabit >── Journal

Book
 └──< DailyLog (optional context)
```

---

## 4. Database: Habit Library (`habits`)

### Purpose
The canonical definition of a habit, its schedule, goals, weighting, and recovery context.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| name | string | Yes | Input | Human-readable habit name |
| type | enum | Yes | Input | `Good`, `Bad` |
| level | enum | Yes | Input | `Growth`, `Maintenance`, `Automatic`, `Deferred` |
| status | enum | Yes | Input | `Active`, `Paused`, `Archived` |
| category | enum/taxonomy FK | Yes | Input | Religion, Fitness, Sleep & Recovery, Mind, Learning, Work, Projects, Content, Money, Digital, Relationships, Home, Care, Mobility, Development, Bad Habits |
| frequency | structured schedule | Yes | Input | Store as structured data, not free text |
| days | set/array | No | Input | Selected schedule days |
| goal | decimal | Yes for quantity habits | Input | Must be > 0 when quantity-based |
| unit | enum/string | No | Input | minutes, pages, times, etc. |
| minimum | decimal | No | Input | Minimum acceptable completion |
| weight | integer | Yes | Input | 1–3 |
| priority | enum | No | Input | Keep configurable |
| preferred_time | time | No | Input | Preferred time |
| why | text | No | Input | Motivation |
| reward | text | No | Input | Reward |
| usual_triggers | text | No | Input | Common triggers |
| quit_reason | text | No | Input | For bad habits |
| recovery_plan | text | No | Input | Recovery plan |
| best_clean_streak | integer | No | Derived/preserved | Do not let ordinary editing overwrite historical best |

### Internal derived metrics
Do not store these as user-editable values:

- total quantity
- last log
- number of logs
- completed days
- relapse count
- last relapse
- successful days
- relapse-day numbers/timeline
- journal days
- clean days for bad habits
- compliance ratio
- current streak
- best calculated streak
- weighted score

### Relations

- Habit → Daily Logs: 1:N
- Habit → Relapses: 1:N
- Habit → Achievements: 1:N
- Habit ↔ Habit: optional self-relation for related/alternative habits
- Habit ↔ Books: M:N
- Habit ↔ Journal: contextual relation
- Habit ↔ Weekly Focus: M:N

### Constraints

- Weight must be 1–3.
- Bad habit relapse must point to a bad habit.
- Archived habits are excluded from active Focus.
- Schedule must be structurally valid.
- Never allow a parent/related-habit cycle if self-relations are used as directed relationships.

---

## 5. Database: Daily Log (`habit_daily_logs`)

### Purpose
The actual day-by-day habit record and the canonical source for streak/progress calculations.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| habit_id | FK → Habit | Yes | Input | Must belong to same user |
| date | date | Yes | Input | Interpreted in user's timezone |
| actual | decimal | No | Input | Quantity actually completed |
| status | enum | Yes | Input | `Done`, `Partial`, `Missed`, `Vacation` |
| note | text | No | Input | Optional note |
| trigger | text | No | Input | Optional trigger |
| book_id | FK → Book | No | Input | Optional reading context |
| occurrence_key | string | No | System | Stable key if a habit can have multiple occurrences/day |

### Uniqueness
Use a deterministic occurrence identity. For one-record-per-day habits:

```text
UNIQUE(user_id, habit_id, date)
```

If multiple occurrences are explicitly supported, use:

```text
UNIQUE(user_id, habit_id, date, occurrence_key)
```

### Calculations

Completion ratio:

```text
if goal > 0:
    min(actual / goal, 1)
else:
    0
```

Achievement state:
- ⬜ Not Started
- 🟠 Weak
- 🟡 Close
- 🟢 Done

Weighted score:

```text
completion_ratio × habit_weight
```

Streak behavior:

| Status | Effect |
|---|---|
| Done | preserve / continue |
| Vacation | preserve |
| Partial | break |
| Missed | break |

### UX
Provide a dedicated `Quick Log` interaction. The user should not need to edit the Habit record to mark a daily result.

---

## 6. Database: Relapse Log (`habit_relapses`)

### Purpose
Historical relapse events for bad habits.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| habit_id | FK → Habit | Yes | Input | Must point to a `Bad` habit |
| datetime | timestamp | Yes | Input | Timezone-aware |
| trigger | text | No | Input | What triggered the event |
| related_habit_id | FK → Habit | No | Input | Related habit when needed |
| severity | integer/enum | No | Input | Source confirms severity exists but does not define its exact scale; keep configurable |
| what_happened | text | No | Input | Description |
| plan_24h | text | No | Input | Immediate recovery plan |
| outcome | text | No | Input | Result |

### Event effects
When a relapse is created:
- clean days reset to the relapse point;
- relapse count increments;
- best historical clean streak remains preserved.

Do not physically overwrite the historical best streak.

---

## 7. Database: Journal (`habit_journals`)

### Purpose
Private day-level reflection inside Habit OS.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| title | string | Yes | Input | Journal entry title |
| date | date | Yes | Input | User timezone |
| intention | text | No | Input | 🌅 intention |
| top_3 | text/list | No | Input | 🎯 top 3 |
| mood | number/enum | No | Input | Source does not define exact scale; configure |
| energy | number/enum | No | Input | Source does not define exact scale; configure |
| gratitude | text | No | Input | 🙏 |
| win | text | No | Input | 🏆 |
| learning | text | No | Input | 🧠 |
| worries | text | No | Input | 😟 |
| tomorrow_plan | text | No | Input | 📅 |
| tags | M:N / tag IDs | No | Input | User tags |
| related_habit_id | FK | No | Input | Optional context |

### UX template
The app should provide a real `New Journal` flow instead of the Notion `Duplicate template` workaround.

---

## 8. Database: Books (`habit_books`)

### Purpose
Reading library with page tracking and optional habit linkage.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| name | string | Yes | Input | Book name |
| author | string | No | Input | Author |
| status | enum | Yes | Input | Use a configurable reading-status set; exact values are not fully specified in v4 |
| category | string/FK | No | Input | Category |
| format | enum/string | No | Input | Format |
| language | string | No | Input | Language |
| total_pages | integer | No | Input | >= 0 |
| pages_before_tracking | integer | No | Input | Pages already read before tracking started |
| start_date | date | No | Input | Start |
| end_date | date | No | Input | Finish |
| rating | number | No | Input | Scale not specified in source |
| priority | enum | No | Input | Priority |
| key_idea | text | No | Input | Main idea |
| notes_quotes | text | No | Input | Notes/quotes |
| cover | file/url | No | Input | Cover |
| url | URL | No | Input | External link |
| habit_id | FK | No | Input | Related habit |

### Calculations

```text
current_page = pages_before_tracking + tracked_pages
remaining = max(total_pages - current_page, 0)
progress = current_page / total_pages
```

Guard `total_pages = 0`.

---

## 9. Database: Weekly Focus (`habit_weekly_focus`)

### Purpose
One weekly record containing the 3–5 habits currently receiving active focus.

### Fields

| Field | App type | Required | Input/Derived |
|---|---|---:|---|
| week | string/date-range | Yes | Input/System |
| start_date | date | Yes | Input/System |
| focused_habits | M:N → Habit | Yes | Input |
| what_worked | text | No | Input |
| what_failed | text | No | Input |
| rating | number/enum | No | Input; exact scale not defined |
| next_week_adjustment | text | No | Input |

### Constraint
Recommend:

```text
UNIQUE(user_id, start_date)
```

The application may warn when >5 focus habits are selected instead of deleting or blocking data.

---

## 10. Database: Achievements (`habit_achievements`)

### Purpose
Rules-based achievements tied to habit behavior.

### Fields

| Field | App type | Required | Input/Derived | Rules |
|---|---|---:|---|---|
| name | string | Yes | Input | Achievement name |
| habit_id | FK | No | Input | Related habit |
| condition_type | enum | Yes | Input | `Clean Days`, `Total Quantity`, `Completed Days` |
| condition_value | number | Yes | Input | Required threshold |
| current_value | number | Yes | Derived | Current measured value |
| is_achieved | boolean | Yes | Derived | Never manually edited |
| achieved_at | timestamp | No | Derived | Set when first achieved |

### Calculation

```text
current_value / condition_value
```

Display:
- 🏅 Achieved
- ⏳ current / target

---

## 11. Habit OS business workflows

### New habit

```text
Create Habit
→ validate type/goal/schedule
→ save
→ create eligible dashboard state
```

### Daily completion

```text
Open Focus
→ Select habit
→ Done/Partial/Missed/Vacation
→ optional actual
→ optional note/trigger
→ save Daily Log
→ recalculate habit metrics
→ recalculate achievements
→ refresh Today integration
```

### Bad-habit relapse

```text
Log Relapse
→ save event
→ recompute clean days
→ preserve historical best clean streak
→ update dashboard
```

### Weekly review

```text
Open Weekly Focus
→ select 3–5
→ review logs
→ record what worked / failed
→ save next-week adjustment
```

---

## 12. Habit OS automation

Notion limitations should not be copied.

Implement:
- automatic streak calculation across actual history;
- automatic clean-day calculation;
- automatic achievement progress;
- optional streak-at-risk notification;
- optional daily reminder for focus habits;
- weekly reminder to review Focus;
- real journal/week creation actions instead of template duplication.

Do not create automatic Daily Log records merely to make a calendar look populated unless a separate product decision explicitly requests it.

---

## 13. Habit OS integration

### Learning
Habit categories can reference Learning context. Do not create a second Learning entity.

### Projects / Content / Finance / Home
Habit categories may include these domains; linking should use shared Areas or explicit relations only where defined in the Core contract.

### Today
Today reads:
- focus habits;
- today's logs;
- streak status;
- attention state.

Today never owns Habit records.

---

## 14. Implementation order

1. Habit / Daily Log schema.
2. Core calculations.
3. Habit list/detail.
4. Quick Log.
5. Streak + clean-days engine.
6. Relapse flow.
7. Books + journal.
8. Weekly Focus.
9. Achievements.
10. Notifications/integrations.
11. Test suite.

---

## 15. Acceptance tests

1. Done continues streak.
2. Vacation preserves streak.
3. Partial breaks streak.
4. Missed breaks streak.
5. Bad-habit relapse resets clean days and preserves historical best.
6. Daily completion ratio never exceeds 1.0.
7. Weighted score uses ratio × weight.
8. Archived habit disappears from active Focus.
9. Book remaining never goes below zero.
10. Achievement reflects underlying logs.
11. Duplicate daily occurrence is rejected/idempotent.
12. All day boundaries use user timezone.
13. Editing an old log recalculates affected metrics.
14. Today reflects Habit changes without creating duplicate records.
