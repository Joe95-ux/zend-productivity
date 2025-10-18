import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listId, targetBoardId, position, afterListId } = body;

    if (!listId || !targetBoardId || !position) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the original list with all its cards and data
    const originalList = await db.list.findUnique({
      where: { id: listId },
      include: {
        cards: {
          include: {
            labels: true,
            checklists: {
              include: {
                items: true,
              },
            },
            comments: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!originalList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Verify target board exists
    const targetBoard = await db.board.findUnique({
      where: { id: targetBoardId },
    });

    if (!targetBoard) {
      return NextResponse.json({ error: "Target board not found" }, { status: 404 });
    }

    // Get all lists in target board to determine position
    const targetBoardLists = await db.list.findMany({
      where: { boardId: targetBoardId },
      orderBy: { position: "asc" },
    });

    let newPosition = 0;

    if (position === "left") {
      newPosition = 0;
      // Update positions of existing lists
      await db.list.updateMany({
        where: { boardId: targetBoardId },
        data: { position: { increment: 1 } },
      });
    } else if (position === "right") {
      newPosition = targetBoardLists.length;
    } else if (position === "after" && afterListId) {
      const afterList = await db.list.findUnique({
        where: { id: afterListId },
      });
      if (!afterList) {
        return NextResponse.json({ error: "After list not found" }, { status: 404 });
      }
      newPosition = afterList.position + 1;
      // Update positions of lists after this position
      await db.list.updateMany({
        where: {
          boardId: targetBoardId,
          position: { gt: afterList.position },
        },
        data: { position: { increment: 1 } },
      });
    }

    // Create the copied list
    const copiedList = await db.list.create({
      data: {
        title: `${originalList.title} (Copy)`,
        position: newPosition,
        boardId: targetBoardId,
      },
    });

    // Copy all cards from the original list
    for (const card of originalList.cards) {
      await db.card.create({
        data: {
          title: card.title,
          description: card.description,
          position: card.position,
          isCompleted: false, // Reset completion status
          listId: copiedList.id,
          dueDate: card.dueDate,
          assignedTo: card.assignedTo,
          labels: {
            create: card.labels.map((label) => ({
              name: label.name,
              color: label.color,
            })),
          },
          checklists: {
            create: card.checklists.map((checklist) => ({
              title: checklist.title,
              items: {
                create: checklist.items.map((item) => ({
                  text: item.text,
                  isCompleted: false, // Reset completion status
                })),
              },
            })),
          },
        },
      });
    }

    // Create activity log
    try {
      await db.activity.create({
        data: {
          message: `copied list "${originalList.title}" with ${originalList.cards.length} cards`,
          userId,
          boardId: targetBoardId,
        },
      });
    } catch (error) {
      console.error("Failed to create activity:", error);
      // Don't fail the copy operation if activity logging fails
    }

    return NextResponse.json({
      success: true,
      list: copiedList,
    });
  } catch (error) {
    console.error("Error copying list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
