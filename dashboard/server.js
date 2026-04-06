const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(__dirname));

// --- Frontmatter helpers ---

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = yaml.load(match[1]) || {};
  return { data, body: match[2] };
}

function serializeFrontmatter(data, body) {
  const yamlStr = yaml.dump(data, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlStr}\n---\n${body}`;
}

function normalizeStr(val) {
  return val == null ? '' : String(val);
}

// --- Tasks API ---

const TASKS_DIR = path.join(__dirname, '..', 'tasks');

app.get('/api/tasks', (req, res) => {
  try {
    if (!fs.existsSync(TASKS_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.md')).sort();
    const tasks = files.map(filename => {
      const content = fs.readFileSync(path.join(TASKS_DIR, filename), 'utf-8');
      const { data, body } = parseFrontmatter(content);
      return {
        filename,
        title: normalizeStr(data.title) || filename.replace(/\.md$/, ''),
        status: normalizeStr(data.status) || 'todo',
        claimed_by: normalizeStr(data.claimed_by),
        claimed_at: normalizeStr(data.claimed_at),
        body
      };
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(TASKS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, body } = parseFrontmatter(content);

    const allowed = ['status', 'claimed_by', 'claimed_at'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    fs.writeFileSync(filePath, serializeFrontmatter(data, body), 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Cycles API ---

const CYCLES_DIR = path.join(__dirname, '..', 'cycles');

function extractBodyField(body, label) {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
  const match = body.match(regex);
  if (!match) return '';
  return match[1].trim().slice(0, 80);
}

app.get('/api/cycles', (req, res) => {
  try {
    if (!fs.existsSync(CYCLES_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(CYCLES_DIR).filter(f => f.endsWith('.md')).sort();
    const cycles = files.map(filename => {
      const content = fs.readFileSync(path.join(CYCLES_DIR, filename), 'utf-8');
      const { data, body } = parseFrontmatter(content);
      return {
        filename,
        title: normalizeStr(data.title) || filename.replace(/\.md$/, ''),
        status: normalizeStr(data.status) || 'Proposed',
        mode: normalizeStr(data.mode) || 'OUTCOME',
        claimed_by: normalizeStr(data.claimed_by),
        claimed_at: normalizeStr(data.claimed_at),
        killCondition: extractBodyField(body, 'Kill Condition'),
        targetMetric: extractBodyField(body, 'Target Metric'),
        body
      };
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/cycles/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(CYCLES_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, body } = parseFrontmatter(content);

    const allowed = ['status', 'claimed_by', 'claimed_at'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    fs.writeFileSync(filePath, serializeFrontmatter(data, body), 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FLOW Dashboard running at http://localhost:${PORT}`);
});
