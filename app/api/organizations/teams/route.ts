import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/organizations/teams - Get organizations with projects and boards
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization memberships
    const memberships = await db.organizationMember.findMany({
      where: {
        userId: user.id,
        joinedAt: { not: null },
      },
      include: {
        organization: {
          include: {
            workspaces: {
              include: {
                projects: {
                  include: {
                    boards: {
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        updatedAt: true,
                      },
                      orderBy: { updatedAt: "desc" },
                    },
                    _count: {
                      select: {
                        boards: true,
                      },
                    },
                  },
                  orderBy: { createdAt: "desc" },
                },
                boards: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                  },
                  orderBy: { updatedAt: "desc" },
                },
                _count: {
                  select: {
                    projects: true,
                    boards: true,
                  },
                },
              },
              orderBy: { updatedAt: "desc" },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const teams = memberships.map((membership) => ({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        description: membership.organization.description,
        logoUrl: membership.organization.logoUrl,
        _count: membership.organization._count,
      },
      role: membership.role,
      workspaces: membership.organization.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        projects: workspace.projects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          icon: project.icon,
          boards: project.boards,
          _count: project._count,
        })),
        boards: workspace.boards,
        _count: workspace._count,
      })),
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

