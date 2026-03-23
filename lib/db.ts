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

// ─── INDIVIDUAL POSTS ────────────────────────────────────────────────────────

export async function initPostsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS instagram_posts (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(100) NOT NULL,
      post_id       VARCHAR(200) NOT NULL,
      post_type     VARCHAR(20),
      likes_count   INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count   INTEGER DEFAULT 0,
      posted_at     TIMESTAMPTZ,
      fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (username, post_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_posts_username_date
    ON instagram_posts (username, posted_at DESC)
  `;
}

export interface Post {
  username: string;
  post_id: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  posted_at: string;
}

export async function upsertPost(post: Omit<Post, never>) {
  await sql`
    INSERT INTO instagram_posts
      (username, post_id, post_type, likes_count, comments_count, views_count, posted_at)
    VALUES
      (${post.username}, ${post.post_id}, ${post.post_type},
       ${post.likes_count}, ${post.comments_count}, ${post.views_count},
       ${post.posted_at})
    ON CONFLICT (username, post_id)
    DO UPDATE SET
      post_type      = EXCLUDED.post_type,
      likes_count    = EXCLUDED.likes_count,
      comments_count = EXCLUDED.comments_count,
      views_count    = EXCLUDED.views_count,
      posted_at      = EXCLUDED.posted_at,
      fetched_at     = NOW()
  `;
}

export interface PostStats {
  username: string;
  total_posts: number;
  photo_count: number;
  video_count: number;
  carousel_count: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  engagement_rate: number;
  latest_post_at: string | null;
  oldest_post_at: string | null;
}

export async function getPostStats(days: number): Promise<PostStats[]> {
  const rows = await sql`
    WITH post_agg AS (
      SELECT
        username,
        COUNT(*)::int                                                      AS total_posts,
        COUNT(*) FILTER (WHERE post_type = 'Image')::int                  AS photo_count,
        COUNT(*) FILTER (WHERE post_type = 'Video')::int                  AS video_count,
        COUNT(*) FILTER (WHERE post_type = 'Sidecar')::int                AS carousel_count,
        ROUND(AVG(likes_count), 2)                                        AS avg_likes,
        ROUND(AVG(comments_count), 2)                                     AS avg_comments,
        ROUND(AVG(CASE WHEN views_count > 0 THEN views_count END), 2)     AS avg_views,
        MAX(posted_at)::text                                              AS latest_post_at,
        MIN(posted_at)::text                                              AS oldest_post_at
      FROM instagram_posts
      WHERE posted_at >= NOW() - (${days}::int * INTERVAL '1 day')
      GROUP BY username
    ),
    latest_followers AS (
      SELECT DISTINCT ON (username) username, followers
      FROM instagram_snapshots
      ORDER BY username, snap_date DESC
    )
    SELECT
      p.*,
      CASE
        WHEN COALESCE(f.followers, 0) > 0
        THEN ROUND(((p.avg_likes + p.avg_comments) / f.followers::numeric) * 100, 4)
        ELSE 0
      END AS engagement_rate
    FROM post_agg p
    LEFT JOIN latest_followers f USING (username)
  `;
  return rows as PostStats[];
}

export async function getPostStatsByRange(from: string, to: string): Promise<PostStats[]> {
  const rows = await sql`
    WITH post_agg AS (
      SELECT
        username,
        COUNT(*)::int                                                      AS total_posts,
        COUNT(*) FILTER (WHERE post_type = 'Image')::int                  AS photo_count,
        COUNT(*) FILTER (WHERE post_type = 'Video')::int                  AS video_count,
        COUNT(*) FILTER (WHERE post_type = 'Sidecar')::int                AS carousel_count,
        ROUND(AVG(likes_count), 2)                                        AS avg_likes,
        ROUND(AVG(comments_count), 2)                                     AS avg_comments,
        ROUND(AVG(CASE WHEN views_count > 0 THEN views_count END), 2)     AS avg_views,
        MAX(posted_at)::text                                              AS latest_post_at,
        MIN(posted_at)::text                                              AS oldest_post_at
      FROM instagram_posts
      WHERE posted_at >= ${from}::date
        AND posted_at <  (${to}::date + INTERVAL '1 day')
      GROUP BY username
    ),
    latest_followers AS (
      SELECT DISTINCT ON (username) username, followers
      FROM instagram_snapshots
      ORDER BY username, snap_date DESC
    )
    SELECT
      p.*,
      CASE
        WHEN COALESCE(f.followers, 0) > 0
        THEN ROUND(((p.avg_likes + p.avg_comments) / f.followers::numeric) * 100, 4)
        ELSE 0
      END AS engagement_rate
    FROM post_agg p
    LEFT JOIN latest_followers f USING (username)
  `;
  return rows as PostStats[];
}

export async function getScrapedUsernames(): Promise<string[]> {
  // Returns usernames that have real posts OR have been attempted (even if 0 posts)
  const rows = await sql`
    SELECT username FROM instagram_posts
    UNION
    SELECT username FROM instagram_fetch_log
  `;
  return rows.map((r) => r.username as string);
}

export async function initFetchLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS instagram_fetch_log (
      username   VARCHAR(100) PRIMARY KEY,
      last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      posts_saved  INTEGER NOT NULL DEFAULT 0
    )
  `;
}

export async function logFetchAttempt(username: string, postsSaved: number) {
  await sql`
    INSERT INTO instagram_fetch_log (username, last_attempt, posts_saved)
    VALUES (${username}, NOW(), ${postsSaved})
    ON CONFLICT (username) DO UPDATE SET
      last_attempt = NOW(),
      posts_saved  = EXCLUDED.posts_saved
  `;
}

export async function getLatestFetchDate(username: string): Promise<string | null> {
  const rows = await sql`
    SELECT MAX(fetched_at)::text AS last_fetch
    FROM instagram_posts
    WHERE username = ${username}
  `;
  return rows[0]?.last_fetch ?? null;
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

export async function getPostingSchedule(): Promise<{ username: string; month: string; dow: number; count: number }[]> {
  const rows = await sql`
    SELECT
      username,
      TO_CHAR(posted_at, 'YYYY-MM')          AS month,
      EXTRACT(ISODOW FROM posted_at)::int    AS dow,
      COUNT(*)::int                          AS count
    FROM instagram_posts
    WHERE posted_at >= NOW() - INTERVAL '180 days'
    GROUP BY username, month, dow
    ORDER BY username, month, dow
  `;
  return rows as { username: string; month: string; dow: number; count: number }[];
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
