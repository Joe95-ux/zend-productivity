import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ labelId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { labelId } = await params;
    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 });
    }

    const boardLabel = await db.boardLabel.findFirst({
      where: { id: labelId },
      include: { board: { include: { members: true } } }
    });

    if (!boardLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const hasAccess = boardLabel.board.ownerId === user.id ||
      boardLabel.board.members?.some(m => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await db.boardLabel.update({
      where: { id: labelId },
      data: { name, color }
    });

    // Propagate changes to card-specific labels linked to this board label
    await db.label.updateMany({
      where: { boardLabelId: labelId },
      data: { name, color }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating board label:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ labelId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { labelId } = await params;

    const boardLabel = await db.boardLabel.findFirst({
      where: { id: labelId },
      include: { board: { include: { members: true } } }
    });

    if (!boardLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const hasAccess = boardLabel.board.ownerId === user.id ||
      boardLabel.board.members?.some(m => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Remove all card-specific labels tied to this board label
    await db.label.deleteMany({ where: { boardLabelId: labelId } });
    // Delete the board label
    await db.boardLabel.delete({ where: { id: labelId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board label:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Removed duplicate legacy handlers. BoardLabel PUT/DELETE handlers are defined above.
