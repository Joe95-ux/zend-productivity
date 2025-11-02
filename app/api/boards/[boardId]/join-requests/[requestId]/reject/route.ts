import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/boards/[boardId]/join-requests/[requestId]/reject - Reject a join request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; requestId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, requestId } = await params;

    // Check if user is owner or admin of the board
    const board = await db.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                role: "admin",
              },
            },
          },
        ],
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or unauthorized" },
        { status: 404 }
      );
    }

    // Find the join request
    const joinRequest = await db.boardJoinRequest.findFirst({
      where: {
        id: requestId,
        boardId,
        status: "pending",
      },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found or already processed" },
        { status: 404 }
      );
    }

    // Update join request status to rejected
    await db.boardJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        processedAt: new Date(),
        processedBy: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error rejecting join request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

