import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/workspaces/[workspaceId]/projects - List projects in workspace
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

    const projects = await db.project.findMany({
      where: { workspaceId },
      include: {
        boards: {
          select: { id: true, title: true, description: true },
          orderBy: { updatedAt: "desc" }
        },
        _count: {
          select: { boards: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/workspaces/[workspaceId]/projects - Create project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Check workspace access and permissions
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
    const isOwner = workspace.ownerId === user.id;
    const isOrgMember = workspace.organizationId && workspace.organization?.members && workspace.organization.members.length > 0;
    const isWorkspaceMember = workspace.members.length > 0;

    if (!isOwner && !isOrgMember && !isWorkspaceMember) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if user has admin role (for workspace members)
    if (!isOwner && !isOrgMember) {
      const member = workspace.members[0];
      if (member.role !== "admin") {
        return NextResponse.json(
          { error: "Only workspace admins can create projects" },
          { status: 403 }
        );
      }
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        workspaceId,
        color: color || null,
        icon: icon || null,
        status: "active"
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true }
        },
        boards: true,
        _count: {
          select: { boards: true }
        }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

