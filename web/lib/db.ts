import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_JSON_PATH = path.join(PROJECT_ROOT, 'db.json');
const SQLITE_DB_PATH = path.join(PROJECT_ROOT, 'data.db');

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password?: string; // Hashed, optional when returning to client
  email?: string;
  phone?: string;
  role: UserRole;
  created_at: string;
}

export interface Database {
  users: User[];
  songs: any[];
  albums: any[];
  artists: any[];
  playlists: any[];
}

// SQLite connection
let sqliteDB: Database.Database | null = null;

export function getSQLiteDB() {
  if (!sqliteDB) {
    // Ensure directory exists if needed, but PROJECT_ROOT should exist
    sqliteDB = new Database(SQLITE_DB_PATH);
    
    // Initialize users table
    sqliteDB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT
      )
    `);

    // Seed admin user if not exists
    const stmt = sqliteDB.prepare('SELECT * FROM users WHERE username = ?');
    const admin = stmt.get('admin');
    
    if (!admin) {
      console.log('Seeding admin user in SQLite...');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      const insert = sqliteDB.prepare('INSERT INTO users (id, username, password, email, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insert.run(
        uuidv4(), 
        'admin', 
        hashedPassword, 
        'admin@example.com', 
        '13800000000', 
        'admin', 
        new Date().toISOString()
      );
      console.log('Admin user seeded successfully.');
    }
  }
  return sqliteDB;
}

export function findUserByIdentifier(identifier: string): User | undefined {
  const db = getSQLiteDB();
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?');
  return stmt.get(identifier, identifier, identifier) as User | undefined;
}

export function findUserById(id: string): User | undefined {
  const db = getSQLiteDB();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function checkUserConflict(username: string, email?: string, phone?: string): boolean {
  const db = getSQLiteDB();
  const conditions = ['username = ?'];
  const params: any[] = [username];
  
  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }
  
  if (phone) {
    conditions.push('phone = ?');
    params.push(phone);
  }
  
  const query = `SELECT 1 FROM users WHERE ${conditions.join(' OR ')}`;
  const stmt = db.prepare(query);
  return !!stmt.get(...params);
}

export function createUser(user: User): void {
  const db = getSQLiteDB();
  const stmt = db.prepare('INSERT INTO users (id, username, password, email, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(user.id, user.username, user.password, user.email || null, user.phone || null, user.role, user.created_at);
}

// Legacy JSON DB functions for other data
export async function getDB(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_JSON_PATH, 'utf-8');
    const db = JSON.parse(data);
    if (!db.users) {
      db.users = [];
    }
    return db as Database;
  } catch (error) {
    console.error('Error reading DB:', error);
    return { users: [], songs: [], albums: [], artists: [], playlists: [] };
  }
}

export async function saveDB(db: Database): Promise<void> {
  await fs.writeFile(DB_JSON_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
