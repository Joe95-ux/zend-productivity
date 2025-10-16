"use client";

import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay } from "@dnd-kit/core";
import { useState, createContext, useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DragPlaceholderContextType {
  placeholderPosition: {
    listId: string;
    position: number;
    cardHeight: number;
  } | null;
  activeId: string | null;
}

const DragPlaceholderContext = createContext<DragPlaceholderContextType>({
  placeholderPosition: null,
  activeId: null,
});

export const useDragPlaceholder = () => useContext(DragPlaceholderContext);

interface DndProviderProps {
  children: React.ReactNode;
  boardId: string;
}

export function DndProvider({ children, boardId }: DndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [placeholderPosition, setPlaceholderPosition] = useState<{
    listId: string;
    position: number;
    cardHeight: number;
  } | null>(null);
  const [lastOverId, setLastOverId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 20,
        delay: 200,
        tolerance: 10,
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
      toast.success("Card moved successfully!");
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
      toast.success("List reordered successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    setActiveId(activeId);

    // Get current board data to find the card and its position
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Find the active card and its current list
    for (const list of boardData.lists) {
      const cardIndex = list.cards.findIndex((c: any) => c.id === activeId);
      if (cardIndex !== -1) {
        // Set initial placeholder position
        setPlaceholderPosition({
          listId: list.id,
          position: cardIndex,
          cardHeight: 48, // Standard card height
        });
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only update if the target has actually changed
    if (lastOverId === overId) return;
    setLastOverId(overId);

    // Get current board data
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Find the active card and its current list
    let activeCard = null;
    let activeListId = null;
    let activeCardIndex = -1;
    
    for (const list of boardData.lists) {
      const cardIndex = list.cards.findIndex((c: any) => c.id === activeId);
      if (cardIndex !== -1) {
        activeCard = list.cards[cardIndex];
        activeListId = list.id;
        activeCardIndex = cardIndex;
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
        const cardIndex = list.cards.findIndex((c: any) => c.id === overId);
        if (cardIndex !== -1) {
          targetListId = list.id;
          targetPosition = cardIndex;
          break;
        }
      }
    }

    // Update placeholder position
    setPlaceholderPosition({
      listId: targetListId,
      position: targetPosition,
      cardHeight: 48,
    });

    // Only update cache for cross-list movements to reduce shaking
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
            // Add card to target list at the correct position
            const newCards = [...list.cards];
            newCards.splice(targetPosition, 0, { ...activeCard, listId: targetListId, position: targetPosition });
            return {
              ...list,
              cards: newCards
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
    setPlaceholderPosition(null);
    setLastOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get current board data
    const boardData = queryClient.getQueryData(["board", boardId]) as any;
    if (!boardData) return;

    // Check if we're moving a list
    const activeList = boardData.lists.find((l: any) => l.id === activeId);
    if (activeList) {
      // Handle list reordering
      const overList = boardData.lists.find((l: any) => l.id === overId);
      if (overList && activeId !== overId) {
        const activeIndex = boardData.lists.findIndex((l: any) => l.id === activeId);
        const overIndex = boardData.lists.findIndex((l: any) => l.id === overId);
        
        if (activeIndex !== overIndex) {
          // Optimistic update for list reordering
          queryClient.setQueryData(["board", boardId], (oldData: any) => {
            if (!oldData) return oldData;

            const newLists = [...oldData.lists];
            const [movedList] = newLists.splice(activeIndex, 1);
            newLists.splice(overIndex, 0, movedList);

            return { ...oldData, lists: newLists };
          });

          moveListMutation.mutate({
            listId: activeId,
            position: overIndex,
          });
        }
      }
      return;
    }

    // Handle card reordering
    let activeCard = null;
    let activeListId = null;
    let activeCardIndex = -1;
    
    for (const list of boardData.lists) {
      const cardIndex = list.cards.findIndex((c: any) => c.id === activeId);
      if (cardIndex !== -1) {
        activeCard = list.cards[cardIndex];
        activeListId = list.id;
        activeCardIndex = cardIndex;
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
        const cardIndex = list.cards.findIndex((c: any) => c.id === overId);
        if (cardIndex !== -1) {
          targetListId = list.id;
          targetPosition = cardIndex;
          break;
        }
      }
    }

    if (!targetListId) return;

    // Calculate if this is actually a different position
    const isDifferentList = activeListId !== targetListId;
    
    // For same list, adjust position if dragging down
    if (!isDifferentList && activeCardIndex < targetPosition) {
      targetPosition -= 1;
    }

    // Check if position actually changed
    if (!isDifferentList && activeCardIndex === targetPosition) {
      return; // No actual change
    }

    // Only move if it's actually a different position
    if (isDifferentList || activeCardIndex !== targetPosition) {
      // Optimistic update
      queryClient.setQueryData(["board", boardId], (oldData: any) => {
        if (!oldData) return oldData;

        const newLists = oldData.lists.map((list: any) => {
          if (list.id === activeListId) {
            // Remove card from source list
            const newCards = list.cards.filter((card: any) => card.id !== activeId);
            return { ...list, cards: newCards };
          }
          if (list.id === targetListId) {
            // Add card to target list at the correct position
            const newCards = [...list.cards];
            newCards.splice(targetPosition, 0, { ...activeCard, listId: targetListId, position: targetPosition });
            return { ...list, cards: newCards };
          }
          return list;
        });

        return { ...oldData, lists: newLists };
      });

      moveCardMutation.mutate({
        cardId: activeId,
        listId: targetListId,
        position: targetPosition,
      });
    }
  };

  return (
    <DragPlaceholderContext.Provider value={{ placeholderPosition, activeId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-50 rotate-3 scale-105 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-3">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Dragging...
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragPlaceholderContext.Provider>
  );
}
