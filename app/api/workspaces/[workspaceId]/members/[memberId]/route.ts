import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/workspaces/[workspaceId]/members/[memberId] - Remove member from workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    // Get workspace
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has admin access
    const isOwner = workspace.ownerId === user.id;
    const isAdmin = workspace.members.some(
      (m) => m.userId === user.id && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Admin access required." },
        { status: 403 }
      );
    }

    // Don't allow removing owner
    if (workspace.ownerId === memberId || memberId.startsWith("owner-")) {
      return NextResponse.json(
        { error: "Cannot remove workspace owner" },
        { status: 400 }
      );
    }

    // Find and remove the member
    const member = await db.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    await db.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

