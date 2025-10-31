import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");
    const cardId = searchParams.get("cardId");

    if (!boardId) {
      return NextResponse.json({ error: "BoardId is required" }, { status: 400 });
    }

    // Check if user has access to the board
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found or unauthorized" }, { status: 404 });
    }

    const whereClause: { boardId: string; cardId?: string } = { boardId };
    
    // If cardId is provided, filter activities for that specific card
    if (cardId) {
      whereClause.cardId = cardId;
    }

    const activities = await db.activity.findMany({
      where: whereClause,
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
