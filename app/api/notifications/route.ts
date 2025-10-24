import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/notifications - Get notifications for the current user
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Use Promise.all to run queries in parallel for better performance
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
          boardId: true,
          cardId: true
        }
      }),
      db.notification.count({
        where: { 
          userId: user.id,
          isRead: false 
        }
      })
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notifications as read
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

    const { notificationIds } = await request.json();

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id
        },
        data: { isRead: true }
      });
    } else {
      // Mark all notifications as read
      await db.notification.updateMany({
        where: { 
          userId: user.id,
          isRead: false 
        },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
