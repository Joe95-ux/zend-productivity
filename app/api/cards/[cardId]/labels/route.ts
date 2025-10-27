import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    const { labelId } = await request.json();

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
    }

    // Verify the card exists and user has access
    const card = await db.card.findFirst({
      where: { id: cardId },
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
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = card.list?.board?.ownerId === user.id || 
      card.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if label exists
    const label = await db.label.findFirst({
      where: { id: labelId }
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Check if label is already assigned to this card
    const existingAssignment = await db.label.findFirst({
      where: {
        id: labelId,
        cardId: cardId
      }
    });

    if (existingAssignment) {
      return NextResponse.json({ error: "Label already assigned to this card" }, { status: 400 });
    }

    // Assign the label to the card by updating the label's cardId
    const updatedLabel = await db.label.update({
      where: { id: labelId },
      data: { cardId: cardId }
    });

    return NextResponse.json(updatedLabel);
  } catch (error) {
    console.error("Error assigning label to card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const { searchParams } = new URL(request.url);
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
    }

    // Verify the card exists and user has access
    const card = await db.card.findFirst({
      where: { id: cardId },
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
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const hasAccess = card.list?.board?.ownerId === user.id || 
      card.list?.board?.members?.some(member => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if label is assigned to this card
    const label = await db.label.findFirst({
      where: {
        id: labelId,
        cardId: cardId
      }
    });

    if (!label) {
      return NextResponse.json({ error: "Label not assigned to this card" }, { status: 404 });
    }

    // Remove the label from the card by deleting it
    await db.label.delete({
      where: { id: labelId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing label from card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
