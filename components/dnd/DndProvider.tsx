"use client";

import { useState, useEffect, createContext, useContext } from "react";
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
  const [orderedData, setOrderedData] = useState<Board | null>(null);

  const updateListOrderMutation = useMutation({
    mutationFn: async ({ items, boardId }: { items: { id: string; position: number }[], boardId: string }) => {
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
      queryClient.refetchQueries({ queryKey: ["board", boardId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCardOrderMutation = useMutation({
    mutationFn: async ({ items, boardId }: { items: { id: string; position: number; listId: string }[], boardId: string }) => {
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
      queryClient.refetchQueries({ queryKey: ["board", boardId] });
    },
    onError: (error) => toast.error(error.message),
  });

  // Use useQuery to ensure reactive updates
  const { data: boardData } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch board");
      }
      return response.json();
    },
    enabled: !!boardId,
  });

  // Update ordered data when board data changes
  useEffect(() => {
    if (boardData) {
      setOrderedData(boardData);
    }
  }, [boardData]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (!orderedData) return;

    // User moves a list
    if (type === "list") {
      const items = reorder(orderedData.lists, source.index, destination.index)
        .map((item, index) => ({ ...item, position: index }));

      setOrderedData({ ...orderedData, lists: items });
      updateListOrderMutation.mutate({ items, boardId });
    }

    // User moves a card
    if (type === "card") {
      const newOrderedData = { ...orderedData };

      const sourceList = newOrderedData.lists.find(list => list.id === source.droppableId);
      const destList = newOrderedData.lists.find(list => list.id === destination.droppableId);

      if (!sourceList || !destList) return;

      // Moving the card in the same list
      if (source.droppableId === destination.droppableId) {
        const reorderedCards = reorder(sourceList.cards, source.index, destination.index);
        reorderedCards.forEach((card, idx) => {
          card.position = idx;
        });
        sourceList.cards = reorderedCards;

        setOrderedData(newOrderedData);
        updateCardOrderMutation.mutate({ 
          boardId, 
          items: reorderedCards.map(card => ({ 
            id: card.id, 
            position: card.position, 
            listId: card.listId || source.droppableId 
          })) 
        });
      } else {
        // Remove card from the source list
        const [movedCard] = sourceList.cards.splice(source.index, 1);
        movedCard.listId = destination.droppableId;

        // Add card to the destination list
        destList.cards.splice(destination.index, 0, movedCard);

        sourceList.cards.forEach((card, idx) => {
          card.position = idx;
        });

        destList.cards.forEach((card, idx) => {
          card.position = idx;
        });

        setOrderedData(newOrderedData);
        updateCardOrderMutation.mutate({ 
          boardId, 
          items: destList.cards.map(card => ({ 
            id: card.id, 
            position: card.position, 
            listId: card.listId || destination.droppableId 
          })) 
        });
      }
    }
  };

  return (
    <DndContext.Provider value={{ orderedData }}>
      <DragDropContext onDragEnd={onDragEnd}>
        {children}
      </DragDropContext>
    </DndContext.Provider>
  );
}