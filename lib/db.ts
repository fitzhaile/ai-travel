import { Pool } from "pg";

let pool: Pool | null = null;

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

export async function initDb() {
  const db = getDb();
  
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
  const db = getDb();
  
  await db.query(
    `INSERT INTO shared_chats (id, mode, trip, messages) 
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE 
     SET mode = $2, trip = $3, messages = $4`,
    [id, mode, JSON.stringify(trip), JSON.stringify(messages)]
  );
}

export async function getSharedChat(id: string): Promise<SharedChat | null> {
  const db = getDb();
  
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

