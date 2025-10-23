import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceListId, targetListId, boardId } = body;

    if (!sourceListId || !targetListId || !boardId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (sourceListId === targetListId) {
      return NextResponse.json({ error: "Source and target lists cannot be the same" }, { status: 400 });
    }

    // Get all cards from the source list
    const sourceCards = await db.card.findMany({
      where: { listId: sourceListId },
      orderBy: { position: "asc" }
    });

    if (sourceCards.length === 0) {
      return NextResponse.json({ error: "No cards to move" }, { status: 400 });
    }

    // Get the current highest position in the target list
    const targetListCards = await db.card.findMany({
      where: { listId: targetListId },
      orderBy: { position: "desc" },
      take: 1
    });

    const nextPosition = targetListCards.length > 0 ? targetListCards[0].position + 1 : 1;

    // Move all cards to the target list sequentially to avoid deadlocks
    for (let i = 0; i < sourceCards.length; i++) {
      const card = sourceCards[i];
      await db.card.update({
        where: { id: card.id },
        data: {
          listId: targetListId,
          position: nextPosition + i
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving all cards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
