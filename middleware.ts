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
  "/api/cron/digest",
  "/api/webhooks/clerk",
  "/onboarding",
  "/api/check-onboarding", // Add this route to public routes
]);

async function needsOnboarding(clerkId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/check-onboarding?clerkId=${clerkId}`
    );
    
    if (!response.ok) {
      return false; // Fail open
    }

    const data = await response.json();
    return data.needsOnboarding;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false; // Fail open
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { userId: clerkId } = await auth();

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Check onboarding for authenticated users accessing protected routes
  if (clerkId && !request.nextUrl.pathname.startsWith("/onboarding") && !isPublicRoute(request)) {
    const needsOnboardingCheck = await needsOnboarding(clerkId);
    
    if (needsOnboardingCheck) {
      const onboardingUrl = new URL("/onboarding", request.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};