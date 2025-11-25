import { Pool } from "pg";
import Database from "better-sqlite3";
import path from "path";

let pgPool: Pool | null = null;
let sqliteDb: Database.Database | null = null;

const isProduction = process.env.NODE_ENV === "production";
const useSqlite = !process.env.DATABASE_URL || process.env.USE_SQLITE === "true";

// SQLite setup
function getSqliteDb() {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), "hippo-chats.db");
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
  }
  return sqliteDb;
}

// PostgreSQL setup
function getPostgresDb() {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    pgPool = new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    });
  }

  return pgPool;
}

export async function initDb() {
  if (useSqlite) {
    const db = getSqliteDb();
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_chats (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        trip TEXT NOT NULL,
        messages TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    const db = getPostgresDb();
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS shared_chats (
        id VARCHAR(12) PRIMARY KEY,
        mode VARCHAR(20) NOT NULL,
        trip JSONB NOT NULL,
        messages JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

export interface SharedChat {
  id: string;
  mode: string;
  trip: Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
  created_at: Date;
}

export async function saveSharedChat(
  id: string,
  mode: string,
  trip: Record<string, unknown>,
  messages: Array<Record<string, unknown>>
): Promise<void> {
  if (useSqlite) {
    const db = getSqliteDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO shared_chats (id, mode, trip, messages) 
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, mode, JSON.stringify(trip), JSON.stringify(messages));
  } else {
    const db = getPostgresDb();
    
    await db.query(
      `INSERT INTO shared_chats (id, mode, trip, messages) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE 
       SET mode = $2, trip = $3, messages = $4`,
      [id, mode, JSON.stringify(trip), JSON.stringify(messages)]
    );
  }
}

export async function getSharedChat(id: string): Promise<SharedChat | null> {
  if (useSqlite) {
    const db = getSqliteDb();
    const stmt = db.prepare(`
      SELECT id, mode, trip, messages, created_at 
      FROM shared_chats 
      WHERE id = ?
    `);
    
    const row = stmt.get(id) as {
      id: string;
      mode: string;
      trip: string;
      messages: string;
      created_at: string;
    } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      mode: row.mode,
      trip: JSON.parse(row.trip),
      messages: JSON.parse(row.messages),
      created_at: new Date(row.created_at)
    };
  } else {
    const db = getPostgresDb();
    
    const result = await db.query(
      `SELECT id, mode, trip, messages, created_at 
       FROM shared_chats 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      mode: row.mode,
      trip: row.trip,
      messages: row.messages,
      created_at: row.created_at
    };
  }
}
