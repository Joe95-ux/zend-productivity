import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// interface ReorderCardItem {
//   id: string;
//   position: number;
//   listId: string;
// }

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Invalid JSON in request body:", error);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { items, boardId } = body;

    if (!items || !boardId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Run sequential updates (avoids deadlocks)
    for (const card of items) {
      await db.card.update({
        where: { id: card.id },
        data: {
          position: card.position,
          listId: card.listId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering cards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}