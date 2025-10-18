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
      const requestBody: any = { 
        position: destinationIndex 
      };
      
      // Only add listId if it's different from current list
      if (destinationListId) {
        requestBody.listId = destinationListId;
      }
      
      console.log('Sending card move request:', {
        cardId,
        destinationListId,
        destinationIndex,
        requestBody
      });
      
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
      const requestBody = { position };
      
      console.log('Sending list move request:', {
        listId,
        position,
        requestBody
      });
      
      const response = await fetch(`/api/lists/${listId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
        position: destination.index + 1, // Convert to 1-based indexing
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
        
        // Update positions (1-based indexing)
        const finalCards = updatedCards.map((card, index) => ({
          ...card,
          position: index + 1
        }));


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
        destinationIndex: destination.index + 1, // Convert to 1-based indexing
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