"use client";

import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
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
  watchMap: Record<string, boolean> | null;
  toggleWatch: (args: { boardId?: string; listId?: string; cardId?: string; watch: boolean }) => Promise<void>;
}

const DndContext = createContext<DndContextType | undefined>(undefined);

export const useDndContext = () => {
  const context = useContext(DndContext);
  if (!context) {
    throw new Error("useDndContext must be used within a DndProvider");
  }
  return context;
};

// Optional version that returns null if context is not available
export const useDndContextOptional = () => {
  return useContext(DndContext);
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

  // Batch watch query for the entire board
  const { data: watchData } = useQuery({
    queryKey: ["watch-batch", boardId],
    queryFn: async () => {
      if (!serverData) return null;
      
      const cardIds = serverData.lists?.flatMap(list => list.cards?.map(card => card.id) || []) || [];
      const listIds = serverData.lists?.map(list => list.id) || [];
      
      const requestBody = { 
        cardIds,
        listIds,
        boardId 
      };
      
      const response = await fetch('/api/watch/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch watch status');
      }
      return response.json();
    },
    enabled: !!serverData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
  });

  const [optimisticData, setOptimisticData] = useState<Board | null>(null);
  const [localWatchMap, setLocalWatchMap] = useState<Record<string, boolean>>({});
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
  
  // Sync local watch map when batch data arrives
  useEffect(() => {
    if (watchData?.watchMap) {
      setLocalWatchMap(watchData.watchMap);
    }
  }, [watchData]);

  const toggleWatch = useMemo(() => {
    return async ({ boardId: bId, listId: lId, cardId: cId, watch }: { boardId?: string; listId?: string; cardId?: string; watch: boolean }) => {
      const key = bId ? `board:${bId}` : lId ? `list:${lId}` : cId ? `card:${cId}` : undefined;
      if (!key) return;
      // Optimistic update
      setLocalWatchMap((prev) => ({ ...prev, [key]: watch }));
      try {
        if (watch) {
          await fetch('/api/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardId: bId, listId: lId, cardId: cId })
          }).then(r => { if (!r.ok) throw new Error('Failed to watch'); });
        } else {
          await fetch('/api/watch', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardId: bId, listId: lId, cardId: cId })
          }).then(r => { if (!r.ok) throw new Error('Failed to unwatch'); });
        }
      } catch (e) {
        // rollback
        setLocalWatchMap((prev) => ({ ...prev, [key]: !watch }));
        toast.error((e as Error).message);
      }
    };
  }, []);

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

    // User moves a checklist item
    if (type === "checklist-item") {
      // Find the checklist that contains this item
      const checklist = orderedData.lists
        .flatMap(list => list.cards)
        .flatMap(card => card.checklists || [])
        .find(checklist => checklist.id === source.droppableId);

      if (!checklist) {
        console.error("Checklist not found for droppableId:", source.droppableId);
        return;
      }

      // Get the item being moved
      const itemToMove = checklist.items[source.index];
      if (!itemToMove) {
        console.error("Item not found at source index:", source.index);
        return;
      }

      const reorderedItems = reorder(
        checklist.items,
        source.index,
        destination.index
      );

      // Update the checklist items with new positions
      const updatedItems = reorderedItems.map((item, idx) => ({
        ...item,
        position: idx
      }));

      // Immediately update optimistic state
      const updatedLists = orderedData.lists.map(list => ({
        ...list,
        cards: list.cards.map(card => ({
          ...card,
          checklists: card.checklists?.map(c => 
            c.id === checklist.id 
              ? { ...c, items: updatedItems }
              : c
          )
        }))
      }));

      setOptimisticData({
        ...orderedData,
        lists: updatedLists
      });

      // Call the reorder API
      fetch(`/api/checklist-items/${itemToMove.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId: checklist.id,
          itemId: itemToMove.id,
          newPosition: destination.index
        }),
      })
      .then(response => {
        if (!response.ok) throw new Error("Failed to reorder items");
        return response.json();
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      })
      .catch(error => {
        console.error("Error reordering checklist item:", error);
        toast.error("Failed to reorder item");
      })
      .finally(() => {
        isDragInProgressRef.current = false;
      });
      
      return;
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
      value={{ orderedData: orderedData || null, isLoading, error, watchMap: localWatchMap || null, toggleWatch }}
    >
      <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
    </DndContext.Provider>
  );
}
