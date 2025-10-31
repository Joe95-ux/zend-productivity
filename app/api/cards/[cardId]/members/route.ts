import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { cardId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Verify the user has access to the card
    const card = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          }
        }
      },
      include: {
        list: {
          include: {
            board: true
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found or unauthorized" }, { status: 404 });
    }

    // Check if card has a list and board
    if (!card.list || !card.list.board) {
      return NextResponse.json({ error: "Board not found for card" }, { status: 404 });
    }

    const board = card.list.board;

    // Verify the user to be assigned is a member of the board
    const boardMember = await db.member.findFirst({
      where: {
        boardId: board.id,
        userId: userId
      }
    });

    if (!boardMember && board.ownerId !== userId) {
      return NextResponse.json({ error: "User is not a member of this board" }, { status: 400 });
    }

    // Update the card with the assigned user
    const updatedCard = await db.card.update({
      where: { id: cardId },
      data: { assignedTo: userId },
      include: {
        labels: true,
        comments: {
          include: {
            user: true
          }
        },
        checklists: {
          include: {
            items: true
          }
        }
      }
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error assigning member to card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { cardId } = await params;

    // Verify the user has access to the card
    const card = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found or unauthorized" }, { status: 404 });
    }

    // Remove the assigned user
    const updatedCard = await db.card.update({
      where: { id: cardId },
      data: { assignedTo: null },
      include: {
        labels: true,
        comments: {
          include: {
            user: true
          }
        },
        checklists: {
          include: {
            items: true
          }
        }
      }
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error removing member from card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
