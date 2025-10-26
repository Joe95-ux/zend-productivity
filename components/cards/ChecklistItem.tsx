"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChecklistItem as ChecklistItemType, Board, List, Card } from "@/lib/types";

interface ChecklistItemProps {
  item: ChecklistItemType;
  cardId: string;
}

export function ChecklistItem({ item, cardId }: ChecklistItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async ({ content, isCompleted }: { content?: string; isCompleted?: boolean }) => {
      const response = await fetch(`/api/checklist-items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, isCompleted }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update checklist item");
      }

      return response.json();
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board"] });
      
      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(["board"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["board"], (old: Board | undefined) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list: List) => ({
            ...list,
            cards: list.cards.map((c: Card) => 
              c.id === cardId 
                ? {
                    ...c,
                    checklists: c.checklists?.map((checklist) => ({
                      ...checklist,
                      items: checklist.items.map((checklistItem: ChecklistItemType) => 
                        checklistItem.id === item.id 
                          ? { ...checklistItem, isCompleted: newData.isCompleted ?? checklistItem.isCompleted }
                          : checklistItem
                      )
                    }))
                  }
                : c
            )
          }))
        };
      });
      
      return { previousBoard };
    },
    onSuccess: () => {
      // Cache already updated optimistically
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoard) {
        queryClient.setQueryData(["board"], context.previousBoard);
      }
      toast.error("Failed to update checklist item");
    },
  });

  const handleToggle = () => {
    updateItemMutation.mutate({ isCompleted: !item.isCompleted });
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2 rounded-md transition-all duration-300 ease-out cursor-pointer",
        "hover:bg-slate-600/50",
        item.isCompleted && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggle}
    >
      {/* Radio Button */}
      <div className="flex-shrink-0">
        {item.isCompleted ? (
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className={cn(
            "w-5 h-5 border-2 rounded-full transition-all duration-300 ease-out",
            isHovered 
              ? "border-blue-400 bg-blue-400/10" 
              : "border-slate-400 group-hover:border-blue-300"
          )}>
            {isHovered && (
              <div className="w-full h-full rounded-full bg-blue-400/20 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Task Text */}
      <span className={cn(
        "flex-1 text-sm transition-all duration-300 ease-out",
        item.isCompleted 
          ? "line-through text-slate-400" 
          : "text-slate-200 group-hover:text-white"
      )}>
        {item.content}
      </span>
    </div>
  );
}
