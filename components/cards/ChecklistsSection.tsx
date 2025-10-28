"use client";

import { ChecklistsSkeleton } from "./ChecklistSkeleton";

interface ChecklistsSectionProps {
  checklists: any[];
  isLoading?: boolean;
  children: React.ReactNode;
}

export function ChecklistsSection({ checklists, isLoading = false, children }: ChecklistsSectionProps) {
  if (isLoading) {
    return <ChecklistsSkeleton />;
  }

  if (!checklists || checklists.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900 dark:text-white">Checklists</h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
