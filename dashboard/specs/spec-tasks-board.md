# Spec: Tasks Board (Jira-style)

## Overview

A classic Jira-style kanban board for tracking individual tasks. Each card represents a markdown file in `../../tasks/`. Cards live in the column matching their `status` frontmatter field and can be dragged between columns to update status.

This board is one of two modes in the dashboard. The user switches between Cycles and Tasks via a tab toggle in the top bar.

---

## Data Source

- **Directory**: `../../tasks/` relative to `dashboard/` (i.e. `my-project-tasks/tasks/`)
- **File format**: Markdown with YAML frontmatter

### Frontmatter Schema

```yaml
---
title: "Task one"              # string, required
status: "todo"                 # string, required — one of: todo, in-progress, done, blocked
claimed_by: "RoberRaf"         # string, optional — developer username
claimed_at: "2026-04-06T12:00:00Z"  # string, optional — ISO 8601 timestamp
---
```

### Body Content
The body below frontmatter contains task details in markdown. The card does NOT display body content — only frontmatter fields are shown on the board.

---

## Columns

Four columns, displayed left-to-right in this fixed order:

| # | Column Header | `status` value | Description | Color accent |
|---|--------------|----------------|-------------|-------------|
| 1 | Todo | `todo` | Work not yet started | Grey (#9E9E9E) |
| 2 | In Progress | `in-progress` | Actively being worked on | Blue (#2196F3) |
| 3 | Done | `done` | Completed | Green (#4CAF50) |
| 4 | Blocked | `blocked` | Blocked by dependency or issue | Red (#F44336) |

### Column Layout
- Minimum width: 250px (wider than cycles since fewer columns)
- Columns fill available horizontal space equally
- Each column header shows: label + card count badge (same style as cycles board)
- Column body: vertical scrollable list of cards

---

## Card Component

Each card displays:

```
+--------------------------------------+
| Task one  (title)                    |
| ------------------------------------ |
| [status chip: done]                  |
| [avatar] RoberRaf                    |
| task_one.md                          |
+--------------------------------------+
```

### Card Fields

| Field | Source | Display | Fallback |
|-------|--------|---------|----------|
| Title | `title` frontmatter | Bold text, 1-2 lines max | Filename without extension |
| Status chip | `status` frontmatter | Colored pill matching column color | — |
| Assignee | `claimed_by` frontmatter | Name chip with colored avatar circle | "Unassigned" + assign button |
| File ref | Filename | Small monospace text | Always shown |

### Card Styling
- Same base style as cycles cards: white background, subtle border, 8px border-radius
- Left border: 3px solid with column color accent
- Box shadow on hover
- Cursor: grab
- Padding: 12px
- Margin-bottom: 8px between cards
- Simpler than cycle cards — no mode badge, no kill condition, no tempo

---

## Drag and Drop

### Implementation
Shares the same HTML5 Drag and Drop logic as the cycles board (reuse `board.js` utilities).

1. Each card element has `draggable="true"`
2. `dragstart`: Store card's filename in `dataTransfer`
3. `dragover`: Prevent default on column drop zones, highlight
4. `drop`: Read filename, determine target column, call API

### On Drop Behavior
1. **Optimistic UI**: Move card DOM element immediately
2. **API call**: `PATCH /api/tasks/:filename` with new `status` value
3. **On success**: Update card count badges
4. **On error**: Revert to original column, show toast error

### Status Value Mapping

When a card is dropped into a column, write the exact lowercase status value:

| Target Column | Written `status` value |
|--------------|----------------------|
| Todo | `todo` |
| In Progress | `in-progress` |
| Done | `done` |
| Blocked | `blocked` |

### Transition Rules
- All transitions allowed (any column to any column)
- No confirmation needed for any transition

---

## Developer Assignment

### Mock Developer List
Same list shared with cycles board:

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
   - If assigning: `PATCH /api/tasks/:filename` with `claimed_by: id` and `claimed_at: new Date().toISOString()`
   - If unassigning: `PATCH /api/tasks/:filename` with `claimed_by: ""` and `claimed_at: ""`
4. Update card UI immediately (optimistic)

---

## Server API Endpoints

### GET /api/tasks

Returns all task files as JSON.

**Response:**
```json
[
  {
    "filename": "task_one.md",
    "title": "Task one",
    "status": "done",
    "claimed_by": "RoberRaf",
    "claimed_at": "2026-04-06T12:00:00Z"
  }
]
```

**Logic:**
1. Read all `*.md` files in `tasks/` directory
2. Parse YAML frontmatter (split on `---` delimiters)
3. Return sorted by filename ascending

### PATCH /api/tasks/:filename

Updates frontmatter fields in a task file.

**Request body:**
```json
{
  "status": "in-progress",
  "claimed_by": "AhmadDev",
  "claimed_at": "2026-04-07T10:00:00Z"
}
```

**Logic:**
1. Read the file
2. Split on `---` delimiters to isolate frontmatter
3. Parse YAML, merge only the provided fields
4. Serialize frontmatter back to YAML
5. Rejoin with original body content (preserve body exactly as-is)
6. Write file

**Response:** `{ "ok": true }` or `{ "error": "message" }` with 4xx/5xx status

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing `status` field | Default to `todo` |
| Unrecognized status value | Place card in "Todo" column, log warning |
| Empty tasks directory | Show centered message: "No tasks yet" |
| File read/write error | Toast notification, revert optimistic UI |
| Filename with spaces | URL-encode in API calls |
| Missing `title` field | Use filename without extension as title |

---

## UI Layout

```
+----------------------------------------------------------+
|  FLOW Dashboard          [Cycles] [Tasks]    [Refresh]   |
+----------------------------------------------------------+
|  | Todo     | In Progress | Done      | Blocked          |
|  |  (1)     |    (0)      |  (1)      |   (0)            |
|  | [card]   |             | [card]    |                  |
|  |          |             |           |                  |
+----------------------------------------------------------+
```

- Same top bar and tab toggle as cycles board
- Four columns instead of seven — cards are wider
- Scroll behavior same as cycles board

---

## Shared Infrastructure

This spec shares the following with the Cycles board:

| Component | File | What's shared |
|-----------|------|---------------|
| Board renderer | `js/board.js` | Column rendering, card DnD, drop zones |
| API client | `js/api.js` | `fetchItems()`, `patchItem()` wrappers |
| Styles | `css/styles.css` | Card base styles, column layout, top bar |
| Developer list | `js/app.js` | `DEVELOPERS` array, assignment dropdown |
| Server | `server.js` | Express app, frontmatter parse/write utils |

### Board.js Configuration

The shared board renderer should accept a config object per mode:

```javascript
// Tasks board config
{
  mode: "tasks",
  apiBase: "/api/tasks",
  columns: [
    { id: "todo", label: "Todo", color: "#9E9E9E" },
    { id: "in-progress", label: "In Progress", color: "#2196F3" },
    { id: "done", label: "Done", color: "#4CAF50" },
    { id: "blocked", label: "Blocked", color: "#F44336" }
  ],
  cardFields: ["title", "status", "claimed_by", "filename"],
  statusKey: "status"
}
```

---

## Tech Stack

- **Frontend**: Vanilla HTML + CSS + JavaScript (no frameworks)
- **Backend**: Node.js with Express
- **YAML parsing**: `js-yaml` package (server-side only)
- **No database**: Files are the source of truth

---

## Dashboard File Structure

```
dashboard/
  specs/
    spec-cycles-board.md    # This file's counterpart
    spec-tasks-board.md     # This file
  index.html                # Single page, both board modes
  css/
    styles.css              # All styling
  js/
    app.js                  # Entry point, tab switching, constants
    board.js                # Shared board renderer (columns, cards, DnD)
    api.js                  # Fetch wrappers for GET/PATCH
  server.js                 # Node.js Express server
  package.json              # Dependencies: express, js-yaml, cors
```
