import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/user/subscription - Get current user's subscription
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: {
        plan: true,
        status: true,
      },
    });

    return NextResponse.json({
      plan: subscription?.plan || "FREE",
      status: subscription?.status || "active",
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { plan: "FREE", status: "active" },
      { status: 200 }
    );
  }
}

