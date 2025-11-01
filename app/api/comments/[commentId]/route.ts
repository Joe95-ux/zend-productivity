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
        reactions: {
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
        },
        card: {
          include: {
            list: true
          }
        }
      }
    });

    // Extract images from updated comment content and create attachments for new images
    const duplicateUrls: string[] = [];
    try {
      const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
      const images: string[] = [];
      let match;
      
      while ((match = imageRegex.exec(content)) !== null) {
        images.push(match[1]);
      }

      // Get existing attachments to avoid duplicates (case-insensitive comparison)
      const existingAttachments = await db.attachment.findMany({
        where: { cardId: updatedComment.cardId },
        select: { url: true }
      });
      // Normalize URLs to lowercase for case-insensitive comparison
      const existingUrlsLower = new Set(existingAttachments.map(att => att.url.toLowerCase()));

      // Create attachments for each new image (not already in attachments)
      for (const imageUrl of images) {
        const normalizedUrl = imageUrl.toLowerCase();
        
        // Check if attachment already exists (case-insensitive)
        if (existingUrlsLower.has(normalizedUrl)) {
          duplicateUrls.push(imageUrl);
          continue;
        }

        // Extract MIME type from base64 data URL if available
        let attachmentType = 'image';
        if (imageUrl.startsWith('data:image/')) {
          const mimeMatch = imageUrl.match(/^data:image\/([^;]+)/);
          if (mimeMatch && mimeMatch[1]) {
            attachmentType = `image/${mimeMatch[1]}`;
          }
        }

        await db.attachment.create({
          data: {
            url: imageUrl,
            type: attachmentType,
            cardId: updatedComment.cardId
          }
        });
      }
    } catch (attachmentError) {
      console.error("Error creating attachments from comment update images:", attachmentError);
      // Don't fail the comment update if attachment creation fails
    }

    // Create activity log (with error handling)
    try {
      const boardId = existingComment.card?.list?.boardId || updatedComment.card?.list?.boardId;
      if (boardId) {
        await db.activity.create({
          data: {
            type: "updated_comment",
            message: `Updated a comment on card "${updatedComment.card?.title}"`,
            boardId: boardId,
            cardId: updatedComment.cardId,
            userId: user.id
          }
        });
      }
    } catch (activityError) {
      console.error("Error creating activity for comment update:", activityError);
      // Don't fail the comment update if activity creation fails
    }

    return NextResponse.json({
      ...updatedComment,
      duplicateImages: duplicateUrls.length > 0 ? duplicateUrls : undefined
    });
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
      const boardId = existingComment.card?.list?.boardId;
      if (boardId) {
        await db.activity.create({
          data: {
            type: "deleted_comment",
            message: `Deleted a comment from card "${existingComment.card?.title}"`,
            boardId: boardId,
            cardId: existingComment.cardId,
            userId: user.id
          }
        });
      }
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
