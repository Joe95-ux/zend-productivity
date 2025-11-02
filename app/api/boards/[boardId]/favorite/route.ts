import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/boards/[boardId]/favorite - Add board to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

    // Check if board exists
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: { id: true }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const boardWithAccess = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      },
      select: { id: true }
    });

    if (!boardWithAccess) {
      return NextResponse.json({ error: "Unauthorized to favorite this board" }, { status: 403 });
    }

    // Check if favorite already exists
    const existingFavorite = await db.favoriteBoard.findUnique({
      where: {
        userId_boardId: {
          userId: user.id,
          boardId: boardId
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json({ error: "Board is already favorited" }, { status: 409 });
    }

    // Create the favorite
    const favorite = await db.favoriteBoard.create({
      data: {
        userId: user.id,
        boardId: boardId
      },
      include: {
        board: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Error adding board to favorites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId]/favorite - Remove board from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

    // Check if favorite exists
    const favorite = await db.favoriteBoard.findUnique({
      where: {
        userId_boardId: {
          userId: user.id,
          boardId: boardId
        }
      }
    });

    if (!favorite) {
      return NextResponse.json({ error: "Board is not favorited" }, { status: 404 });
    }

    // Delete the favorite
    await db.favoriteBoard.delete({
      where: {
        id: favorite.id
      }
    });

    return NextResponse.json({ message: "Board removed from favorites" }, { status: 200 });
  } catch (error) {
    console.error("Error removing board from favorites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/boards/[boardId]/favorite - Check if board is favorited
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

    // Check if favorite exists
    const favorite = await db.favoriteBoard.findUnique({
      where: {
        userId_boardId: {
          userId: user.id,
          boardId: boardId
        }
      }
    });

    return NextResponse.json({ isFavorite: !!favorite }, { status: 200 });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

