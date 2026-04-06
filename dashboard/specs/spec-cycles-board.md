# Spec: Cycles Board (FLOW v3)

## Overview

A kanban-style board that visualizes FLOW v3 cycle lifecycle gates. Each card represents a markdown file in `../../cycles/`. Cards live in the column matching their `status` frontmatter field and can be dragged between columns to update status.

This board is one of two modes in the dashboard. The user switches between Cycles and Tasks via a tab toggle in the top bar.

---

## Data Source

- **Directory**: `../../cycles/` relative to `dashboard/` (i.e. `my-project-tasks/cycles/`)
- **File format**: Markdown with YAML frontmatter

### Frontmatter Schema

```yaml
---
title: "Cycle 1.2"          # string, required
status: "Proposed"           # string, required — one of the column values below
mode: "OUTCOME"              # string, required — "OUTCOME" or "DISCOVERY"
claimed_by: "RoberRaf"       # string, optional — developer username
claimed_at: "2026-04-06T12:00:00Z"  # string, optional — ISO 8601 timestamp
---
```

### Body Content Parsing

The markdown body below the frontmatter is parsed for:
- **Kill Condition**: First line matching `**Kill Condition:**` — extract text after the colon, truncate to 80 chars for display.
- **Target Metric**: First line matching `**Target Metric:**` — extract text after the colon for display.

---

## Columns (FLOW v3 Gates)

Seven columns, displayed left-to-right in this fixed order:

| # | Column Header | `status` value | Description | Color accent |
|---|--------------|----------------|-------------|-------------|
| 1 | Proposed | `Proposed` | Cycle shaped, not yet committed | Grey |
| 2 | G1 Committed | `G1 Committed` | Team committed at Gate 1 | Blue |
| 3 | Running | `Running` | Active development | Indigo |
| 4 | G2 Pulse | `G2 Pulse` | Mid-cycle health check | Amber |
| 5 | G3 Resolve | `G3 Resolve` | End-of-cycle resolution gate | Orange |
| 6 | Killed | `Killed` | Cycle killed — failed kill condition | Red |
| 7 | Done | `Done` | Cycle completed successfully | Green |

### Column Layout
- Minimum width: 200px
- Columns fill available horizontal space equally; horizontal scroll if viewport is too narrow
- Each column header shows: label + card count badge
- Column body: vertical scrollable list of cards

---

## Card Component

Each card displays:

```
+--------------------------------------+
| [OUTCOME]  (mode badge)              |
| Cycle 1.2  (title)                   |
| ------------------------------------ |
| Kill: Revenue < $1K after 7d         |
| Metric: API response time < 200ms    |
| ------------------------------------ |
| [avatar] RoberRaf    3d elapsed      |
| 1.2-cycle.md                         |
+--------------------------------------+
```

### Card Fields

| Field | Source | Display | Fallback |
|-------|--------|---------|----------|
| Mode badge | `mode` frontmatter | Colored pill: orange for `DISCOVERY`, blue for `OUTCOME` | Default to `OUTCOME` |
| Title | `title` frontmatter | Bold text, 1-2 lines max | Filename without extension |
| Kill condition | Body content match | Truncated to 80 chars | "No kill condition" (grey italic) |
| Target metric | Body content match | Truncated to 80 chars | Hidden if absent |
| Assignee | `claimed_by` frontmatter | Name chip with colored avatar circle | "Unassigned" + assign button |
| Tempo | `claimed_at` frontmatter | "Xd elapsed" (days since claim) | Hidden if not claimed |
| File ref | Filename | Small monospace text | Always shown |

### Card Styling
- White background, subtle border, 8px border-radius
- Left border: 3px solid with column color accent
- Box shadow on hover
- Cursor: grab (drag handle)
- Padding: 12px
- Margin-bottom: 8px between cards

---

## Drag and Drop

### Implementation
Use HTML5 Drag and Drop API:

1. Each card element has `draggable="true"`
2. `dragstart`: Store card's filename in `dataTransfer`, add visual drag class
3. `dragover`: Prevent default on column drop zones, add highlight class
4. `dragleave`: Remove highlight class
5. `drop`: Read filename from `dataTransfer`, determine target column, call API

### On Drop Behavior
1. **Optimistic UI**: Immediately move card DOM element to target column
2. **API call**: `PATCH /api/cycles/:filename` with new `status` value
3. **On success**: Update card count badges
4. **On error**: Revert card to original column, show toast error message

### Transition Rules
- All column-to-column transitions are allowed (the PM enforces process, not the tool)
- Moving to "Killed" or "Done" columns should show a brief confirmation tooltip (non-blocking)

---

## Developer Assignment

### Mock Developer List
```javascript
const DEVELOPERS = [
  { id: "RoberRaf", name: "Rober Raf", color: "#4A90D9" },
  { id: "AhmadDev", name: "Ahmad Dev", color: "#7B68EE" },
  { id: "SaraQA", name: "Sara QA", color: "#E91E63" },
  { id: "OmarDesign", name: "Omar Design", color: "#FF9800" },
  { id: "LinaFront", name: "Lina Front", color: "#4CAF50" }
];
```

### Assignment Flow
1. Click assignee area on card (or "Unassigned" button)
2. Dropdown appears with developer list + "Unassign" option
3. On select:
   - If assigning: `PATCH /api/cycles/:filename` with `claimed_by: id` and `claimed_at: new Date().toISOString()`
   - If unassigning: `PATCH /api/cycles/:filename` with `claimed_by: ""` and `claimed_at: ""`
4. Update card UI immediately (optimistic)

---

## Server API Endpoints

### GET /api/cycles

Returns all cycle files as JSON.

**Response:**
```json
[
  {
    "filename": "1.2-cycle.md",
    "title": "Cycle 1.2",
    "status": "Proposed",
    "mode": "OUTCOME",
    "claimed_by": "",
    "claimed_at": "",
    "killCondition": "Revenue < $1K after 7 days",
    "targetMetric": "API response time < 200ms",
    "body": "# full markdown body..."
  }
]
```

**Logic:**
1. Read all `*.md` files in `cycles/` directory
2. Parse YAML frontmatter (split on `---` delimiters)
3. Extract kill condition and target metric from body via regex
4. Return sorted by filename ascending

### PATCH /api/cycles/:filename

Updates frontmatter fields in a cycle file.

**Request body:**
```json
{
  "status": "Running",
  "claimed_by": "RoberRaf",
  "claimed_at": "2026-04-07T10:00:00Z"
}
```

**Logic:**
1. Read the file
2. Split on `---` delimiters to isolate frontmatter
3. Parse YAML, merge only the provided fields
4. Serialize frontmatter back to YAML
5. Rejoin with original body content (preserve body exactly)
6. Write file

**Response:** `{ "ok": true }` or `{ "error": "message" }` with 4xx/5xx status

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing frontmatter fields | Default: `status: "Proposed"`, `mode: "OUTCOME"`, others empty |
| Unrecognized status value | Place card in "Proposed" column, log warning |
| Empty cycles directory | Show centered message: "No cycles yet" |
| File read/write error | Toast notification with error, revert optimistic UI |
| Filename with spaces | URL-encode in API calls |
| Concurrent edits | Last-write-wins (acceptable for local single-user tool) |

---

## UI Layout (shared with Tasks board)

```
+----------------------------------------------------------+
|  FLOW Dashboard          [Cycles] [Tasks]    [Refresh]   |
+----------------------------------------------------------+
|  | Proposed | G1 Committed | Running | G2 Pulse | ...   |
|  |  (2)     |    (0)       |  (1)    |   (0)    |       |
|  | [card]   |              | [card]  |          |       |
|  | [card]   |              |         |          |       |
|  |          |              |         |          |       |
+----------------------------------------------------------+
```

- Top bar: fixed, full width, dark background
- Tab toggle: pill-style buttons, active tab highlighted
- Board area: fills remaining viewport height, horizontal scroll
- Refresh button: re-fetches data from server

---

## Tech Stack

- **Frontend**: Vanilla HTML + CSS + JavaScript (no frameworks)
- **Backend**: Node.js with Express
- **YAML parsing**: `js-yaml` package (server-side only)
- **No database**: Files are the source of truth
