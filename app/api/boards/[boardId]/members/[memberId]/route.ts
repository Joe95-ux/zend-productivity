import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/boards/[boardId]/members/[memberId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, memberId } = await params;
    const { role } = await request.json();

    if (!role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role (admin or member) is required" },
        { status: 400 }
      );
    }

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

    // Find the member
    const member = await db.member.findFirst({
      where: {
        id: memberId,
        boardId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Don't allow changing owner's role (owner is not a member record)
    if (board.ownerId === member.userId) {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 400 }
      );
    }

    // Update member role
    const updatedMember = await db.member.update({
      where: { id: memberId },
      data: { role },
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
    });

    return NextResponse.json({
      id: updatedMember.id,
      user: updatedMember.user,
      role: updatedMember.role as "admin" | "member",
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/members/[memberId] - Remove member from board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, memberId } = await params;

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

    // Find the member
    const member = await db.member.findFirst({
      where: {
        id: memberId,
        boardId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Don't allow removing owner
    if (board.ownerId === member.userId) {
      return NextResponse.json(
        { error: "Cannot remove board owner" },
        { status: 400 }
      );
    }

    // Remove member
    await db.member.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

