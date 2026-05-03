import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, '..', 'users.json');

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
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getUserDataPath(userId) {
  return join(__dirname, '..', 'user-data', userId);
}

export async function createUser(username, password) {
  const users = readUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already taken');
  }
  const hash = await bcrypt.hash(password, 12);
  const user = {
    id: randomBytes(8).toString('hex'),
    username,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return user;
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
