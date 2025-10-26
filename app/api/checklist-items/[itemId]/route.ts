import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createActivityWithNotifications } from "@/lib/notification-utils";

interface UpdateChecklistItemRequest {
  content?: string;
  isCompleted?: boolean;
}

// PUT /api/checklist-items/[itemId] - Update checklist item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    
    // Parse request body with error handling
    let requestBody: UpdateChecklistItemRequest;
    try {
      const bodyText = await request.text();
      if (!bodyText) {
        return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
      }
      requestBody = JSON.parse(bodyText);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const { content, isCompleted } = requestBody;

    // Check if user has access to the checklist item
    const item = await db.checklistItem.findFirst({
      where: { id: itemId },
      include: {
        checklist: {
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
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = item.checklist.card.list.board.ownerId === user.id || 
      item.checklist.card.list.board.members.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the item
    const updatedItem = await db.checklistItem.update({
      where: { id: itemId },
      data: { 
        ...(content !== undefined && { content }),
        ...(isCompleted !== undefined && { isCompleted })
      }
    });

    // Create activity log with notifications (only for completion status changes)
    if (isCompleted !== undefined && isCompleted !== item.isCompleted) {
      try {
        await createActivityWithNotifications({
          type: isCompleted ? "completed_checklist_item" : "uncompleted_checklist_item",
          message: `${isCompleted ? "Completed" : "Uncompleted"} item "${item.content}" in checklist "${item.checklist.title}"`,
          boardId: item.checklist.card.list.boardId,
          cardId: item.checklist.cardId,
          userId: user.id
        });
      } catch (activityError) {
        console.error("Error creating activity for checklist item update:", activityError);
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/checklist-items/[itemId] - Delete checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    // Check if user has access to the checklist item
    const item = await db.checklistItem.findFirst({
      where: { id: itemId },
      include: {
        checklist: {
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
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = item.checklist.card.list.board.ownerId === user.id || 
      item.checklist.card.list.board.members.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the item
    await db.checklistItem.delete({
      where: { id: itemId }
    });

    // Create activity log with notifications
    try {
      await createActivityWithNotifications({
        type: "deleted_checklist_item",
        message: `Deleted item "${item.content}" from checklist "${item.checklist.title}"`,
        boardId: item.checklist.card.list.boardId,
        cardId: item.checklist.cardId,
        userId: user.id
      });
    } catch (activityError) {
      console.error("Error creating activity for checklist item deletion:", activityError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
