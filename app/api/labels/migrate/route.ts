import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await request.json();
    if (!boardId) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    // Verify access to board
    const board = await db.board.findFirst({
      where: { id: boardId },
      include: { members: true }
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    const hasAccess = board.ownerId === user.id || board.members?.some(m => m.userId === user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find all card-only labels (no boardLabelId) for cards under this board
    const orphanLabels = await db.label.findMany({
      where: {
        boardLabelId: null,
        card: {
          list: {
            boardId: boardId
          }
        }
      },
      include: {
        card: {
          include: {
            list: true
          }
        }
      }
    });

    if (orphanLabels.length === 0) {
      return NextResponse.json({ migrated: 0, createdBoardLabels: 0 });
    }

    // Group by name+color
    const groups = new Map<string, { name: string; color: string; }>();
    for (const l of orphanLabels) {
      const key = `${l.name}__${l.color}`;
      if (!groups.has(key)) groups.set(key, { name: l.name, color: l.color });
    }

    // Ensure a BoardLabel exists for each group
    const keyToBoardLabelId = new Map<string, string>();
    for (const [key, val] of groups) {
      const existing = await db.boardLabel.findFirst({
        where: { boardId, name: val.name, color: val.color }
      });
      if (existing) {
        keyToBoardLabelId.set(key, existing.id);
      } else {
        const created = await db.boardLabel.create({ data: { boardId, name: val.name, color: val.color } });
        keyToBoardLabelId.set(key, created.id);
      }
    }

    // Update card labels to link to boardLabelId
    let migrated = 0;
    for (const l of orphanLabels) {
      const key = `${l.name}__${l.color}`;
      const boardLabelId = keyToBoardLabelId.get(key)!;
      await db.label.update({ where: { id: l.id }, data: { boardLabelId } });
      migrated += 1;
    }

    return NextResponse.json({ migrated, createdBoardLabels: keyToBoardLabelId.size });
  } catch (error) {
    console.error("Error migrating labels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


