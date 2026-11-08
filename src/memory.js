import fs from 'node:fs';
import path from 'node:path';
const memoryDir = path.resolve(process.cwd(), 'data/memories');
fs.mkdirSync(memoryDir, { recursive: true });
function fileFor(username) { return path.join(memoryDir, username.toLowerCase() + '.json'); }
export function loadMemory(username) {
  const file = fileFor(username);
  if (!fs.existsSync(file)) return { notes: [], relationships: {}, lastSeen: null };
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return { notes: [], relationships: {}, lastSeen: null }; }
}
export function remember(username, note) {
  const memory = loadMemory(username);
  memory.notes.push({ at: Date.now(), text: String(note).slice(0, 180) });
  if (memory.notes.length > 20) memory.notes.splice(0, memory.notes.length - 20);
  memory.lastSeen = Date.now();
  fs.writeFileSync(fileFor(username), JSON.stringify(memory));
}
export function rememberRelationship(username, player, score) {
  const memory = loadMemory(username);
  memory.relationships[player] = Math.max(-100, Math.min(100, score));
  fs.writeFileSync(fileFor(username), JSON.stringify(memory));
}