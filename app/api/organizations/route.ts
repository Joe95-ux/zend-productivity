// app/api/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.organizationMember.findMany({
      where: {
        userId: user.id,
        joinedAt: { not: null },
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
      console.log("Created organization in Clerk:", clerkOrg.id);
    } catch (clerkError: unknown) {
      console.error("Clerk organization creation error:", clerkError);
      let errorMessage = "Failed to create organization in Clerk";
      
      if (clerkError instanceof Error) {
        errorMessage = clerkError.message;
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

    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${orgSlug}-${counter}`;
      counter++;
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
      console.log("Created organization in DB:", organization.id);
    } catch (dbError: unknown) {
      console.error("Database organization creation error:", dbError);
      // If DB creation fails, try to clean up Clerk org
      try {
        await clerk.organizations.deleteOrganization(clerkOrg.id);
        console.log("Cleaned up Clerk organization after DB failure");
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
      console.log("Added creator as admin");
    } catch (memberError: unknown) {
      console.error("Failed to create organization membership:", memberError);
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}