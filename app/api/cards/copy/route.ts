import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database to get the internal ID
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { cardId, targetBoardId, targetListId, position, newTitle } = body;

    if (!cardId || !targetBoardId || !targetListId || position === undefined) {
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

    // Update positions of cards at or after the target position
    await db.card.updateMany({
      where: {
        listId: targetListId,
        position: { gte: position },
      },
      data: { position: { increment: 1 } },
    });

    // Create the copied card
    const copiedCard = await db.card.create({
      data: {
        title: newTitle || `${originalCard.title} (Copy)`,
        description: originalCard.description,
        position: position,
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
              create: checklist.items.map((item, index) => ({
                content: item.content,
                isCompleted: false, // Reset completion status
                position: index,
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
          type: "copied_card",
          message: `copied card "${originalCard.title}" to ${targetList.title}`,
          userId: user.id,
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
