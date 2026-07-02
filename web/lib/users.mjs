import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, '..', 'users.json');

// Serialize all mutations: two concurrent registrations would otherwise both
// read the same users array and the second write would drop the first user.
let writeQueue = Promise.resolve();
function enqueue(task) {
  const run = writeQueue.then(task, task);
  // keep the chain alive even if a task rejects
  writeQueue = run.catch(() => {});
  return run;
}

function readUsers() {
  if (!existsSync(USERS_FILE)) return [];
  const raw = readFileSync(USERS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('expected an array');
    return parsed;
  } catch (e) {
    throw new Error(`users.json is corrupted (${e.message}). Inspect ${USERS_FILE} or restore from a backup before continuing.`);
  }
}

function writeUsers(users) {
  // Atomic: write to a temp file then rename, so a crash mid-write can never
  // leave users.json truncated/corrupted (readUsers hard-fails on bad JSON).
  const tmp = `${USERS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(users, null, 2));
  renameSync(tmp, USERS_FILE);
}

export function getUserDataPath(userId) {
  return join(__dirname, '..', 'user-data', userId);
}

export async function createUser(username, password) {
  const hash = await bcrypt.hash(password, 12);
  return enqueue(() => {
    const users = readUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already taken');
    }
    const user = {
      id: randomBytes(8).toString('hex'),
      username,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeUsers(users);
    return user;
  });
}

export async function authenticate(username, password) {
  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error('Invalid username or password');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid username or password');
  return user;
}

export function getUser(userId) {
  const users = readUsers();
  return users.find(u => u.id === userId) || null;
}

export function listUsers() {
  return readUsers().map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }));
}
