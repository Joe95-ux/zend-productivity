"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { List, Card } from "@/lib/types";
import { toast } from "sonner";

interface BoardData {
  lists: List[];
  title?: string;
  description?: string;
  id?: string;
}

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
        }),
      });
      if (!response.ok) throw new Error("Failed to move all cards");
      return response.json();
    },
    onMutate: async (targetListId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(["board", boardId]);

      // Get current board data
      const currentBoard = queryClient.getQueryData(["board", boardId]) as BoardData | undefined;
      if (!currentBoard) return { previousBoard };

      // Get cards from source list
      const sourceListData = currentBoard.lists?.find((l: List) => l.id === sourceList.id);
      const sourceCards = sourceListData?.cards || [];

      if (sourceCards.length === 0) return { previousBoard };

      // Get target list to determine next position
      const targetListData = currentBoard.lists?.find((l: List) => l.id === targetListId);
      const targetCards = targetListData?.cards || [];
      const nextPosition = targetCards.length > 0 ? Math.max(...targetCards.map((c: Card) => c.position)) + 1 : 1;

      // Optimistically update the cache
      queryClient.setQueryData(["board", boardId], (old: BoardData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l: List) => {
            if (l.id === sourceList.id) {
              // Remove all cards from source list
              return { ...l, cards: [] };
            } else if (l.id === targetListId) {
              // Add all cards to target list with new positions
              const movedCards = sourceCards.map((card: Card, index: number) => ({
                ...card,
                listId: targetListId,
                position: nextPosition + index
              }));
              return { ...l, cards: [...(l.cards || []), ...movedCards] };
            }
            return l;
          })
        };
      });
      
      return { previousBoard };
    },
    onSuccess: (data, targetListId) => {
      // Get list names for success message
      const targetList = targetLists.find((l: List) => l.id === targetListId);
      const sourceListName = sourceList.title;
      const targetListName = targetList?.title || "Unknown List";
      
      // Dismiss loading toast and show success
      toast.dismiss("move-all-cards");
      toast.success(`All cards in list "${sourceListName}" have been moved to list "${targetListName}"`);
    },
    onError: (error: Error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
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
