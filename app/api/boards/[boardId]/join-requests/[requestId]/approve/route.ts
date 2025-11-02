import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/boards/[boardId]/join-requests/[requestId]/approve - Approve a join request
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
    const { role = "member" } = await request.json();

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
      include: {
        user: true,
      },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found or already processed" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await db.member.findFirst({
      where: {
        boardId,
        userId: joinRequest.userId,
      },
    });

    if (existingMember) {
      // Delete the join request since user is already a member
      await db.boardJoinRequest.delete({
        where: { id: requestId },
      });
      return NextResponse.json({ success: true, message: "User is already a member" });
    }

    // Check if user is the owner
    if (board.ownerId === joinRequest.userId) {
      return NextResponse.json(
        { error: "User is already the owner of this board" },
        { status: 400 }
      );
    }

    // Create member
    await db.member.create({
      data: {
        boardId,
        userId: joinRequest.userId,
        role: role === "admin" ? "admin" : "member",
      },
    });

    // Update join request status
    await db.boardJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        processedAt: new Date(),
        processedBy: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving join request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

