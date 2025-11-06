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

    // Validate slug format for Clerk (alphanumeric, hyphens, 3-63 chars)
    if (orgSlug.length < 3) {
      return NextResponse.json(
        { error: "Organization name must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (orgSlug.length > 63) {
      return NextResponse.json(
        { error: "Organization name is too long. Please use a shorter name." },
        { status: 400 }
      );
    }

    // Validate slug doesn't start or end with hyphen (Clerk requirement)
    if (orgSlug.startsWith("-") || orgSlug.endsWith("-")) {
      return NextResponse.json(
        { error: "Organization name cannot start or end with special characters" },
        { status: 400 }
      );
    }

    // Create organization in Clerk
    const clerk = await clerkClient();
    let clerkOrg;
    try {
      // Validate required fields before calling Clerk
      if (!user.clerkId) {
        return NextResponse.json(
          { error: "User Clerk ID is missing" },
          { status: 400 }
        );
      }

      const orgName = name.trim();
      console.log("Creating Clerk organization with:", {
        name: orgName,
        slug: orgSlug,
        createdBy: user.clerkId,
      });

      // Try creating organization - createdBy might be optional in some Clerk versions
      // If it fails, we'll get detailed error from Clerk
      clerkOrg = await clerk.organizations.createOrganization({
        name: orgName,
        slug: orgSlug,
        ...(user.clerkId && { createdBy: user.clerkId }),
      });
      console.log("Created organization in Clerk:", clerkOrg.id);
    } catch (clerkError: unknown) {
      console.error("Clerk organization creation error:", clerkError);
      
      // Extract detailed error information
      let errorMessage = "Failed to create organization in Clerk";
      let errorDetails: string[] = [];
      
      if (clerkError && typeof clerkError === "object") {
        // Check if it's a Clerk error object with errors array
        if ("errors" in clerkError && Array.isArray(clerkError.errors)) {
          errorDetails = clerkError.errors.map((err: unknown) => {
            if (err && typeof err === "object" && "message" in err) {
              return String(err.message);
            }
            return String(err);
          });
          console.error("Clerk error details:", errorDetails);
        }
        
        // Check for status and message
        if ("status" in clerkError) {
          console.error("Clerk error status:", clerkError.status);
        }
        
        if ("message" in clerkError && typeof clerkError.message === "string") {
          errorMessage = clerkError.message;
        }
      } else if (clerkError instanceof Error) {
        errorMessage = clerkError.message;
      }
      
      // Provide user-friendly error messages
      if (errorMessage.includes("already exists") || errorMessage.includes("slug") || errorDetails.some(d => d.includes("slug"))) {
        errorMessage = "An organization with this name or a similar name already exists. Please choose a different name.";
      } else if (errorMessage.includes("permission") || errorMessage.includes("unauthorized") || errorDetails.some(d => d.includes("permission"))) {
        errorMessage = "You don't have permission to create organizations. Please check your account settings.";
      } else if (errorMessage.includes("Bad Request") || errorDetails.some(d => d.includes("required") || d.includes("invalid"))) {
        errorMessage = `Invalid organization data: ${errorDetails.join(", ") || errorMessage}`;
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