import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { isOrgAdmin } from "@/lib/org-permissions";
import { sendEmailNotification } from "@/lib/email";

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

          // Send email notification to existing user
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const dashboardUrl = `${appUrl}/dashboard`;
          
          const emailResult = await sendEmailNotification({
            to: existingUser.email,
            subject: `You've been added to ${organization.name} on Zend Productivity`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Organization Invitation</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                  }
                  .container {
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .header {
                    border-bottom: 1px solid #e9ecef;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                  }
                  .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #14b8a6;
                  }
                  .content {
                    margin: 20px 0;
                  }
                  .message {
                    font-size: 16px;
                    margin: 15px 0;
                    padding: 15px;
                    background-color: #f0fdfa;
                    border-radius: 6px;
                    border-left: 4px solid #14b8a6;
                  }
                  .button {
                    display: inline-block;
                    background-color: #14b8a6;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 500;
                    margin: 15px 0;
                  }
                  .button:hover {
                    background-color: #0d9488;
                  }
                  .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    font-size: 12px;
                    color: #6b7280;
                    text-align: center;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">Zend Productivity</div>
                  </div>
                  
                  <div class="content">
                    <h2>You've been added to a team!</h2>
                    <div class="message">
                      <p>You've been added to <strong>${organization.name}</strong> on Zend Productivity as a <strong>${role}</strong>.</p>
                      <p>Click the button below to view your organization and start collaborating.</p>
                    </div>
                    
                    <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${dashboardUrl}" style="color: #14b8a6; word-break: break-all;">${dashboardUrl}</a>
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p>This invitation was sent by ${user.name || user.email}.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (emailResult.success) {
            console.log(`Email notification sent to existing user ${email}`);
          } else {
            console.error(`Failed to send email to ${email}:`, emailResult.error);
          }

          invitations.push({ email, status: "invited", userId: existingUser.id });
        } catch (error) {
          console.error(`Error inviting ${email}:`, error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          invitations.push({ email, status: "error", error: errorMessage });
        }
      } else {
        // User doesn't exist yet - send invitation via Clerk and email
        try {
          // Create invitation in Clerk
          const clerkInvitation = await clerk.organizations.createOrganizationInvitation({
            organizationId: organization.clerkOrgId,
            emailAddress: email.trim().toLowerCase(),
            role: role === "ADMIN" ? "org:admin" : role === "OBSERVER" ? "org:observer" : "org:member",
          });

          console.log(`Created Clerk invitation for ${email}:`, clerkInvitation.id);

          // Send email invitation
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const signupUrl = `${appUrl}/sign-up?redirect_url=${encodeURIComponent(`${appUrl}/dashboard`)}`;
          
          const emailResult = await sendEmailNotification({
            to: email.trim().toLowerCase(),
            subject: `You've been invited to join ${organization.name} on Zend Productivity`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Organization Invitation</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                  }
                  .container {
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .header {
                    border-bottom: 1px solid #e9ecef;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                  }
                  .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #14b8a6;
                  }
                  .content {
                    margin: 20px 0;
                  }
                  .message {
                    font-size: 16px;
                    margin: 15px 0;
                    padding: 15px;
                    background-color: #f0fdfa;
                    border-radius: 6px;
                    border-left: 4px solid #14b8a6;
                  }
                  .button {
                    display: inline-block;
                    background-color: #14b8a6;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 500;
                    margin: 15px 0;
                  }
                  .button:hover {
                    background-color: #0d9488;
                  }
                  .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    font-size: 12px;
                    color: #6b7280;
                    text-align: center;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">Zend Productivity</div>
                  </div>
                  
                  <div class="content">
                    <h2>You've been invited!</h2>
                    <div class="message">
                      <p>You've been invited to join <strong>${organization.name}</strong> on Zend Productivity as a <strong>${role}</strong>.</p>
                      <p>Click the button below to accept the invitation and get started.</p>
                    </div>
                    
                    <a href="${signupUrl}" class="button">Accept Invitation</a>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${signupUrl}" style="color: #14b8a6; word-break: break-all;">${signupUrl}</a>
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p>This invitation was sent by ${user.name || user.email}.</p>
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (emailResult.success) {
            console.log(`Email invitation sent to ${email}`);
            invitations.push({
              email,
              status: "invited",
              clerkInvitationId: clerkInvitation.id,
            });
          } else {
            console.error(`Failed to send email to ${email}:`, emailResult.error);
            // Still mark as invited since Clerk invitation was created
            invitations.push({
              email,
              status: "invited",
              clerkInvitationId: clerkInvitation.id,
              emailError: emailResult.error,
            });
          }
        } catch (error) {
          console.error(`Error inviting ${email}:`, error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          invitations.push({ email, status: "error", error: errorMessage });
        }
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

