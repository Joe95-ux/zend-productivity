"use client";

import { useDragPlaceholder } from "./DndProvider";
import { cn } from "@/lib/utils";

interface DragPlaceholderProps {
  listId: string;
  position: number;
}

export function DragPlaceholder({ listId, position }: DragPlaceholderProps) {
  const { placeholderPosition, activeId } = useDragPlaceholder();

  // Only show placeholder if it's for this list and position
  if (!placeholderPosition || 
      placeholderPosition.listId !== listId || 
      placeholderPosition.position !== position ||
      !activeId) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600",
        "bg-slate-50 dark:bg-slate-800/50 transition-all duration-200",
        "animate-pulse"
      )}
      style={{ height: placeholderPosition.cardHeight }}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 dark:text-slate-500 text-sm">
          Drop here
        </div>
      </div>
    </div>
  );
}
