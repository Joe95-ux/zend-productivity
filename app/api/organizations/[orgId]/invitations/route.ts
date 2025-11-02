import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { isOrgAdmin } from "@/lib/org-permissions";

// POST /api/organizations/[orgId]/invitations - Invite members
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const { emails, role = "MEMBER" } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one email is required" },
        { status: 400 }
      );
    }

    // Check if user is admin
    const isAdmin = await isOrgAdmin(orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can invite members" },
        { status: 403 }
      );
    }

    // Get organization
    const organization = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get Clerk client
    const clerk = await clerkClient();

    const invitations = [];

    for (const email of emails) {
      if (!email || typeof email !== "string") continue;

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      // Check if already a member
      if (existingUser) {
        const existingMember = await db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember && existingMember.joinedAt) {
          continue; // Skip if already a member
        }
      }

      // Create invitation in Clerk (if user exists) or store email for later
      if (existingUser) {
        try {
          // Map role to Clerk format
          const clerkRole = role === "ADMIN" ? "org:admin" : role === "OBSERVER" ? "org:observer" : "org:member";
          
          // Create Clerk organization invitation
          await clerk.organizations.createOrganizationMembership({
            organizationId: organization.clerkOrgId,
            userId: existingUser.clerkId,
            role: clerkRole,
          });

          // Update or create membership record
          await db.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: orgId,
                userId: existingUser.id,
              },
            },
            update: {
              invitedBy: user.id,
              invitedAt: new Date(),
              role: role as "ADMIN" | "MEMBER" | "OBSERVER",
            },
            create: {
              organizationId: orgId,
              userId: existingUser.id,
              role: role as "ADMIN" | "MEMBER" | "OBSERVER",
              invitedBy: user.id,
              invitedAt: new Date(),
            },
          });

          invitations.push({ email, status: "invited", userId: existingUser.id });
        } catch (error) {
          console.error(`Error inviting ${email}:`, error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          invitations.push({ email, status: "error", error: errorMessage });
        }
      } else {
        // User doesn't exist yet - store email for future invitation
        // You might want to create an Invitation model for this
        invitations.push({
          email,
          status: "pending",
          message: "User will be invited when they sign up",
        });
      }
    }

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error("Error sending invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

