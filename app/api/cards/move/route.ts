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
    console.log("Move card API received:", body);
    const { cardId, targetBoardId, targetListId, position } = body;
    console.log("Position received:", position, "Type:", typeof position);

    if (!cardId || !targetBoardId || !targetListId || position === undefined) {
      console.log("Missing fields:", { cardId, targetBoardId, targetListId, position });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the card to move
    const cardToMove = await db.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: true } } }
    });

    if (!cardToMove) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if card has a list
    if (!cardToMove?.list) {
      return NextResponse.json({ error: "List not found for card" }, { status: 404 });
    }

    // Check if user has access to both boards
    const sourceBoard = await db.board.findFirst({
      where: { id: cardToMove?.list?.boardId, ownerId: user.id }
    });

    const targetBoard = await db.board.findFirst({
      where: { id: targetBoardId, ownerId: user.id }
    });

    if (!sourceBoard || !targetBoard) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If moving to the same list, just update positions
    if (cardToMove.listId === targetListId) {
      const targetListCards = await db.card.findMany({
        where: { listId: targetListId },
        orderBy: { position: "asc" }
      });

      // Remove the card from its current position
      const filteredCards = targetListCards.filter(card => card.id !== cardId);
      
      // Insert at new position (position is already 0-based from frontend)
      const newPosition = position;
      filteredCards.splice(newPosition, 0, cardToMove);

      // Update positions for all affected cards
      for (let i = 0; i < filteredCards.length; i++) {
        await db.card.update({
          where: { id: filteredCards[i].id },
          data: { position: i + 1 }
        });
      }
    } else {
      // Moving to a different list
      const targetListCards = await db.card.findMany({
        where: { listId: targetListId },
        orderBy: { position: "asc" }
      });

      // Update positions in source list
      const sourceListCards = await db.card.findMany({
        where: { listId: cardToMove.listId },
        orderBy: { position: "asc" }
      });

      const sourceFilteredCards = sourceListCards.filter(card => card.id !== cardId);
      for (let i = 0; i < sourceFilteredCards.length; i++) {
        await db.card.update({
          where: { id: sourceFilteredCards[i].id },
          data: { position: i + 1 }
        });
      }

      // Insert at new position in target list (position is already 0-based from frontend)
      const newPosition = position;
      targetListCards.splice(newPosition, 0, cardToMove);

      // Update positions for all cards in target list
      for (let i = 0; i < targetListCards.length; i++) {
        await db.card.update({
          where: { id: targetListCards[i].id },
          data: { 
            position: i + 1,
            listId: targetListId // Move the card to the new list
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
