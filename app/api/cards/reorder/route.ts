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
    const { items, boardId } = body;

    if (!items || !boardId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update all cards in a transaction
    const transaction = items.map((card: any) => 
      db.card.update({
        where: { id: card.id },
        data: { 
          position: card.position,
          listId: card.listId 
        },
      })
    );

    await db.$transaction(transaction);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering cards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
