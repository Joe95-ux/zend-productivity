import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("PUT /api/lists/[listId] - No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const startTime = Date.now();
    console.log(`PUT /api/lists/${listId} - User: ${user.id}, Request started at ${new Date().toISOString()}`);
    
    // Safely parse JSON with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.log(`PUT /api/lists/${listId} - Empty request body`);
        return NextResponse.json({ error: "Request body is required" }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (error) {
      console.error(`PUT /api/lists/${listId} - JSON parse error:`, error);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, position } = body;
    
    console.log(`PUT /api/lists/${listId} - Received data:`, {
      title, position, listId
    });

    // Check if user has access to the board
    const list = await db.list.findFirst({
      where: { id: listId },
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
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = list.board.ownerId === user.id || 
      list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If position is being updated, we need to handle position conflicts
    if (position !== undefined) {
      // Get all lists in the same board
      const allLists = await db.list.findMany({
        where: { boardId: list.boardId },
        orderBy: { position: 'asc' }
      });

      // Find the list being moved
      const listToMove = allLists.find(l => l.id === listId);
      if (!listToMove) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      // Remove the list from its current position
      const otherLists = allLists.filter(l => l.id !== listId);
      
      // Insert the list at the new position
      const newPosition = Math.max(1, Math.min(position, otherLists.length + 1));
      
      // Update positions for all affected lists
      const updatedLists = [];
      
      // Lists before the new position keep their positions
      for (let i = 0; i < newPosition - 1; i++) {
        if (otherLists[i]) {
          updatedLists.push({
            id: otherLists[i].id,
            position: i + 1
          });
        }
      }
      
      // The moved list gets the new position
      updatedLists.push({
        id: listId,
        position: newPosition
      });
      
      // Lists after the new position get shifted down
      for (let i = newPosition - 1; i < otherLists.length; i++) {
        if (otherLists[i]) {
          updatedLists.push({
            id: otherLists[i].id,
            position: i + 2
          });
        }
      }

      console.log(`PUT /api/lists/${listId} - Updating positions:`, updatedLists);

      // Update all lists in a transaction
      const updatePromises = updatedLists.map(listUpdate => 
        db.list.update({
          where: { id: listUpdate.id },
          data: { position: listUpdate.position }
        })
      );

      await Promise.all(updatePromises);
      
      console.log(`PUT /api/lists/${listId} - Position updates completed`);
    }

    // Update the list with any other changes (like title)
    const updateData: { title?: string } = {};
    if (title !== undefined && title !== null) updateData.title = title;
    
    // If no valid data to update, return early
    if (Object.keys(updateData).length === 0) {
      console.log(`PUT /api/lists/${listId} - No valid data to update, returning current list`);
      return NextResponse.json(list);
    }
    
    const updatedList = await db.list.update({
      where: { id: listId },
      data: updateData
    });

    const totalTime = Date.now() - startTime;
    console.log(`PUT /api/lists/${listId} - Request completed in ${totalTime}ms at ${new Date().toISOString()}`);
    
    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    // Check if user has access to the board
    const list = await db.list.findFirst({
      where: { id: listId },
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
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = list.board.ownerId === user.id || 
      list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all cards in the list first
    await db.card.deleteMany({
      where: { listId: listId }
    });

    // Then delete the list
    await db.list.delete({
      where: { id: listId }
    });

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: "deleted_list",
          message: `Deleted list "${list.title}"`,
          boardId: list.boardId,
          userId: user.id
        }
      });
    } catch (activityError) {
      console.error("Error creating activity for list deletion:", activityError);
      // Don't fail the list deletion if activity creation fails
    }

    return NextResponse.json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
