import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color, boardId } = await request.json();

    if (!name || !color || !boardId) {
      return NextResponse.json({ error: "Name, color, and boardId are required" }, { status: 400 });
    }

    // Verify the board exists and user has access
    const board = await db.board.findFirst({
      where: { id: boardId },
      include: {
        members: true
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = board.ownerId === user.id || 
      board.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the new board-scoped template label
    const newLabel = await db.boardLabel.create({
      data: {
        name,
        color,
        boardId
      }
    });

    return NextResponse.json(newLabel, { status: 201 });
  } catch (error) {
    console.error("Error creating label:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
    }

    // Get all board template labels for this board
    const labels = await db.boardLabel.findMany({
      where: { boardId },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
