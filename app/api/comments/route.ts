import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "BoardId is required" }, { status: 400 });
    }

    // Check if user has access to the board
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      }
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found or unauthorized" }, { status: 404 });
    }

    // Fetch all comments from cards in this board
    const comments = await db.comment.findMany({
      where: {
        card: {
          list: {
            boardId: boardId
          }
        }
      },
      include: {
        user: true,
        card: {
          select: {
            id: true,
            title: true,
            list: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, cardId } = body;

    if (!content || !cardId) {
      return NextResponse.json({ error: "Content and cardId are required" }, { status: 400 });
    }

    // Check if user has access to the card
    const card = await db.card.findFirst({
      where: { id: cardId },
      include: {
        list: {
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
        }
      }
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (!card.list?.board) {
      return NextResponse.json({ error: "board not found" }, { status: 404 });
}

    const hasAccess = card.list.board.ownerId === user.id || 
      card.list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comment = await db.comment.create({
      data: {
        content,
        cardId,
        userId: user.id
      },
      include: {
        user: true
      }
    });

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: "added_comment",
          message: `Added a comment to card "${card.title}"`,
          boardId: card.list?.boardId,
          cardId: cardId,
          userId: user.id
        }
      });
    } catch (activityError) {
      console.error("Error creating activity for comment:", activityError);
      // Don't fail the comment creation if activity creation fails
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
