"use client";

import { ReactNode } from "react";

/**
 * OrganizationProviderWrapper is no longer needed in Clerk v5+
 * Organization context is automatically provided by ClerkProvider
 * when organizations are enabled in the Clerk dashboard.
 */
export function OrganizationProviderWrapper({ children }: { children: ReactNode }) {
  // Organization context is provided automatically by ClerkProvider
  return <>{children}</>;
}

