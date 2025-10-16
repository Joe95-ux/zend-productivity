"use client";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { UserProfileButton } from "./UserProfileButton";

interface ConditionalUserProfileProps {
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  size?: "sm" | "md" | "lg";
  showDropdown?: boolean;
}

export function ConditionalUserProfile({ user, size = "md", showDropdown = true }: ConditionalUserProfileProps) {
  const { user: currentUser } = useUser();
  
  // Check if this is the current logged-in user
  const isCurrentUser = currentUser?.emailAddresses?.[0]?.emailAddress === user.email;
  
  if (isCurrentUser) {
    // Show Clerk UserButton for current user
    const sizeClasses = {
      sm: "w-6 h-6",
      md: "w-8 h-8", 
      lg: "w-10 h-10"
    };
    
    return (
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonAvatarBox: sizeClasses[size],
            userButtonPopoverCard: "shadow-lg border border-slate-200 dark:border-slate-700",
            userButtonPopoverActionButton: "hover:bg-slate-100 dark:hover:bg-slate-700",
            userButtonPopoverActionButtonText: "text-slate-900 dark:text-white",
            userButtonPopoverFooter: "hidden" // Hide the footer with "Manage account" link
          }
        }}
      />
    );
  }
  
  // Show custom profile for other users
  return <UserProfileButton user={user} size={size} showDropdown={showDropdown} />;
}
