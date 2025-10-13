import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const body = await request.json();
    const { title, position } = body;

    // Check if user has access to the board
    const list = await db.list.findFirst({
      where: { id: listId },
      include: {
        board: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = list.board.ownerId === user.id || 
      list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedList = await db.list.update({
      where: { id: listId },
      data: { title, position }
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    // Check if user has access to the board
    const list = await db.list.findFirst({
      where: { id: listId },
      include: {
        board: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = list.board.ownerId === user.id || 
      list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.list.delete({
      where: { id: listId }
    });

    return NextResponse.json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
