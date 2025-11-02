import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/boards/[boardId]/join-requests - Get all pending join requests
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

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

    // Fetch pending join requests
    const joinRequests = await db.boardJoinRequest.findMany({
      where: {
        boardId,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            clerkId: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    const formattedRequests = joinRequests.map((request) => ({
      id: request.id,
      user: request.user,
      requestedAt: request.requestedAt.toISOString(),
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

