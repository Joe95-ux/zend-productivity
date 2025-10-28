"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { SquareCheckBig } from "lucide-react";

export function ChecklistSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SquareCheckBig className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      
      {/* Progress bar skeleton */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <Skeleton className="h-2 w-3/4 rounded-full" />
      </div>
      
      {/* Checklist items skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      
      {/* Add item button skeleton */}
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function ChecklistsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <ChecklistSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
