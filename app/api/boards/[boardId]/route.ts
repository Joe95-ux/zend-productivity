import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("GET /api/boards/[boardId]: No user found");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { boardId } = await params;
    
    if (!boardId) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
    }

    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                labels: true,
                comments: {
                  include: {
                    user: true
                  },
                  orderBy: { createdAt: "desc" }
                },
                checklists: {
                  include: {
                    items: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Invalid ObjectId")) {
        return NextResponse.json({ error: "Invalid board ID format" }, { status: 400 });
      }
      if (error.message.includes("connection")) {
        return NextResponse.json({ error: "Database connection error" }, { status: 503 });
      }
    }
    
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const body = await request.json();
    const { title, description } = body;

    const board = await db.board.findFirst({
      where: {
        id: boardId,
        ownerId: user.id
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found or unauthorized" }, { status: 404 });
    }

    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: { title, description },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        ownerId: user.id
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found or unauthorized" }, { status: 404 });
    }

    await db.board.delete({
      where: { id: boardId }
    });

    return NextResponse.json({ message: "Board deleted successfully" });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
