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
    const { title, description, listId, position } = body;

    if (!title || !listId) {
      return NextResponse.json({ error: "Title and listId are required" }, { status: 400 });
    }

    // Check if user has access to the board
    const list = await db.list.findFirst({
      where: { id: listId },
      include: {
        board: {
          include: {
            members: true
          }
        }
      }
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const hasAccess = list.board.ownerId === user.id || 
      list.board.members.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the highest position in the list
    const lastCard = await db.card.findFirst({
      where: { listId },
      orderBy: { position: "desc" }
    });

    const cardPosition = position !== undefined ? position : (lastCard ? lastCard.position + 1 : 0);

    const card = await db.card.create({
      data: {
        title,
        description,
        listId,
        position: cardPosition
      },
      include: {
        labels: true,
        comments: {
          include: {
            user: true
          }
        }
      }
    });

    // Create activity log
    await db.activity.create({
      data: {
        type: "created_card",
        message: `Created card "${title}"`,
        boardId: list.boardId,
        userId: user.id
      }
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
