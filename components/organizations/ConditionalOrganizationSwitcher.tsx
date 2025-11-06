"use client";

import { useOrganizationList, OrganizationSwitcher } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Conditionally renders OrganizationSwitcher only if user has organizations
 * This prevents showing an empty switcher for users without organizations
 */
export function ConditionalOrganizationSwitcher() {
  const { userMemberships, isLoaded } = useOrganizationList();
  const [hasOrganizations, setHasOrganizations] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      // Check if user has any organizations
      // userMemberships includes all orgs the user belongs to
      const orgs = userMemberships?.data || [];
      const hasOrgs = orgs.length > 0;
      setHasOrganizations(hasOrgs);
      
      // Debug logging
      if (hasOrgs) {
        console.log("Organizations found:", orgs.map((m) => m.organization.name));
      } else {
        console.log("No organizations found in Clerk");
      }
    }
  }, [isLoaded, userMemberships]);

  if (!isLoaded) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!hasOrganizations) {
    return null;
  }

  return (
    <div className="w-full">
      <OrganizationSwitcher
        hidePersonal
        appearance={{
          elements: {
            organizationSwitcherTrigger: "w-full px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center justify-between",
            organizationSwitcherPopoverCard: "shadow-lg border border-slate-200 dark:border-slate-700",
            organizationPreview: "px-3 py-2",
            organizationSwitcherTriggerIcon: "text-muted-foreground",
            organizationSwitcherTriggerText: "text-sm font-medium",
          },
        }}
      />
    </div>
  );
}

