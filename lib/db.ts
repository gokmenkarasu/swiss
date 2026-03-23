import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default sql;

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS instagram_snapshots (
      id          SERIAL PRIMARY KEY,
      username    VARCHAR(100) NOT NULL,
      full_name   VARCHAR(200),
      followers   INTEGER NOT NULL,
      following   INTEGER,
      fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      snap_date   DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE (username, snap_date)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_snapshots_username_date
    ON instagram_snapshots (username, snap_date DESC)
  `;
}

export interface Snapshot {
  username: string;
  full_name: string;
  followers: number;
  following: number;
  snap_date: string;
  fetched_at: string;
}

export async function upsertSnapshot(
  username: string,
  fullName: string,
  followers: number,
  following: number
) {
  await sql`
    INSERT INTO instagram_snapshots (username, full_name, followers, following)
    VALUES (${username}, ${fullName}, ${followers}, ${following})
    ON CONFLICT (username, snap_date)
    DO UPDATE SET
      full_name  = EXCLUDED.full_name,
      followers  = EXCLUDED.followers,
      following  = EXCLUDED.following,
      fetched_at = NOW()
  `;
}

export async function getHistory(days: number): Promise<Snapshot[]> {
  const rows = await sql`
    SELECT username, full_name, followers, following,
           snap_date::text, fetched_at::text
    FROM instagram_snapshots
    WHERE snap_date >= CURRENT_DATE - ${days}::int
    ORDER BY username, snap_date ASC
  `;
  return rows as Snapshot[];
}

export async function getLatestSnapshots(): Promise<Snapshot[]> {
  const rows = await sql`
    SELECT DISTINCT ON (username)
      username, full_name, followers, following,
      snap_date::text, fetched_at::text
    FROM instagram_snapshots
    ORDER BY username, snap_date DESC
  `;
  return rows as Snapshot[];
}
