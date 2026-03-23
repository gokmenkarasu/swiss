import { NextResponse } from "next/server";
import { initPostsTable, getPostingSchedule } from "@/lib/db";

export async function GET() {
  try {
    await initPostsTable();
    const data = await getPostingSchedule();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
