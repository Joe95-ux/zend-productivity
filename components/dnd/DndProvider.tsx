"use client";

import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle card movement within the same list
    if (activeId === overId) return;

    // Get current board data to determine positions
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Find the active card
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
          targetPosition = card.position;
          break;
        }
      }
    }

    if (!targetListId) return;

    // Move the card
    if (activeListId !== targetListId || activeCard.position !== targetPosition) {
      moveCardMutation.mutate({
        cardId: activeId,
        listId: targetListId,
        position: targetPosition,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      {children}
    </DndContext>
  );
}
