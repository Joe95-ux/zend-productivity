"use client";

import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter, rectIntersection } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DndProviderProps {
  children: React.ReactNode;
  boardId: string;
}

export function DndProvider({ children, boardId }: DndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const moveCardMutation = useMutation({
    mutationFn: async ({ cardId, listId, position }: { cardId: string; listId: string; position: number }) => {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listId, position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move card");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const moveListMutation = useMutation({
    mutationFn: async ({ listId, position }: { listId: string; position: number }) => {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move list");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get current board data
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Find the active card and its current list
    let activeCard = null;
    let activeListId = null;
    
    for (const list of boardData.lists) {
      const card = list.cards.find((c: any) => c.id === activeId);
      if (card) {
        activeCard = card;
        activeListId = list.id;
        break;
      }
    }

    if (!activeCard) return;

    // Find the target list
    let targetListId = null;

    // Check if dropping on a list
    const targetList = boardData.lists.find((l: any) => l.id === overId);
    if (targetList) {
      targetListId = overId;
    } else {
      // Check if dropping on a card
      for (const list of boardData.lists) {
        const card = list.cards.find((c: any) => c.id === overId);
        if (card) {
          targetListId = list.id;
          break;
        }
      }
    }

    // If we're moving to a different list, update the cache optimistically
    if (targetListId && targetListId !== activeListId) {
      queryClient.setQueryData(["board", boardId], (oldData: any) => {
        if (!oldData) return oldData;

        const newLists = oldData.lists.map((list: any) => {
          if (list.id === activeListId) {
            // Remove card from source list
            return {
              ...list,
              cards: list.cards.filter((card: any) => card.id !== activeId)
            };
          }
          if (list.id === targetListId) {
            // Add card to target list at the end
            return {
              ...list,
              cards: [...list.cards, { ...activeCard, listId: targetListId, position: list.cards.length }]
            };
          }
          return list;
        });

        return { ...oldData, lists: newLists };
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get current board data
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Find the active card and its current list
    let activeCard = null;
    let activeListId = null;
    
    for (const list of boardData.lists) {
      const card = list.cards.find((c: any) => c.id === activeId);
      if (card) {
        activeCard = card;
        activeListId = list.id;
        break;
      }
    }

    if (!activeCard) return;

    // Find the target list and position
    let targetListId = null;
    let targetPosition = 0;

    // Check if dropping on a list
    const targetList = boardData.lists.find((l: any) => l.id === overId);
    if (targetList) {
      targetListId = overId;
      targetPosition = targetList.cards.length;
    } else {
      // Check if dropping on a card
      for (const list of boardData.lists) {
        const card = list.cards.find((c: any) => c.id === overId);
        if (card) {
          targetListId = list.id;
          // Find the position of the card we're dropping on
          const cardIndex = list.cards.findIndex((c: any) => c.id === overId);
          targetPosition = cardIndex;
          break;
        }
      }
    }

    if (!targetListId) return;

    // Only move if it's actually a different position
    if (activeListId !== targetListId || activeCard.position !== targetPosition) {
      moveCardMutation.mutate({
        cardId: activeId,
        listId: targetListId,
        position: targetPosition,
      });
    }
  };

  // Get all card IDs for SortableContext
  const boardData = queryClient.getQueryData(["board", boardId]) as any;
  const allCardIds = boardData?.lists?.flatMap((list: any) => list.cards.map((card: any) => card.id)) || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allCardIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
