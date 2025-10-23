"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { List } from "@/lib/types";
import { toast } from "sonner";

interface MoveAllCardsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  sourceList: List;
  targetLists: List[];
  boardId: string;
}

export function MoveAllCardsMenu({ 
  isOpen, 
  onClose, 
  onBack,
  sourceList, 
  targetLists, 
  boardId 
}: MoveAllCardsMenuProps) {
  const queryClient = useQueryClient();

  const moveAllCardsMutation = useMutation({
    mutationFn: async (targetListId: string) => {
      // Show loading toast
      const targetList = targetLists.find((l: List) => l.id === targetListId);
      const sourceListName = sourceList.title;
      const targetListName = targetList?.title || "Unknown List";

      toast.loading(`Moving all cards in list "${sourceListName}" to "${targetListName}"`, {
        id: "move-all-cards"
      });

      const response = await fetch("/api/cards/move-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceListId: sourceList.id,
          targetListId: targetListId,
          boardId: boardId,
        }),
      });
      if (!response.ok) throw new Error("Failed to move all cards");
      return response.json();
    },
    onSuccess: (data, targetListId) => {
      // Get list names for success message
      const targetList = targetLists.find((l: List) => l.id === targetListId);
      const sourceListName = sourceList.title;
      const targetListName = targetList?.title || "Unknown List";
      
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      
      // Dismiss loading toast and show success
      toast.dismiss("move-all-cards");
      toast.success(`All cards in list "${sourceListName}" have been moved to list "${targetListName}"`);
    },
    onError: (error: Error) => {
      // Dismiss loading toast and show error
      toast.dismiss("move-all-cards");
      toast.error(error.message);
    },
  });

  if (!isOpen) return null;

  return (
    <div onClick={onClose}>
      <div 
        className="absolute bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg min-w-[240px]"
        style={{ 
          left: 'calc(100% - 43px)',
          top: '45px',
          zIndex: 50,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={onBack}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
          <span className="font-medium text-slate-900 dark:text-white text-sm">
            Move all cards in list
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-1">
          {targetLists.map((targetList: List) => (
            <div
              key={targetList.id}
              onClick={() => {
                if (targetList.id !== sourceList.id) {
                  onClose(); // Close menu immediately
                  moveAllCardsMutation.mutate(targetList.id);
                }
              }}
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer transition-colors",
                targetList.id === sourceList.id
                  ? "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <span className="font-medium">{targetList.title}</span>
              {targetList.id === sourceList.id && (
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  (current)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
