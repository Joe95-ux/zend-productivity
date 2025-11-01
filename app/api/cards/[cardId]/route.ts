import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createActivityWithNotifications } from "@/lib/notification-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("PUT /api/cards/[cardId] - No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    const startTime = Date.now();
    console.log(`PUT /api/cards/${cardId} - User: ${user.id}, Request started at ${new Date().toISOString()}`);
    
    // Safely parse JSON with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.log(`PUT /api/cards/${cardId} - Empty request body`);
        return NextResponse.json({ error: "Request body is required" }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (error) {
      console.error(`PUT /api/cards/${cardId} - JSON parse error:`, error);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, description, position, listId, isCompleted, startDate, dueDate, isRecurring, recurringType, reminderType } = body;
    
    console.log(`PUT /api/cards/${cardId} - Received data:`, {
      title, description, position, listId, isCompleted, startDate, dueDate, isRecurring, recurringType, reminderType
    });

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
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
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

    const updateData: {
      title?: string;
      description?: string;
      position?: number;
      listId?: string;
      isCompleted?: boolean;
      startDate?: string | null;
      dueDate?: string | null;
      isRecurring?: boolean;
      recurringType?: string | null;
      reminderType?: string | null;
    } = {};
    if (title !== undefined && title !== null) updateData.title = title;
    if (description !== undefined && description !== null) updateData.description = description;
    if (position !== undefined && position !== null) updateData.position = position;
    if (listId !== undefined && listId !== null) updateData.listId = listId;
    if (isCompleted !== undefined && isCompleted !== null) updateData.isCompleted = isCompleted;
    if (startDate !== undefined) {
      if (!startDate) {
        updateData.startDate = null;
      } else {
        const d = new Date(startDate);
        updateData.startDate = isNaN(d.getTime()) ? null : d.toISOString();
      }
      console.log(`PUT /api/cards/${cardId} - Converted startDate: ${startDate} -> ${updateData.startDate}`);
    }
    if (dueDate !== undefined) {
      if (!dueDate) {
        updateData.dueDate = null;
      } else {
        const d = new Date(dueDate);
        updateData.dueDate = isNaN(d.getTime()) ? null : d.toISOString();
      }
      console.log(`PUT /api/cards/${cardId} - Converted dueDate: ${dueDate} -> ${updateData.dueDate}`);
    }
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurringType !== undefined) updateData.recurringType = recurringType;
    if (reminderType !== undefined) updateData.reminderType = reminderType;
    
    // If no valid data to update, return early
    if (Object.keys(updateData).length === 0) {
      console.log(`PUT /api/cards/${cardId} - No valid data to update, returning current card`);
      return NextResponse.json(card);
    }

    const dbUpdateStart = Date.now();
    console.log(`PUT /api/cards/${cardId} - Starting database update at ${new Date().toISOString()}`);
    
    const updatedCard = await db.card.update({
      where: { id: cardId },
      data: updateData,
      include: {
        labels: true,
        comments: {
          include: {
            user: true
          }
        }
      }
    });
    
    const dbUpdateEnd = Date.now();
    console.log(`PUT /api/cards/${cardId} - Database update completed in ${dbUpdateEnd - dbUpdateStart}ms`);

    // Extract images from description and create attachments (if description was updated)
    const duplicateUrls: string[] = [];
    if (description !== undefined && description !== card.description && description) {
      try {
        const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        const images: string[] = [];
        let match;
        
        while ((match = imageRegex.exec(description)) !== null) {
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
        console.error("Error creating attachments from description images:", attachmentError);
        // Don't fail the card update if attachment creation fails
      }
    }

    // Create activity log with specific details
    let activityMessage = `Updated card "${updatedCard.title}"`;
    let activityType = "updated_card";
    
    // Determine specific activity type and message
    if (title !== undefined && title !== card.title) {
      activityMessage = `Renamed card from "${card.title}" to "${title}"`;
      activityType = "renamed_card";
    } else if (description !== undefined && description !== card.description) {
      if (description && !card.description) {
        activityMessage = `Added description to card "${updatedCard.title}"`;
        activityType = "added_description";
      } else if (!description && card.description) {
        activityMessage = `Removed description from card "${updatedCard.title}"`;
        activityType = "removed_description";
      } else if (description && card.description) {
        activityMessage = `Updated description of card "${updatedCard.title}"`;
        activityType = "updated_description";
      }
    } else if (isCompleted !== undefined && isCompleted !== card.isCompleted) {
      activityMessage = isCompleted 
        ? `Marked card "${updatedCard.title}" as complete`
        : `Marked card "${updatedCard.title}" as incomplete`;
      activityType = isCompleted ? "completed_card" : "uncompleted_card";
    }

    // Create activity log with notifications (with error handling)
    try {
      const boardId = card.list?.boardId;
      if (boardId) {
        await createActivityWithNotifications({
          type: activityType,
          message: activityMessage,
          boardId: boardId,
          cardId: cardId,
          userId: user.id
        });
      }
    } catch (activityError) {
      console.error("Error creating activity for card update:", activityError);
      // Don't fail the card update if activity creation fails
    }

    const totalTime = Date.now() - startTime;
    console.log(`PUT /api/cards/${cardId} - Request completed in ${totalTime}ms at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      ...updatedCard,
      duplicateImages: duplicateUrls.length > 0 ? duplicateUrls : undefined
    });
  } catch (error) {
    console.error("Error updating card:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
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
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
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

    await db.card.delete({
      where: { id: cardId }
    });

    // Create activity log with notifications (with error handling)
    try {
      const boardId = board.id;
      await createActivityWithNotifications({
        type: "deleted_card",
        message: `Deleted card "${card.title}"`,
        boardId: boardId,
        cardId: cardId,
        userId: user.id
      });
    } catch (activityError) {
      console.error("Error creating activity for card deletion:", activityError);
      // Don't fail the card deletion if activity creation fails
    }

    return NextResponse.json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
