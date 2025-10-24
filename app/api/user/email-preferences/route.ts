import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/user/email-preferences - Get user's email preferences
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: {
        emailNotifications: true,
        emailFrequency: true,
        notifyOwnActions: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching email preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/user/email-preferences - Update user's email preferences
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { emailNotifications, emailFrequency, notifyOwnActions } = await request.json();

    // Validate email frequency
    const validFrequencies = ["immediate", "daily", "weekly"];
    if (emailFrequency && !validFrequencies.includes(emailFrequency)) {
      return NextResponse.json({ 
        error: "Invalid email frequency. Must be one of: immediate, daily, weekly" 
      }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        emailFrequency: emailFrequency || undefined,
        notifyOwnActions: notifyOwnActions !== undefined ? notifyOwnActions : undefined
      },
      select: {
        emailNotifications: true,
        emailFrequency: true,
        notifyOwnActions: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating email preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
