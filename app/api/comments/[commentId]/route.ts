import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;
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
        user: true
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;

    // Check if comment exists and user owns it
    const existingComment = await db.comment.findFirst({
      where: { 
        id: commentId,
        userId: user.id 
      }
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    // Delete the comment
    await db.comment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
