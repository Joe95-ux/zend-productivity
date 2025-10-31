"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChecklistItem as ChecklistItemType, Board, List, Card, Checklist } from "@/lib/types";

interface ChecklistItemDndContextType {
  reorderItems: (checklistId: string, startIndex: number, endIndex: number) => void;
  isReordering: boolean;
}

const ChecklistItemDndContext = createContext<ChecklistItemDndContextType | undefined>(undefined);

export function useChecklistItemDnd() {
  const context = useContext(ChecklistItemDndContext);
  if (!context) {
    throw new Error("useChecklistItemDnd must be used within a ChecklistItemDndProvider");
  }
  return context;
}

interface ChecklistItemDndProviderProps {
  children: React.ReactNode;
  checklistId: string;
  boardId: string;
  items: ChecklistItemType[];
}

export function ChecklistItemDndProvider({ 
  children, 
  checklistId, 
  boardId, 
  items 
}: ChecklistItemDndProviderProps) {
  const [isReordering, setIsReordering] = useState(false);
  const queryClient = useQueryClient();

  const reorderItemsMutation = useMutation({
    mutationFn: async ({ 
      checklistId, 
      itemId, 
      newPosition 
    }: { 
      checklistId: string; 
      itemId: string; 
      newPosition: number; 
    }) => {
      const response = await fetch(`/api/checklist-items/${itemId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId, newPosition }),
      });
      if (!response.ok) throw new Error("Failed to reorder item");
      return response.json();
    },
    onMutate: async ({ checklistId, itemId, newPosition }) => {
      setIsReordering(true);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(["board", boardId]);

      // Optimistically update the cache
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list: List) => ({
            ...list,
            cards: list.cards.map((card: Card) => ({
              ...card,
              checklists: card.checklists?.map((checklist: Checklist) => 
                checklist.id === checklistId 
                  ? {
                      ...checklist,
                      items: reorderArray(checklist.items, itemId, newPosition)
                    }
                  : checklist
              )
            }))
          }))
        };
      });

      return { previousBoard };
    },
    onSuccess: () => {
      // Silent success for smooth UX
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
      toast.error("Failed to reorder items");
    },
    onSettled: () => {
      setIsReordering(false);
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const reorderArray = (array: ChecklistItemType[], itemId: string, newPosition: number) => {
    const newArray = [...array];
    const itemIndex = newArray.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return array;
    
    const [movedItem] = newArray.splice(itemIndex, 1);
    newArray.splice(newPosition, 0, movedItem);
    
    return newArray;
  };

  const reorderItems = useCallback((checklistId: string, startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    
    const item = items[startIndex];
    if (!item) return;

    reorderItemsMutation.mutate({
      checklistId,
      itemId: item.id,
      newPosition: endIndex
    });
  }, [items, reorderItemsMutation, checklistId]);

  const contextValue = {
    reorderItems,
    isReordering,
  };

  return (
    <ChecklistItemDndContext.Provider value={contextValue}>
      <Droppable droppableId={checklistId} type="checklist-item">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1 ${snapshot.isDraggingOver ? 'transition-colors duration-200 bg-blue-50 dark:bg-blue-900/20 rounded-md p-2' : ''}`}
            style={{
              minHeight: '20px',
            }}
          >
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </ChecklistItemDndContext.Provider>
  );
}
