"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Board } from "@/lib/types";

interface DndProviderProps {
  children: React.ReactNode;
  boardId: string;
}

interface DndContextType {
  orderedData: Board | null;
  isLoading: boolean;
  error: Error | null;
}

const DndContext = createContext<DndContextType | undefined>(undefined);

export const useDndContext = () => {
  const context = useContext(DndContext);
  if (!context) {
    throw new Error("useDndContext must be used within a DndProvider");
  }
  return context;
};

// Simple reorder function
function reorder<T>(list: T[], startIndex: number, endIndex: number) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function DndProvider({ children, boardId }: DndProviderProps) {
  const queryClient = useQueryClient();
  // Use useQuery to fetch board data - this will be the single source of truth
  const {
    data: serverData,
    isLoading,
    error,
  } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch board");
      }
      return response.json();
    },
    enabled: !!boardId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [optimisticData, setOptimisticData] = useState<Board | null>(null);
  const isDragInProgressRef = useRef(false);

  const updateListOrderMutation = useMutation({
    mutationFn: async ({
      items,
      boardId,
    }: {
      items: { id: string; position: number }[];
      boardId: string;
    }) => {
      const response = await fetch("/api/lists/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, boardId }),
      });
      if (!response.ok) throw new Error("Failed to reorder lists");
      return response.json();
    },
    onSuccess: () => {
      toast.success("List reordered");
      isDragInProgressRef.current = false;
      // Server data will update automatically, no need to invalidate
    },
    onError: (error) => {
      console.error("List reorder error:", error);
      toast.error(`Failed to reorder lists: ${error.message}`);
      isDragInProgressRef.current = false;
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const updateCardOrderMutation = useMutation({
    mutationFn: async ({
      items,
      boardId,
    }: {
      items: { id: string; position: number; listId: string }[];
      boardId: string;
    }) => {
      const response = await fetch("/api/cards/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, boardId }),
      });
      if (!response.ok) throw new Error("Failed to reorder cards");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Card reordered");
      isDragInProgressRef.current = false;
      // Server data will update automatically, no need to invalidate
    },
    onError: (error) => {
      console.error("Card reorder error:", error);
      toast.error(`Failed to reorder cards: ${error.message}`);
      isDragInProgressRef.current = false;
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  // Initialize local state with server data when it changes, but not during drag operations
  useEffect(() => {
    if (serverData && !isDragInProgressRef.current) {
      setOptimisticData(serverData);
    }
  }, [serverData]);
  

  // Use local state if available, otherwise use server data
  const orderedData = optimisticData || serverData;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!orderedData) {
      return;
    }

    // Set drag in progress to prevent useEffect from overriding optimistic updates
    isDragInProgressRef.current = true;

    // User moves a list
    if (type === "list") {
      const reorderedLists = reorder(
        orderedData.lists,
        source.index,
        destination.index
      );
      const items = reorderedLists.map((item, index) => ({ ...item, position: index + 1 }));

      // Immediately update optimistic state
      setOptimisticData({
        ...orderedData,
        lists: reorderedLists
      });

      updateListOrderMutation.mutate({ items, boardId });
    }

    // User moves a card
    if (type === "card") {
      const sourceList = orderedData.lists.find(
        (list) => list.id === source.droppableId
      );
      const destList = orderedData.lists.find(
        (list) => list.id === destination.droppableId
      );

      if (!sourceList || !destList) return;

      // Moving the card in the same list
      if (source.droppableId === destination.droppableId) {
        const reorderedCards = reorder(
          sourceList.cards,
          source.index,
          destination.index
        );
        
        // Create new card objects with updated positions
        const updatedCards = reorderedCards.map((card, idx) => ({
          ...card,
          position: idx + 1 // Use 1-based indexing for server
        }));

        // Immediately update optimistic state
        const updatedLists = orderedData.lists.map(list => 
          list.id === sourceList.id 
            ? { ...list, cards: updatedCards }
            : list
        );
        setOptimisticData({
          ...orderedData,
          lists: updatedLists
        });

        const mutationData = { 
          boardId, 
          items: updatedCards.map((card) => ({
            id: card.id, 
            position: card.position, 
            listId: card.listId || source.droppableId,
          })),
        };
        
        // Validate data before sending
        if (!mutationData.boardId || !mutationData.items || mutationData.items.length === 0) {
          console.error("Invalid mutation data:", mutationData);
          toast.error("Invalid card data. Please try again.");
          isDragInProgressRef.current = false;
          return;
        }
        
        console.log("Card reorder mutation data:", mutationData);
        updateCardOrderMutation.mutate(mutationData);
      } else {
        // For cross-list moves, we need to handle both source and destination lists
        const sourceCards = Array.from(sourceList.cards);
        const destCards = Array.from(destList.cards);

        // Remove card from source
        const [movedCard] = sourceCards.splice(source.index, 1);
        const updatedMovedCard = { ...movedCard, listId: destination.droppableId };

        // Add card to destination
        destCards.splice(destination.index, 0, updatedMovedCard);

        // Update positions for both lists (create new card objects)
        const updatedSourceCards = sourceCards.map((card, idx) => ({
          ...card,
          position: idx + 1
        }));

        const updatedDestCards = destCards.map((card, idx) => ({
          ...card,
          position: idx + 1
        }));

        // Immediately update optimistic state
        const updatedLists = orderedData.lists.map(list => {
          if (list.id === sourceList.id) {
            return { ...list, cards: updatedSourceCards };
          } else if (list.id === destList.id) {
            return { ...list, cards: updatedDestCards };
          }
          return list;
        });
        setOptimisticData({
          ...orderedData,
          lists: updatedLists
        });

        // Send all cards from destination list to update their positions
        const mutationData = { 
          boardId, 
          items: updatedDestCards.map((card) => ({
            id: card.id, 
            position: card.position, 
            listId: card.listId || destination.droppableId,
          })),
        };
        
        // Validate data before sending
        if (!mutationData.boardId || !mutationData.items || mutationData.items.length === 0) {
          console.error("Invalid cross-list mutation data:", mutationData);
          toast.error("Invalid card data. Please try again.");
          isDragInProgressRef.current = false;
          return;
        }
        
        console.log("Cross-list card reorder mutation data:", mutationData);
        updateCardOrderMutation.mutate(mutationData);
      }
    }
  };

  return (
    <DndContext.Provider
      value={{ orderedData: orderedData || null, isLoading, error }}
    >
      <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
    </DndContext.Provider>
  );
}
