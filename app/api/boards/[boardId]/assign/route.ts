import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/boards/[boardId]/assign - Assign board to workspace or project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const body = await request.json();
    const { workspaceId, projectId } = body;

    // Validate that board exists and user owns it
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: true,
        project: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.ownerId !== user.id) {
      return NextResponse.json({ error: "Only board owner can assign it" }, { status: 403 });
    }

    // If assigning to a project, validate project exists and user has access
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: {
            include: {
              owner: true,
              organization: {
                include: {
                  members: {
                    where: { userId: user.id },
                  },
                },
              },
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      // Check access to project's workspace
      const hasAccess =
        project.workspace.ownerId === user.id ||
        (project.workspace.organizationId && project.workspace.organization?.members && project.workspace.organization.members.length > 0) ||
        project.workspace.members.length > 0;

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to project workspace" }, { status: 403 });
      }

      // Assign to project (projectId implies workspaceId)
      const updatedBoard = await db.board.update({
        where: { id: boardId },
        data: {
          projectId,
          workspaceId: project.workspaceId,
          organizationId: project.workspace.organizationId || null,
        },
        include: {
          workspace: true,
          project: true,
        },
      });

      return NextResponse.json(updatedBoard);
    }

    // If assigning to workspace only, validate workspace exists and user has access
    if (workspaceId) {
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          owner: true,
          organization: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
          members: {
            where: { userId: user.id },
          },
        },
      });

      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      // Check access
      const hasAccess =
        workspace.ownerId === user.id ||
        (workspace.organizationId && workspace.organization?.members && workspace.organization.members.length > 0) ||
        workspace.members.length > 0;

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
      }

      // Assign to workspace (remove from project if it was in one)
      const updatedBoard = await db.board.update({
        where: { id: boardId },
        data: {
          workspaceId,
          projectId: null, // Remove from project if moving to workspace directly
          organizationId: workspace.organizationId || null,
        },
        include: {
          workspace: true,
          project: true,
        },
      });

      return NextResponse.json(updatedBoard);
    }

    // If both are null, unassign from workspace/project (make it personal)
    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: {
        workspaceId: null,
        projectId: null,
        organizationId: null,
      },
      include: {
        workspace: true,
        project: true,
      },
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
    console.error("Error assigning board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

