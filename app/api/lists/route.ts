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
    const { title, boardId } = body;

    if (!title || !boardId) {
      return NextResponse.json({ error: "Title and boardId are required" }, { status: 400 });
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

    // Get the highest position in the board
    const lastList = await db.list.findFirst({
      where: { boardId },
      orderBy: { position: "desc" }
    });

    const position = lastList ? lastList.position + 1 : 0;

    const list = await db.list.create({
      data: {
        title,
        boardId,
        position
      }
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
