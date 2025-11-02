import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/about-us",
  "/contact-us",
  "/pricing",
  "/privacy",
  "/terms",
  "/api/cron/digest",
  "/api/webhooks/clerk", // Add webhook route
  "/onboarding", // Allow onboarding page
]);

async function needsOnboarding(clerkId: string): Promise<boolean> {
  try {
    // Find user in database
    const user = await db.user.findUnique({
      where: { clerkId },
      include: {
        organizationMemberships: {
          where: {
            joinedAt: { not: null }, // Only accepted memberships
          },
        },
        boards: {
          take: 1, // Only need to know if any exist
        },
      },
    });

    // If user doesn't exist in DB yet, they need onboarding
    if (!user) {
      return true;
    }

    // User has completed onboarding if they have:
    // 1. At least one organization membership (accepted)
    // OR 2. At least one board (they've used the app)
    const hasOrganizations = user.organizationMemberships.length > 0;
    const hasBoards = user.boards.length > 0;

    // If they have neither, they need onboarding
    return !hasOrganizations && !hasBoards;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // On error, allow access (fail open) to avoid blocking users
    return false;
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { userId: clerkId } = await auth();

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Check onboarding for authenticated users accessing dashboard
  if (clerkId && request.nextUrl.pathname.startsWith("/dashboard")) {
    const needsOnboardingCheck = await needsOnboarding(clerkId);
    
    if (needsOnboardingCheck) {
      // Redirect to onboarding if they haven't completed it
      const onboardingUrl = new URL("/onboarding", request.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};