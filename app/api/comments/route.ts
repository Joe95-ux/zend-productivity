import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createActivityWithNotifications } from "@/lib/notification-utils";

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

    if (!card.list) {
      return NextResponse.json({ error: "List not found for card" }, { status: 404 });
    }

    if (!card.list.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const board = card.list.board;
    const hasAccess = board.ownerId === user.id || 
      board.members.some(member => member.user.id === user.id);

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
        }
      }
    });

    // Extract images from comment content and create attachments
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
        where: { cardId },
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
            cardId
          }
        });
      }
    } catch (attachmentError) {
      console.error("Error creating attachments from comment images:", attachmentError);
      // Don't fail the comment creation if attachment creation fails
    }

    // Create activity log with notifications (with error handling)
    try {
      const boardId = card.list?.boardId;
      if (boardId) {
        console.log("Creating activity for comment:", {
          type: "added_comment",
          message: `Added a comment to card "${card.title}"`,
          boardId: boardId,
          cardId: cardId,
          userId: user.id
        });
        
        const result = await createActivityWithNotifications({
          type: "added_comment",
          message: `Added a comment to card "${card.title}"`,
          boardId: boardId,
          cardId: cardId,
          userId: user.id
        });
      
        console.log("Activity and notifications created:", result);
      }
    } catch (activityError) {
      console.error("Error creating activity for comment:", activityError);
      // Don't fail the comment creation if activity creation fails
    }

    return NextResponse.json({
      ...comment,
      duplicateImages: duplicateUrls.length > 0 ? duplicateUrls : undefined
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
