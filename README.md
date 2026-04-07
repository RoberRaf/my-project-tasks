# FLOW Dashboard

A lightweight, Git-friendly task and cycle management dashboard. Teams can manage work using Kanban-style boards with two modes: **Tasks** (todo, in-progress, done, blocked) and **Cycles** (a multi-stage development workflow). All data is stored as Markdown files with YAML frontmatter — no database required.

## Features

- **Dual Kanban Boards** — Tasks (4-column) and Cycles (7-stage workflow)
- **Team Management** — assign and track task ownership across developers
- **Search & Filter** — filter by assignee and search across all content
- **Git Integration** — pull/push directly from the dashboard UI
- **Dual Deployment** — run as a dynamic Express server or a static GitHub Pages site
- **Read-Only Fallback** — automatically switches to read-only mode when served statically

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Data:** Markdown files with YAML frontmatter
- **Deployment:** GitHub Pages (static) or Express server (dynamic)

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- npm (comes with Node.js)
- Git

## Platform-Specific Instructions

### macOS

1. **Install Node.js** — using [Homebrew](https://brew.sh/):
   ```bash
   brew install node
   ```
2. **Clone and run:**
   ```bash
   git clone <your-repo-url>
   cd my-project-tasks/dashboard
   npm install
   npm start
   ```
3. Open **http://localhost:3000** in your browser.

### Windows

1. **Install Node.js** — download the Windows installer from [nodejs.org](https://nodejs.org/) and run it. Make sure "Add to PATH" is checked during installation.
2. **Open Command Prompt or PowerShell** and run:
   ```cmd
   git clone <your-repo-url>
   cd my-project-tasks\dashboard
   npm install
   npm start
   ```
3. Open **http://localhost:3000** in your browser.

> **Note:** On Windows, if you encounter permission issues with script execution in PowerShell, run:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

## Static Build (GitHub Pages)

To build the static version for deployment:

```bash
cd dashboard
npm install --production
node ../scripts/build-static.js
```

This generates JSON files in `dashboard/data/` from the Markdown task and cycle files. The GitHub Actions workflow handles this automatically on push to `main`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port for the Express backend |

## Project Structure

```
my-project-tasks/
├── dashboard/
│   ├── index.html          # Entry point
│   ├── server.js           # Express backend
│   ├── package.json        # Dependencies and scripts
│   ├── js/                 # Client-side JavaScript
│   │   ├── api.js          # API layer with static fallback
│   │   ├── board.js        # Kanban board rendering
│   │   └── app.js          # Main app logic
│   ├── css/
│   │   └── styles.css      # Styling
│   └── data/               # Generated static JSON (gitignored)
├── tasks/                  # Task Markdown files
├── cycles/                 # Cycle Markdown files
├── scripts/
│   └── build-static.js     # Static data builder
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deployment
```

## Data Format

Tasks and cycles are Markdown files with YAML frontmatter:

```markdown
---
title: Example Task
status: todo
claimed_by: null
claimed_at: null
---

Task description goes here.
```

**Task statuses:** `todo`, `in-progress`, `done`, `blocked`

**Cycle statuses:** `proposed`, `g1-committed`, `running`, `g2-pulse`, `g3-resolve`, `killed`, `done`
