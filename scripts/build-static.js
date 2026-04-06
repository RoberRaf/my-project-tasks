const fs = require('fs');
const path = require('path');
const yaml = require(path.join(__dirname, '..', 'dashboard', 'node_modules', 'js-yaml'));

const ROOT = path.join(__dirname, '..');
const TASKS_DIR = path.join(ROOT, 'tasks');
const CYCLES_DIR = path.join(ROOT, 'cycles');
const OUT_DIR = path.join(ROOT, 'dashboard', 'data');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = yaml.load(match[1]) || {};
  return { data, body: match[2] };
}

function normalizeStr(val) {
  return val == null ? '' : String(val);
}

function extractBodyField(body, label) {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
  const match = body.match(regex);
  if (!match) return '';
  return match[1].trim().slice(0, 80);
}

function buildTasks() {
  if (!fs.existsSync(TASKS_DIR)) return [];
  return fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.md')).sort().map(filename => {
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
}

function buildCycles() {
  if (!fs.existsSync(CYCLES_DIR)) return [];
  return fs.readdirSync(CYCLES_DIR).filter(f => f.endsWith('.md')).sort().map(filename => {
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
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

fs.writeFileSync(path.join(OUT_DIR, 'tasks.json'), JSON.stringify(buildTasks(), null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'cycles.json'), JSON.stringify(buildCycles(), null, 2));

console.log(`Built static data → ${OUT_DIR}`);
