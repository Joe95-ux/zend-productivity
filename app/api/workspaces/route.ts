import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// GET /api/workspaces - List user's workspaces
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get personal workspaces (owned by user)
    const personalWorkspaces = await db.workspace.findMany({
      where: { ownerId: user.id },
      include: {
        projects: {
          include: {
            boards: {
              select: { id: true, title: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        boards: {
          where: { projectId: null }, // Only boards not in a project
          select: { id: true, title: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: {
            projects: true,
            boards: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Get organization workspaces (where user is a member)
    const orgMemberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            workspaces: {
              include: {
                projects: {
                  include: {
                    boards: {
                      select: { id: true, title: true }
                    }
                  },
                  orderBy: { createdAt: "desc" }
                },
                boards: {
                  where: { projectId: null },
                  select: { id: true, title: true }
                },
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, avatarUrl: true }
                    }
                  }
                },
                _count: {
                  select: {
                    projects: true,
                    boards: true
                  }
                }
              },
              orderBy: { updatedAt: "desc" }
            }
          }
        }
      }
    });

    const orgWorkspaces = orgMemberships.flatMap(
      (membership) => membership.organization.workspaces
    );

    // Also include workspaces with organizationId where user is a workspace member
    // This handles cases where workspace was created during onboarding before org membership was synced
    const userOrgWorkspaceMemberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        workspace: {
          organizationId: { not: null },
          // Exclude workspaces already in orgWorkspaces
          id: { notIn: orgWorkspaces.map(w => w.id) }
        }
      },
      include: {
        workspace: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            projects: {
              include: {
                boards: {
                  select: { id: true, title: true }
                }
              },
              orderBy: { createdAt: "desc" }
            },
            boards: {
              where: { projectId: null },
              select: { id: true, title: true }
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true }
                }
              }
            },
            _count: {
              select: {
                projects: true,
                boards: true
              }
            }
          }
        }
      }
    });

    // Merge user workspace memberships into orgWorkspaces
    const allOrgWorkspaces = [
      ...orgWorkspaces,
      ...userOrgWorkspaceMemberships.map(wm => wm.workspace)
    ];

    // Get workspaces where user is a member (shared personal workspaces)
    // Exclude workspaces that are already in personal or organization workspaces
    const personalWorkspaceIds = new Set(personalWorkspaces.map(w => w.id));
    const orgWorkspaceIds = new Set(allOrgWorkspaces.map(w => w.id));
    const sharedWorkspaces = await db.workspaceMember.findMany({
      where: { 
        userId: user.id,
        workspaceId: { 
          notIn: [...personalWorkspaceIds, ...orgWorkspaceIds]
        }
      },
      include: {
        workspace: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            },
            projects: {
              include: {
                boards: {
                  select: { id: true, title: true }
                }
              },
              orderBy: { createdAt: "desc" }
            },
            boards: {
              where: { projectId: null },
              select: { id: true, title: true }
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true }
                }
              }
            },
            _count: {
              select: {
                projects: true,
                boards: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      personal: personalWorkspaces,
      organization: allOrgWorkspaces,
      shared: sharedWorkspaces.map((wm) => wm.workspace)
    });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/workspaces - Create workspace
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, organizationId, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Validate organization access if provided
    let dbOrganizationId: string | null = null;
    if (organizationId) {
      // Check if organizationId is a Clerk ID (starts with "org_")
      // or our database ObjectID
      let organization;
      if (organizationId.startsWith("org_")) {
        // It's a Clerk organization ID, find our database organization
        organization = await db.organization.findUnique({
          where: { clerkOrgId: organizationId }
        });
        
        if (!organization) {
          return NextResponse.json(
            { error: "Organization not found. Please wait a moment and try again." },
            { status: 404 }
          );
        }
        
        dbOrganizationId = organization.id;
      } else {
        // Assume it's already our database ObjectID
        organization = await db.organization.findUnique({
          where: { id: organizationId }
        });
        
        if (!organization) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
          );
        }
        
        dbOrganizationId = organizationId;
      }

      // Check if user is an admin of the organization
      // At this point, dbOrganizationId should never be null due to earlier checks
      if (!dbOrganizationId) {
        return NextResponse.json(
          { error: "Invalid organization" },
          { status: 400 }
        );
      }

      const orgMember = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: dbOrganizationId,
            userId: user.id
          }
        }
      });

      if (!orgMember || orgMember.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only organization admins can create workspaces" },
          { status: 403 }
        );
      }
    }

    // Generate unique slug
    const baseSlug = slugify(name.trim());
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db.workspace.findFirst({
        where: dbOrganizationId
          ? { organizationId: dbOrganizationId, slug }
          : { ownerId: user.id, slug }
      });

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        color: color || null,
        icon: icon || null,
        ownerId: dbOrganizationId ? null : user.id,
        organizationId: dbOrganizationId || null,
        status: "active",
        // Always add the creator as a workspace member (admin role)
        // This ensures they can see the workspace even if organization membership isn't synced yet
        members: {
          create: {
            userId: user.id,
            role: "admin"
          }
        }
      },
      include: {
        owner: dbOrganizationId ? undefined : {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        organization: dbOrganizationId ? {
          select: { id: true, name: true, slug: true }
        } : undefined,
        projects: true,
        boards: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: {
            projects: true,
            boards: true
          }
        }
      }
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

