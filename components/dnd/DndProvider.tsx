"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReactNode } from "react";
import { Board, MoveCardParams, MoveListParams } from "@/lib/types";
import { reorderLists, reorderCards, reorderArray } from "@/lib/drag-utils";

interface DndProviderProps {
  children: ReactNode;
  boardId: string;
}

export function DndProvider({ children, boardId }: DndProviderProps) {
  const queryClient = useQueryClient();

  const moveCardMutation = useMutation({
    mutationFn: async ({ cardId, destinationListId, destinationIndex }: MoveCardParams) => {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          listId: destinationListId, 
          position: destinationIndex 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move card");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Card moved successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const moveListMutation = useMutation({
    mutationFn: async ({ listId, position }: MoveListParams) => {
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
      toast.success("List moved successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    // If there's no destination, do nothing
    if (!destination) {
      return;
    }

    // If the item is dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Get current board data
    const boardData = queryClient.getQueryData<Board>(["board", boardId]);
    if (!boardData) return;

    if (type === "list") {
      // Handle list reordering using utility function
      const updatedLists = reorderLists(boardData.lists, source.index, destination.index);

      console.log('List reorder:', {
        sourceIndex: source.index,
        destinationIndex: destination.index,
        listId: draggableId,
        originalLists: boardData.lists.length,
        updatedListsCount: updatedLists.length,
        updatedLists: updatedLists.map(l => ({ id: l.id, title: l.title, position: l.position }))
      });

      // Optimistic update
      queryClient.setQueryData<Board>(["board", boardId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          lists: updatedLists
        };
      });

      moveListMutation.mutate({
        listId: draggableId,
        position: destination.index,
      });
    } else {
      // Handle card reordering
      const sourceList = boardData.lists.find((list) => list.id === source.droppableId);
      const destinationList = boardData.lists.find((list) => list.id === destination.droppableId);

      if (!sourceList || !destinationList) return;

      // Check if moving within the same list
      if (source.droppableId === destination.droppableId) {
        // Same list reordering - use simple array reorder
        const updatedCards = reorderArray(sourceList.cards, source.index, destination.index);
        
        // Update positions
        const finalCards = updatedCards.map((card, index) => ({
          ...card,
          position: index
        }));

        console.log('Same list reorder:', {
          sourceIndex: source.index,
          destinationIndex: destination.index,
          originalCards: sourceList.cards.length,
          finalCardsCount: finalCards.length,
          finalCards: finalCards.map(c => ({ id: c.id, title: c.title, position: c.position }))
        });

        // Optimistic update for same list
        queryClient.setQueryData<Board>(["board", boardId], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            lists: oldData.lists.map((list) => {
              if (list.id === source.droppableId) {
                return { ...list, cards: finalCards };
              }
              return list;
            })
          };
        });
      } else {
        // Different lists - use the existing logic
        const sourceCards = Array.from(sourceList.cards);
        const destinationCards = Array.from(destinationList.cards);

        // Use utility function for card reordering
        const { updatedSourceCards, updatedDestinationCards } = reorderCards(
          sourceCards,
          destinationCards,
          source.index,
          destination.index,
          destination.droppableId
        );

        // Optimistic update for different lists
        queryClient.setQueryData<Board>(["board", boardId], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            lists: oldData.lists.map((list) => {
              if (list.id === source.droppableId) {
                return { ...list, cards: updatedSourceCards };
              }
              if (list.id === destination.droppableId) {
                return { ...list, cards: updatedDestinationCards };
              }
              return list;
            })
          };
        });
      }

      moveCardMutation.mutate({
        cardId: draggableId,
        destinationListId: destination.droppableId,
        destinationIndex: destination.index,
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {children}
    </DragDropContext>
  );
}