import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigest, sendWeeklyDigest } from "@/lib/email-digest";

// POST /api/cron/digest - Send digest emails (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await request.json();

    if (type === "daily") {
      await sendDailyDigest();
      return NextResponse.json({ success: true, message: "Daily digest sent" });
    } else if (type === "weekly") {
      await sendWeeklyDigest();
      return NextResponse.json({ success: true, message: "Weekly digest sent" });
    } else {
      return NextResponse.json({ error: "Invalid digest type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error sending digest emails:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
