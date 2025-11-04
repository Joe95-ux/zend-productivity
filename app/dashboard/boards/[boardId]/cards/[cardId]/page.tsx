"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DndProvider, useDndContext } from "@/components/dnd/DndProvider";
import { Card as CardType, List as ListType } from "@/lib/types";
import { generateCardSlug } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";

// Redirect component that finds the card and redirects to the slug-based URL
function CardRedirect({ boardId, cardId }: { boardId: string; cardId: string }) {
  const { orderedData, isLoading, error } = useDndContext();
  const { isOnline } = useOnlineStatus();
  const router = useRouter();

  useEffect(() => {
    if (orderedData && cardId) {
      // Find the card in the board data
      const card = orderedData.lists
        ?.flatMap((list: ListType) => list.cards || [])
        ?.find((card: CardType) => card.id === cardId);

      if (card) {
        // Find the list containing this card
        const list = orderedData.lists?.find((list: ListType) => 
          list.cards?.some((card: CardType) => card.id === cardId)
        );

        if (list) {
          // Find the card's position in the list
          const cardIndex = list.cards?.findIndex((c: CardType) => c.id === cardId);
          const cardPosition = cardIndex !== undefined && cardIndex >= 0 ? cardIndex + 1 : 1;
          
          // Generate the slug and redirect
          const slug = generateCardSlug(card.title, cardPosition);
          router.replace(`/dashboard/boards/${boardId}/cards/${cardId}/${slug}`);
        }
      }
    }
  }, [orderedData, cardId, boardId, router]);

  // Only show error if we have no cached data AND we're online
  // If we're offline and have cached data, show the cached data instead
  if (error && !orderedData && (isOnline || typeof navigator === "undefined" || navigator.onLine)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">Failed to load board. Please try again.</p>
        </div>
      </div>
    );
  }
  
  if (isLoading || !orderedData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Redirecting to card page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">Taking you to the card page...</p>
      </div>
    </div>
  );
}

export default function CardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const cardId = params.cardId as string;

  return (
    <div className="w-full h-full">
      <DndProvider boardId={boardId}>
        <CardRedirect boardId={boardId} cardId={cardId} />
      </DndProvider>
    </div>
  );
}
