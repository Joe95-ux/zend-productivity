"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Paperclip } from "lucide-react";

export function AttachmentsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      
      {/* Attachments grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="group relative bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* Thumbnail skeleton */}
            <div className="aspect-[4/3] relative">
              <Skeleton className="w-full h-full" />
            </div>
            
            {/* File info skeleton */}
            <div className="p-2 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
