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
    const { cardId, targetBoardId, targetListId, position, afterCardId } = body;

    if (!cardId || !targetBoardId || !targetListId || !position) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the original card with all its data
    const originalCard = await db.card.findUnique({
      where: { id: cardId },
      include: {
        labels: true,
        checklists: {
          include: {
            items: true,
          },
        },
        comments: true,
      },
    });

    if (!originalCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Verify target board and list exist
    const targetBoard = await db.board.findUnique({
      where: { id: targetBoardId },
    });

    if (!targetBoard) {
      return NextResponse.json({ error: "Target board not found" }, { status: 404 });
    }

    const targetList = await db.list.findUnique({
      where: { id: targetListId },
    });

    if (!targetList) {
      return NextResponse.json({ error: "Target list not found" }, { status: 404 });
    }

    // Get all cards in target list to determine position
    const targetListCards = await db.card.findMany({
      where: { listId: targetListId },
      orderBy: { position: "asc" },
    });

    let newPosition = 0;

    if (position === "top") {
      newPosition = 0;
      // Update positions of existing cards
      await db.card.updateMany({
        where: { listId: targetListId },
        data: { position: { increment: 1 } },
      });
    } else if (position === "bottom") {
      newPosition = targetListCards.length;
    } else if (position === "after" && afterCardId) {
      const afterCard = await db.card.findUnique({
        where: { id: afterCardId },
      });
      if (!afterCard) {
        return NextResponse.json({ error: "After card not found" }, { status: 404 });
      }
      newPosition = afterCard.position + 1;
      // Update positions of cards after this position
      await db.card.updateMany({
        where: {
          listId: targetListId,
          position: { gt: afterCard.position },
        },
        data: { position: { increment: 1 } },
      });
    }

    // Create the copied card
    const copiedCard = await db.card.create({
      data: {
        title: `${originalCard.title} (Copy)`,
        description: originalCard.description,
        position: newPosition,
        isCompleted: false, // Reset completion status
        listId: targetListId,
        dueDate: originalCard.dueDate,
        assignedTo: originalCard.assignedTo,
        labels: {
          create: originalCard.labels.map((label) => ({
            name: label.name,
            color: label.color,
          })),
        },
        checklists: {
          create: originalCard.checklists.map((checklist) => ({
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

    // Create activity log
    try {
      await db.activity.create({
        data: {
          message: `copied card "${originalCard.title}" to ${targetList.title}`,
          userId,
          boardId: targetBoardId,
          cardId: copiedCard.id,
        },
      });
    } catch (error) {
      console.error("Failed to create activity:", error);
      // Don't fail the copy operation if activity logging fails
    }

    return NextResponse.json({
      success: true,
      card: copiedCard,
    });
  } catch (error) {
    console.error("Error copying card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
