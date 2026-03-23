import { NextRequest, NextResponse } from "next/server";
import { initDb, getHistory, getLatestSnapshots, upsertSnapshot } from "@/lib/db";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
  try {
    await initDb();
    const [history, latest] = await Promise.all([getHistory(days), getLatestSnapshots()]);
    return NextResponse.json({ history, latest });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: manual backfill — insert a historical snapshot for a specific date
export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { username, fullName, followers, following, date } = await req.json();
    if (!username || !followers || !date) {
      return NextResponse.json({ error: "username, followers, date required" }, { status: 400 });
    }

    // Use raw SQL for custom date insertion
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO instagram_snapshots (username, full_name, followers, following, snap_date)
      VALUES (${username}, ${fullName ?? username}, ${followers}, ${following ?? 0}, ${date}::date)
      ON CONFLICT (username, snap_date)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,
        fetched_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
