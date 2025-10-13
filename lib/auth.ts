import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getCurrentUser() {
  try {
    const { userId: clerkId} = await auth();
    const clerkUser = await currentUser();

    if (!clerkId || !clerkUser) {
      return null;
    }

    // Try to find existing user
    let user = await db.user.findUnique({
      where: { clerkId }
    });

    // If user doesn't exist, create them
    if (!user) {
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
    }

    return user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}
