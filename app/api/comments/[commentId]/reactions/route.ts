import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Add reaction to a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const body = await request.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    // Check if comment exists and user has access
    const comment = await db.comment.findFirst({
      where: { id: commentId },
      include: {
        card: {
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
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (!comment.card?.list?.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const board = comment.card.list.board;
    const hasAccess = board.ownerId === user.id || 
      board.members.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if reaction already exists (upsert pattern)
    const existingReaction = await db.reaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId: user.id,
          emoji
        }
      }
    });

    if (existingReaction) {
      // If reaction exists, remove it (toggle off)
      await db.reaction.delete({
        where: { id: existingReaction.id }
      });
      
      return NextResponse.json({ removed: true });
    }

    // Create new reaction
    const reaction = await db.reaction.create({
      data: {
        emoji,
        commentId,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation (shouldn't happen with our unique constraint)
      return NextResponse.json({ error: "Reaction already exists" }, { status: 409 });
    }
    console.error("Error adding reaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove reaction from a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get("emoji");

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const reaction = await db.reaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId: user.id,
          emoji
        }
      }
    });

    if (!reaction) {
      return NextResponse.json({ error: "Reaction not found" }, { status: 404 });
    }

    await db.reaction.delete({
      where: { id: reaction.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing reaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

