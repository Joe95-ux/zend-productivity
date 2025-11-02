import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Error occurred -- no svix headers" },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json(
      { error: "Error occurred -- verification failed" },
      { status: 400 }
    );
  }

  // Handle the webhook
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "organization.created": {
        // Organization is already created via API, just sync if needed
        const { id, name, slug } = evt.data;
        console.log("Organization created in Clerk:", id);
        break;
      }

      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;

        // Find organization in DB
        const org = await db.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) {
          console.log("Organization not found in DB:", organization.id);
          break;
        }

        // Find user by Clerk ID
        const user = await db.user.findUnique({
          where: { clerkId: public_user_data?.user_id },
        });

        if (!user) {
          console.log("User not found in DB:", public_user_data?.user_id);
          break;
        }

        // Map Clerk role to our role
        const mappedRole =
          role === "org:admin"
            ? "ADMIN"
            : role === "org:member"
            ? "MEMBER"
            : role === "org:observer"
            ? "OBSERVER"
            : "MEMBER";

        // Create or update membership
        await db.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
          update: {
            role: mappedRole,
            clerkOrgMemberId: evt.data.id,
            joinedAt: new Date(),
          },
          create: {
            organizationId: org.id,
            userId: user.id,
            role: mappedRole,
            clerkOrgMemberId: evt.data.id,
            joinedAt: new Date(),
          },
        });

        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;

        const org = await db.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) break;

        const user = await db.user.findUnique({
          where: { clerkId: public_user_data?.user_id },
        });

        if (!user) break;

        const mappedRole =
          role === "org:admin"
            ? "ADMIN"
            : role === "org:member"
            ? "MEMBER"
            : role === "org:observer"
            ? "OBSERVER"
            : "MEMBER";

        await db.organizationMember.update({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
          data: {
            role: mappedRole,
          },
        });

        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;

        const org = await db.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) break;

        const user = await db.user.findUnique({
          where: { clerkId: public_user_data?.user_id },
        });

        if (!user) break;

        await db.organizationMember.delete({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
        });

        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

