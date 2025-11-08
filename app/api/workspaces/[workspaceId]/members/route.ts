import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/workspaces/[workspaceId]/members - Get workspace members
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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all"; // "all", "admin", "member"
    const sortBy = searchParams.get("sortBy") || "name"; // "name", "role", "joined"

    // Get workspace with members
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
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

    // Format members: include owner as admin
    const ownerMember = workspace.owner ? {
      id: `owner-${workspace.ownerId}`,
      user: workspace.owner,
      role: "admin" as const,
      createdAt: workspace.createdAt,
    } : null;

    const allMembers = [
      ...(ownerMember ? [ownerMember] : []),
      ...workspace.members
        .filter((m) => m.user !== null)
        .map((m) => ({
          id: m.id,
          user: m.user!,
          role: m.role as "admin" | "member",
          createdAt: m.createdAt,
        })),
    ];

    // Apply filters
    let filteredMembers = allMembers;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMembers = filteredMembers.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(searchLower) ||
          m.user?.email.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (role !== "all") {
      filteredMembers = filteredMembers.filter((m) => m.role === role);
    }

    // Sort
    filteredMembers.sort((a, b) => {
      switch (sortBy) {
        case "name":
          const aName = a.user?.name || a.user?.email || "";
          const bName = b.user?.name || b.user?.email || "";
          return aName.localeCompare(bName);
        case "role":
          return a.role.localeCompare(b.role);
        case "joined":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return NextResponse.json({
      members: filteredMembers,
      total: filteredMembers.length,
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

