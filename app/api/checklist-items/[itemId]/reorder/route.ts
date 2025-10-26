import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = params;
    
    // Parse request body with error handling
    let requestBody: { checklistId: string; newPosition: number };
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
    
    const { checklistId, newPosition } = requestBody;

    if (!checklistId || newPosition === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the checklist to verify ownership
    const checklist = await db.checklist.findFirst({
      where: {
        id: checklistId
      },
      include: {
        items: true,
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

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = checklist.card.list.board.ownerId === userId || 
      checklist.card.list.board.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all items in the checklist
    const items = checklist.items;
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Remove the item from its current position
    const [movedItem] = items.splice(itemIndex, 1);
    
    // Insert it at the new position
    items.splice(newPosition, 0, movedItem);

    // Update the checklist with the new order of items
    // We'll delete all items and recreate them in the new order
    await db.checklistItem.deleteMany({
      where: { checklistId: checklistId }
    });

    await db.checklistItem.createMany({
      data: items.map((item, index) => ({
        id: item.id,
        content: item.content,
        isCompleted: item.isCompleted,
        checklistId: checklistId
      }))
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
