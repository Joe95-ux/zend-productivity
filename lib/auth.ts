import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getCurrentUser() {
  try {
    // Get Clerk user ID first
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      console.log("No Clerk user ID found");
      return null;
    }

    // Try to get Clerk user details with error handling
    let clerkUser;
    try {
      clerkUser = await currentUser();
    } catch (clerkError) {
      console.error("Clerk currentUser error:", clerkError);
      // If currentUser fails, we can still work with just the clerkId
      // Try to find existing user in database
      const existingUser = await db.user.findUnique({
        where: { clerkId }
      });
      
      if (existingUser) {
        console.log("Found existing user despite Clerk error");
        return existingUser;
      }
      
      // If no existing user and currentUser failed, return null
      return null;
    }

    if (!clerkUser) {
      console.log("No Clerk user found");
      return null;
    }

    // Try to find existing user
    let user = await db.user.findUnique({
      where: { clerkId }
    });

    // If user doesn't exist, create them
    if (!user) {
      try {
        user = await db.user.create({
          data: {
            clerkId,
            email: clerkUser.emailAddresses[0]?.emailAddress || "",
            name: clerkUser.firstName && clerkUser.lastName 
              ? `${clerkUser.firstName} ${clerkUser.lastName}`
              : clerkUser.firstName || null,
            avatarUrl: clerkUser.imageUrl || null,
          }
        });
        console.log("Created new user:", user.id);
      } catch (dbError) {
        console.error("Database error creating user:", dbError);
        // Try to find user again in case of race condition
        user = await db.user.findUnique({
          where: { clerkId }
        });
        if (!user) {
          return null;
        }
      }
    }

    return user;
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}
