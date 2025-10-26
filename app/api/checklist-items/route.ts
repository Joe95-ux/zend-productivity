import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createActivityWithNotifications } from "@/lib/notification-utils";

interface CreateChecklistItemRequest {
  content: string;
  checklistId: string;
}

// POST /api/checklist-items - Create a new checklist item
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("Creating checklist item - API called");
    const user = await getCurrentUser();
    if (!user) {
      console.log("No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, checklistId }: CreateChecklistItemRequest = await request.json();
    console.log("Received data:", { content, checklistId });

    if (!content || !checklistId) {
      console.log("Missing required fields");
      return NextResponse.json({ error: "Content and checklistId are required" }, { status: 400 });
    }

    // Check if user has access to the checklist
    console.log("Looking up checklist:", checklistId);
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
      console.log("Checklist not found");
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    console.log("Checklist found:", checklist.title);
    console.log("Board owner:", checklist.card.list.board.ownerId);
    console.log("User ID:", user.id);

    // Check if user has access to the board
    const hasAccess = checklist.card.list.board.ownerId === user.id || 
      checklist.card.list.board.members.some(member => member.userId === user.id);

    console.log("Has access:", hasAccess);
    if (!hasAccess) {
      console.log("User does not have access to board");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the checklist item
    console.log("Creating checklist item in database");
    const item = await db.checklistItem.create({
      data: {
        content,
        checklistId
      }
    });
    console.log("Checklist item created:", item.id);

    // Create activity log with notifications
    try {
      console.log("Creating activity with notifications");
      await createActivityWithNotifications({
        type: "added_checklist_item",
        message: `Added item "${content}" to checklist "${checklist.title}"`,
        boardId: checklist.card.list.boardId,
        cardId: checklist.cardId,
        userId: user.id
      });
      console.log("Activity created successfully");
    } catch (activityError) {
      console.error("Error creating activity for checklist item:", activityError);
    }

    console.log("Returning success response");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
