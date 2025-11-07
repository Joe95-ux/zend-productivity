import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/workspaces/[workspaceId]/boards - List boards in workspace
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

    // Check workspace access
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: true,
        organization: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        },
        members: {
          where: { userId: user.id }
        }
      }
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
      workspace.members.length > 0 ||
      (workspace.organizationId && workspace.organization?.members && workspace.organization.members.length > 0);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch all boards in this workspace (both direct and in projects)
    const boards = await db.board.findMany({
      where: {
        workspaceId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
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
        },
        lists: {
          include: {
            cards: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error fetching workspace boards:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

