import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { slugify } from "@/lib/utils";

// GET /api/organizations - List user's organizations
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.organizationMember.findMany({
      where: {
        userId: user.id,
        joinedAt: { not: null }, // Only accepted memberships
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                boards: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create organization
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Create organization in Clerk
    const clerk = await clerkClient();
    let clerkOrg;
    try {
      clerkOrg = await clerk.organizations.createOrganization({
        name: name.trim(),
        slug: slugify(name.trim()),
        createdBy: user.clerkId,
      });
    } catch (clerkError: unknown) {
      console.error("Clerk organization creation error:", clerkError);
      const errorMessage =
        clerkError instanceof Error
          ? clerkError.message
          : "Failed to create organization in Clerk";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Generate unique slug
    const baseSlug = slugify(name.trim());
    let slug = baseSlug;
    let counter = 1;

    while (
      await db.organization.findUnique({
        where: { slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create organization in database
    const organization = await db.organization.create({
      data: {
        clerkOrgId: clerkOrg.id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      },
    });

    // Add creator as admin
    await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "ADMIN",
        joinedAt: new Date(),
      },
    });

    // Update Clerk organization member role to admin
    const clerkMember = await clerk.organizations.getOrganizationMembershipList({
      organizationId: clerkOrg.id,
    });

    const member = clerkMember.data?.find(
      (m) => m.publicUserData?.userId === user.clerkId
    );

    if (member) {
      await clerk.organizations.updateOrganizationMembership({
        organizationId: clerkOrg.id,
        userId: user.clerkId,
        role: "org:admin",
      });
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // If Clerk org was created but DB failed, try to clean up
    if (errorMessage.includes("clerkOrgId")) {
      return NextResponse.json(
        { error: "Organization name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

