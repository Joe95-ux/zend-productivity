import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listId, targetBoardId, position } = body;

    // Allow position 0 (valid when inserting at the start)
    if (!listId || !targetBoardId || position === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the list to move
    const listToMove = await db.list.findUnique({
      where: { id: listId },
      include: { board: true }
    });

    if (!listToMove) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to both boards
    const sourceBoard = await db.board.findFirst({
      where: { id: listToMove.boardId, ownerId: user.id }
    });

    const targetBoard = await db.board.findFirst({
      where: { id: targetBoardId, ownerId: user.id }
    });

    if (!sourceBoard || !targetBoard) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If moving to the same board, just update positions
    if (listToMove.boardId === targetBoardId) {
      const targetBoardLists = await db.list.findMany({
        where: { boardId: targetBoardId },
        orderBy: { position: "asc" }
      });

      // Remove the list from its current position
      const filteredLists = targetBoardLists.filter(list => list.id !== listId);
      
      // Insert at new position (position is already 0-based from frontend)
      const newPosition = position;
      filteredLists.splice(newPosition, 0, listToMove);

      // Update positions for all affected lists
      for (let i = 0; i < filteredLists.length; i++) {
        await db.list.update({
          where: { id: filteredLists[i].id },
          data: { position: i + 1 }
        });
      }
    } else {
      // Moving to a different board
      const targetBoardLists = await db.list.findMany({
        where: { boardId: targetBoardId },
        orderBy: { position: "asc" }
      });

      // Update positions in source board
      const sourceBoardLists = await db.list.findMany({
        where: { boardId: listToMove.boardId },
        orderBy: { position: "asc" }
      });

      const sourceFilteredLists = sourceBoardLists.filter(list => list.id !== listId);
      for (let i = 0; i < sourceFilteredLists.length; i++) {
        await db.list.update({
          where: { id: sourceFilteredLists[i].id },
          data: { position: i + 1 }
        });
      }

      // Insert at new position in target board (position is already 0-based from frontend)
      const newPosition = position;
      targetBoardLists.splice(newPosition, 0, listToMove);

      // Update positions for all lists in target board
      for (let i = 0; i < targetBoardLists.length; i++) {
        await db.list.update({
          where: { id: targetBoardLists[i].id },
          data: { 
            position: i + 1,
            boardId: targetBoardId // Move the list to the new board
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
