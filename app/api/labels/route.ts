import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color, cardId } = await request.json();

    if (!name || !color || !cardId) {
      return NextResponse.json({ error: "Name, color, and cardId are required" }, { status: 400 });
    }

    // Verify the card exists and user has access
    const card = await db.card.findFirst({
      where: { id: cardId },
      include: {
        list: {
          include: {
            board: {
              include: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = card.list?.board?.ownerId === user.id || 
      card.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the new label
    const newLabel = await db.label.create({
      data: {
        name,
        color,
        cardId
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

    // Get all labels for cards in this board
    const labels = await db.label.findMany({
      where: {
        card: {
          list: {
            boardId: boardId
          }
        }
      },
      include: {
        card: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
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
