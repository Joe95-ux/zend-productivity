import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
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
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Check if comment exists and user owns it
    const existingComment = await db.comment.findFirst({
      where: { 
        id: commentId,
        userId: user.id 
      },
      include: {
        card: {
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
        }
      }
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    // Update the comment
    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: true,
        card: {
          include: {
            list: true
          }
        }
      }
    });

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: "updated_comment",
          message: `Updated a comment on card "${updatedComment.card?.title}"`,
          boardId: updatedComment.card?.list?.boardId,
          cardId: updatedComment.cardId,
          userId: user.id
        }
      });
    } catch (activityError) {
      console.error("Error creating activity for comment update:", activityError);
      // Don't fail the comment update if activity creation fails
    }

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Check if comment exists and user owns it
    const existingComment = await db.comment.findFirst({
      where: { 
        id: commentId,
        userId: user.id 
      },
      include: {
        card: {
          include: {
            list: true
          }
        }
      }
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    // Delete the comment
    await db.comment.delete({
      where: { id: commentId }
    });

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: "deleted_comment",
          message: `Deleted a comment from card "${existingComment.card?.title}"`,
          boardId: existingComment.card?.list?.boardId,
          cardId: existingComment.cardId,
          userId: user.id
        }
      });
    } catch (activityError) {
      console.error("Error creating activity for comment deletion:", activityError);
      // Don't fail the comment deletion if activity creation fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
