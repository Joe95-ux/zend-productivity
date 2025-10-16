import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    const body = await request.json();
    const { title, description, position, listId, isCompleted } = body;

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

    const hasAccess = card.list.board.ownerId === user.id || 
      card.list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (position !== undefined) updateData.position = position;
    if (listId !== undefined) updateData.listId = listId;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

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

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: activityType,
          message: activityMessage,
          boardId: card.list?.boardId,
          cardId: cardId,
          userId: user.id
        }
      });
    } catch (activityError) {
      console.error("Error creating activity for card update:", activityError);
      // Don't fail the card update if activity creation fails
    }

    return NextResponse.json(updatedCard);
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

    const hasAccess = card.list.board.ownerId === user.id || 
      card.list.board.members.some(member => member.user.id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.card.delete({
      where: { id: cardId }
    });

    // Create activity log (with error handling)
    try {
      await db.activity.create({
        data: {
          type: "deleted_card",
          message: `Deleted card "${card.title}"`,
          boardId: card.list?.boardId,
          cardId: cardId,
          userId: user.id
        }
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
