"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export function useCurrentUserId() {
  const { user: clerkUser } = useUser();

  const { data: userId } = useQuery({
    queryKey: ["current-user-id", clerkUser?.emailAddresses?.[0]?.emailAddress],
    queryFn: async () => {
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress) return null;
      
      const response = await fetch("/api/user/current");
      if (!response.ok) return null;
      
      const user = await response.json();
      return user?.id || null;
    },
    enabled: !!clerkUser?.emailAddresses?.[0]?.emailAddress,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return userId;
}

