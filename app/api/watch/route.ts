import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/watch - Get all watches for the current user
export async function GET() {
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

    const watches = await db.watch.findMany({
      where: { userId: user.id },
      include: {
        board: {
          select: { id: true, title: true }
        },
        list: {
          select: { id: true, title: true, board: { select: { id: true, title: true } } }
        },
        card: {
          select: { 
            id: true, 
            title: true, 
            list: { 
              select: { 
                id: true, 
                title: true, 
                board: { select: { id: true, title: true } } 
              } 
            } 
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(watches);
  } catch (error) {
    console.error("Error fetching watches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/watch - Create a new watch
export async function POST(request: NextRequest) {
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

    const { boardId, listId, cardId } = await request.json();

    // Validate that at least one ID is provided
    if (!boardId && !listId && !cardId) {
      return NextResponse.json({ error: "At least one ID (boardId, listId, or cardId) is required" }, { status: 400 });
    }

    // Check if watch already exists
    const existingWatch = await db.watch.findFirst({
      where: {
        userId: user.id,
        boardId: boardId || null,
        listId: listId || null,
        cardId: cardId || null
      }
    });

    if (existingWatch) {
      return NextResponse.json({ error: "Already watching this item" }, { status: 409 });
    }

    // Create the watch
    const watch = await db.watch.create({
      data: {
        userId: user.id,
        boardId: boardId || null,
        listId: listId || null,
        cardId: cardId || null
      },
      include: {
        board: {
          select: { id: true, title: true }
        },
        list: {
          select: { id: true, title: true, board: { select: { id: true, title: true } } }
        },
        card: {
          select: { 
            id: true, 
            title: true, 
            list: { 
              select: { 
                id: true, 
                title: true, 
                board: { select: { id: true, title: true } } 
              } 
            } 
          }
        }
      }
    });

    return NextResponse.json(watch);
  } catch (error) {
    console.error("Error creating watch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/watch - Remove a watch
export async function DELETE(request: NextRequest) {
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

    const { boardId, listId, cardId } = await request.json();

    // Find and delete the watch
    const watch = await db.watch.findFirst({
      where: {
        userId: user.id,
        boardId: boardId || null,
        listId: listId || null,
        cardId: cardId || null
      }
    });

    if (!watch) {
      return NextResponse.json({ error: "Watch not found" }, { status: 404 });
    }

    await db.watch.delete({
      where: { id: watch.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting watch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
