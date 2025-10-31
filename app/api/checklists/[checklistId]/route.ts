import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createActivityWithNotifications } from "@/lib/notification-utils";

interface UpdateChecklistRequest {
  title: string;
}

// PUT /api/checklists/[checklistId] - Update checklist
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const { title }: UpdateChecklistRequest = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Check if user has access to the checklist
    const checklist = await db.checklist.findFirst({
      where: { id: checklistId },
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

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = checklist.card?.list?.board?.ownerId === user.id || 
      checklist.card?.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the checklist
    const updatedChecklist = await db.checklist.update({
      where: { id: checklistId },
      data: { title },
      include: {
        items: true
      }
    });

    // Create activity log with notifications
    try {
      const boardId = checklist.card?.list?.boardId;
      const cardId = checklist.cardId;
      if (boardId && cardId) {
        await createActivityWithNotifications({
          type: "updated_checklist",
          message: `Updated checklist "${title}" in card "${checklist.card?.title}"`,
          boardId: boardId,
          cardId: cardId,
          userId: user.id
        });
      }
    } catch (activityError) {
      console.error("Error creating activity for checklist update:", activityError);
    }

    return NextResponse.json(updatedChecklist);
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/checklists/[checklistId] - Delete checklist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;

    // Check if user has access to the checklist
    const checklist = await db.checklist.findFirst({
      where: { id: checklistId },
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

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = checklist.card?.list?.board?.ownerId === user.id || 
      checklist.card?.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the checklist (items will be deleted automatically due to cascade)
    await db.checklist.delete({
      where: { id: checklistId }
    });

    // Create activity log with notifications
    try {
      const boardId = checklist.card?.list?.boardId;
      const cardId = checklist.cardId;
      if (boardId && cardId) {
        await createActivityWithNotifications({
          type: "deleted_checklist",
          message: `Deleted checklist "${checklist.title}" from card "${checklist.card?.title}"`,
          boardId: boardId,
          cardId: cardId,
          userId: user.id
        });
      }
    } catch (activityError) {
      console.error("Error creating activity for checklist deletion:", activityError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
