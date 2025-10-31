import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { attachmentId } = await params;

    // Verify the user has access to the attachment's card
    const attachment = await db.attachment.findFirst({
      where: { id: attachmentId },
      include: {
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

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Check if attachment has a card
    if (!attachment.card) {
      return NextResponse.json({ error: "Card not found for attachment" }, { status: 404 });
    }

    // Check if card has a list
    if (!attachment?.card?.list) {
      return NextResponse.json({ error: "List not found for attachment card" }, { status: 404 });
    }

    // Check if list has a board
    const board = attachment?.card?.list?.board;
    if (!board) {
      return NextResponse.json({ error: "Board not found for attachment list" }, { status: 404 });
    }

    // Check if user has access to the card
    const hasAccess = 
      board.ownerId === user.id ||
      board.members.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the attachment
    await db.attachment.delete({
      where: { id: attachmentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
