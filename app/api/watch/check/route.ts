import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/watch/check - Check if user is watching a specific item
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
    const boardId = searchParams.get("boardId");
    const listId = searchParams.get("listId");
    const cardId = searchParams.get("cardId");

    // Validate that at least one ID is provided
    if (!boardId && !listId && !cardId) {
      return NextResponse.json({ error: "At least one ID (boardId, listId, or cardId) is required" }, { status: 400 });
    }

    // Check if watch exists
    const watch = await db.watch.findFirst({
      where: {
        userId: user.id,
        boardId: boardId || null,
        listId: listId || null,
        cardId: cardId || null
      }
    });

    return NextResponse.json({ isWatching: !!watch, watchId: watch?.id });
  } catch (error) {
    console.error("Error checking watch status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
