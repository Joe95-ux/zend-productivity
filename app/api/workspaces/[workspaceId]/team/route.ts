import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/workspaces/[workspaceId]/team - Get organization members for workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    // Get workspace with organization
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: [
                { role: "asc" },
                { joinedAt: "desc" },
              ],
            },
            _count: {
              select: {
                members: true,
                workspaces: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const hasAccess =
      workspace.ownerId === user.id ||
      workspace.members.some((m) => m.userId === user.id) ||
      (workspace.organizationId && workspace.organization);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (!workspace.organization) {
      return NextResponse.json({
        organization: null,
        members: [],
      });
    }

    return NextResponse.json({
      organization: workspace.organization,
      members: workspace.organization.members,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

