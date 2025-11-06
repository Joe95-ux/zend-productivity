import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/about-us",
  "/contact-us",
  "/pricing",
  "/privacy",
  "/terms",
  "/api/webhooks/clerk", // Clerk webhooks need to be public
  "/onboarding",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId: clerkId } = await auth();

  // Only protect non-public, non-API routes
  // Let individual API routes handle their own authentication
  if (!isPublicRoute(request) && !request.nextUrl.pathname.startsWith('/api/')) {
    await auth.protect();
  }

  // Onboarding redirect - only for non-API routes
  if (clerkId && 
      !request.nextUrl.pathname.startsWith("/onboarding") && 
      !isPublicRoute(request) &&
      !request.nextUrl.pathname.startsWith('/api/') // Skip APIs
  ) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/check-onboarding?clerkId=${clerkId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.needsOnboarding) {
          const onboardingUrl = new URL("/onboarding", request.url);
          return NextResponse.redirect(onboardingUrl);
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // Continue without redirect on error
    }
  }
});

export const config = {
  matcher: [
    // Skip middleware for ALL API routes
    "/((?!_next|api|_next/static|_next/image|favicon.ico).*)",
  ],
};