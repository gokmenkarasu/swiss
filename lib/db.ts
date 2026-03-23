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

// ─── CONTENT STATS ───────────────────────────────────────────────────────────

export async function initContentStatsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS instagram_content_stats (
      id             SERIAL PRIMARY KEY,
      username       VARCHAR(100) NOT NULL,
      posts_scraped  INTEGER,
      photo_count    INTEGER,
      video_count    INTEGER,
      carousel_count INTEGER,
      avg_likes      NUMERIC(10,2),
      avg_comments   NUMERIC(10,2),
      avg_views      NUMERIC(10,2),
      engagement_rate NUMERIC(6,4),
      snap_date      DATE NOT NULL DEFAULT CURRENT_DATE,
      fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (username, snap_date)
    )
  `;
}

export interface ContentStat {
  username: string;
  posts_scraped: number;
  photo_count: number;
  video_count: number;
  carousel_count: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  engagement_rate: number;
  snap_date: string;
  fetched_at: string;
}

export async function upsertContentStat(data: Omit<ContentStat, "snap_date" | "fetched_at">) {
  await sql`
    INSERT INTO instagram_content_stats
      (username, posts_scraped, photo_count, video_count, carousel_count,
       avg_likes, avg_comments, avg_views, engagement_rate)
    VALUES
      (${data.username}, ${data.posts_scraped}, ${data.photo_count},
       ${data.video_count}, ${data.carousel_count},
       ${data.avg_likes}, ${data.avg_comments}, ${data.avg_views},
       ${data.engagement_rate})
    ON CONFLICT (username, snap_date)
    DO UPDATE SET
      posts_scraped   = EXCLUDED.posts_scraped,
      photo_count     = EXCLUDED.photo_count,
      video_count     = EXCLUDED.video_count,
      carousel_count  = EXCLUDED.carousel_count,
      avg_likes       = EXCLUDED.avg_likes,
      avg_comments    = EXCLUDED.avg_comments,
      avg_views       = EXCLUDED.avg_views,
      engagement_rate = EXCLUDED.engagement_rate,
      fetched_at      = NOW()
  `;
}

export async function getLatestContentStats(): Promise<ContentStat[]> {
  const rows = await sql`
    SELECT DISTINCT ON (username)
      username, posts_scraped, photo_count, video_count, carousel_count,
      avg_likes, avg_comments, avg_views, engagement_rate,
      snap_date::text, fetched_at::text
    FROM instagram_content_stats
    ORDER BY username, snap_date DESC
  `;
  return rows as ContentStat[];
}
