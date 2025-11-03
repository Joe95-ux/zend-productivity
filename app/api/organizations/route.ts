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

    // Validate and generate slug
    const orgSlug = slugify(name.trim());
    if (!orgSlug || orgSlug.length === 0) {
      return NextResponse.json(
        { error: "Organization name must contain at least one letter or number" },
        { status: 400 }
      );
    }

    // Create organization in Clerk
    const clerk = await clerkClient();
    let clerkOrg;
    try {
      clerkOrg = await clerk.organizations.createOrganization({
        name: name.trim(),
        slug: orgSlug,
        createdBy: user.clerkId,
      });
    } catch (clerkError: unknown) {
      console.error("Clerk organization creation error:", clerkError);
      let errorMessage = "Failed to create organization in Clerk";
      
      if (clerkError instanceof Error) {
        errorMessage = clerkError.message;
        // Provide more helpful error messages
        if (clerkError.message.includes("already exists") || clerkError.message.includes("slug")) {
          errorMessage = "An organization with this name or a similar name already exists. Please choose a different name.";
        } else if (clerkError.message.includes("permission") || clerkError.message.includes("unauthorized")) {
          errorMessage = "You don't have permission to create organizations. Please check your account settings.";
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Generate unique slug for our database
    let slug = orgSlug;
    let counter = 1;

    while (
      await db.organization.findUnique({
        where: { slug },
      })
    ) {
      slug = `${orgSlug}-${counter}`;
      counter++;
      // Prevent infinite loop
      if (counter > 100) {
        return NextResponse.json(
          { error: "Unable to generate a unique slug. Please try a different organization name." },
          { status: 500 }
        );
      }
    }

    // Create organization in database
    let organization;
    try {
      organization = await db.organization.create({
        data: {
          clerkOrgId: clerkOrg.id,
          name: name.trim(),
          slug,
          description: description?.trim() || null,
        },
      });
    } catch (dbError: unknown) {
      console.error("Database organization creation error:", dbError);
      // If DB creation fails, try to clean up Clerk org
      try {
        await clerk.organizations.deleteOrganization(clerkOrg.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup Clerk organization:", cleanupError);
      }
      
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Failed to create organization in database";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Add creator as admin
    try {
      await db.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "ADMIN",
          joinedAt: new Date(),
        },
      });
    } catch (memberError: unknown) {
      console.error("Failed to create organization membership:", memberError);
      // Don't fail the whole operation if membership creation fails
      // The webhook might handle it
    }

    // Update Clerk organization member role to admin
    try {
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
    } catch (clerkRoleError: unknown) {
      console.error("Failed to update Clerk organization member role:", clerkRoleError);
      // Don't fail the whole operation if role update fails
      // The webhook might handle it
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

