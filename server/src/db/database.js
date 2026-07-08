import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'gamefield.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', DB_PATH);
  }
});

// Helper to run queries as promises
export const queryRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const queryAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const queryGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize database schema
export const initDatabase = async () => {
  // Create users table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator'
    )
  `);

  // Create incidents table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      triggered_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);

  // Seed demo users for all roles
  const demoUsers = [
    { username: 'admin',     password: 'admin123', role: 'operator' },
    { username: 'fan_demo',  password: 'fan2026',  role: 'fan'      },
    { username: 'staff_001', password: 'staff2026', role: 'staff'   },
  ];

  for (const user of demoUsers) {
    try {
      const existing = await queryGet(`SELECT id FROM users WHERE username = ?`, [user.username]);
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        await queryRun(
          `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
          [user.username, hashedPassword, user.role]
        );
        console.log(`[DB] Seeded ${user.role} user: username=${user.username}, password=${user.password}`);
      }
    } catch (err) {
      console.error(`[DB] Error seeding user ${user.username}:`, err.message);
    }
  }
};

export default db;
