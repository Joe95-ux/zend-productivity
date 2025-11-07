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
    <div 
      className="w-full h-full flex items-center justify-start"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <OrganizationSwitcher
        hidePersonal
        createOrganizationMode="modal"
        organizationProfileMode="modal"
        appearance={{
          elements: {
            organizationSwitcherTrigger: "w-full px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center justify-between text-foreground dark:text-white",
            organizationSwitcherPopoverCard: "shadow-lg border border-slate-200 dark:border-slate-700",
            organizationPreview: "px-3 py-2",
            organizationSwitcherTriggerIcon: "text-muted-foreground dark:text-slate-300",
            organizationSwitcherTriggerText: "text-sm font-medium text-foreground dark:text-white !important",
            organizationSwitcherButton: "text-foreground dark:text-white",
            organizationPreviewMainIdentifier: "text-foreground dark:text-white",
            organizationPreviewSecondaryIdentifier: "text-muted-foreground dark:text-slate-300",
          },
        }}
      />
    </div>
  );
}

