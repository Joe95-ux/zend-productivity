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

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name = clerkUser.firstName && clerkUser.lastName 
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.firstName || null;

    // Try to find existing user by clerkId first (primary lookup)
    let user = await db.user.findUnique({
      where: { clerkId }
    });

    // If not found by clerkId, check by email (in case user changed Clerk accounts)
    if (!user && email) {
      const userByEmail = await db.user.findUnique({
        where: { email }
      });
      
      // If found by email but different clerkId, check if the new clerkId is available
      if (userByEmail && userByEmail.clerkId !== clerkId) {
        // Check if the new clerkId is already taken by another user
        const userWithNewClerkId = await db.user.findUnique({
          where: { clerkId }
        });
        
        if (!userWithNewClerkId) {
          // New clerkId is available - update existing user's clerkId
          try {
            user = await db.user.update({
              where: { email },
              data: { clerkId }
            });
            console.log("Updated user clerkId:", user.id);
          } catch (updateError) {
            console.error("Error updating user clerkId:", updateError);
            // If update fails, try finding by clerkId again (maybe another request updated it)
            user = await db.user.findUnique({
              where: { clerkId }
            });
          }
        } else {
          // Both email and clerkId are taken by different users - this is a conflict
          // Use the user with matching clerkId (current session)
          user = userWithNewClerkId;
          console.log("Email conflict detected - using user with matching clerkId");
        }
      } else if (userByEmail) {
        // Same clerkId - use it
        user = userByEmail;
      }
    }

    // If user still doesn't exist, create them
    if (!user) {
      try {
        user = await db.user.create({
          data: {
            clerkId,
            email: email || `temp-${clerkId}@placeholder.com`, // Fallback email if none provided
            name,
            avatarUrl: clerkUser.imageUrl || null,
          }
        });
        console.log("Created new user:", user.id);
      } catch (dbError) {
        console.error("Database error creating user:", dbError);
        // Handle race condition - user might have been created between check and create
        // Try finding by clerkId first
        user = await db.user.findUnique({
          where: { clerkId }
        });
        
        // If still not found, try by email
        if (!user && email) {
          user = await db.user.findUnique({
            where: { email }
          });
        }
        
        if (!user) {
          return null;
        }
      }
    } else {
      // User exists - update their info if needed
      try {
        user = await db.user.update({
          where: { clerkId: user.clerkId },
          data: {
            email: email || undefined,
            name: name || undefined,
            avatarUrl: clerkUser.imageUrl || undefined,
          }
        });
      } catch (updateError) {
        // If update fails, just use the existing user
        console.error("Error updating user info:", updateError);
      }
    }

    return user;
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}
