"use client";

import { useOrganizationList, OrganizationSwitcher } from "@clerk/nextjs";

/**
 * Renders OrganizationSwitcher with creation mode enabled
 * Users can create organizations directly from Clerk's UI
 * The webhook will automatically sync new organizations to our database
 */
export function ConditionalOrganizationSwitcher() {
  const { isLoaded } = useOrganizationList();

  if (!isLoaded) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full">
      <OrganizationSwitcher
        hidePersonal
        createOrganizationMode="modal"
        organizationProfileMode="modal"
        appearance={{
          elements: {
            organizationSwitcherTrigger: "w-full px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center justify-between dark:text-white text-muted-foreground",
            organizationSwitcherPopoverCard: "shadow-lg border border-slate-200 dark:border-slate-700",
            organizationPreview: "px-3 py-2",
            organizationSwitcherTriggerIcon: "text-muted-foreground",
            organizationSwitcherTriggerText: "text-sm font-medium text-muted-foreground dark:text-white",
          },
        }}
      />
    </div>
  );
}

