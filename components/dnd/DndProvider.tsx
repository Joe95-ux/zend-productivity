"use client";

import { DragDropContext, DropResult, DragStart } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReactNode, useState } from "react";
import { Board, MoveCardParams, MoveListParams } from "@/lib/types";
import { reorderLists, reorderCards, reorderArray } from "@/lib/drag-utils";

interface DndProviderProps {
  children: ReactNode;
  boardId: string;
}

export function DndProvider({ children, boardId }: DndProviderProps) {
  const queryClient = useQueryClient();
  const [_draggedItem, setDraggedItem] = useState<{ id: string; type: string; title?: string } | null>(null);

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
      console.log('Card move API call succeeded');
      toast.success("Card moved successfully!");
    },
    onError: (error: Error) => {
      console.error('Card move API call failed:', error.message);
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
      console.log('List move API call succeeded');
      toast.success("List moved successfully!");
    },
    onError: (error: Error) => {
      console.error('List move API call failed:', error.message);
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    console.log('Drag end triggered:', {
      destination,
      source,
      draggableId,
      type,
      sourceDroppableId: source.droppableId,
      destinationDroppableId: destination.droppableId
    });

    // If there's no destination, do nothing
    if (!destination) {
      console.log('No destination, returning');
      return;
    }

    // If the item is dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('Same position, returning');
      return;
    }

    // Get current board data
    const boardData = queryClient.getQueryData<Board>(["board", boardId]);
    if (!boardData) return;

    if (type === "list") {
      console.log('List reordering logic triggered');
      
      // Handle list reordering using utility function
      const updatedLists = reorderLists(boardData.lists, source.index, destination.index);

      console.log('List reorder:', {
        sourceIndex: source.index,
        destinationIndex: destination.index,
        listId: draggableId,
        originalListsCount: boardData.lists.length,
        updatedListsCount: updatedLists.length,
        originalLists: boardData.lists.map(l => ({ id: l.id, title: l.title, position: l.position })),
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

      console.log('Calling moveListMutation with:', {
        listId: draggableId,
        position: destination.index,
      });
      
      moveListMutation.mutate({
        listId: draggableId,
        position: destination.index,
      });
    } else {
      console.log('Not a list drag, type is:', type);
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

  const handleDragStart = (start: DragStart) => {
    const { draggableId, type } = start;
    
    // Get the board data to find the item being dragged
    const boardData = queryClient.getQueryData<Board>(["board", boardId]);
    if (!boardData) return;

    if (type === "list") {
      const list = boardData.lists.find(l => l.id === draggableId);
      if (list) {
        setDraggedItem({ id: draggableId, type, title: list.title });
      }
    } else {
      const card = boardData.lists.flatMap(l => l.cards).find(c => c.id === draggableId);
      if (card) {
        setDraggedItem({ id: draggableId, type, title: card.title });
      }
    }
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {children}
    </DragDropContext>
  );
}