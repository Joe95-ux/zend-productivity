"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DndProvider, useDndContext } from "@/components/dnd/DndProvider";
import { BoardFilterProvider } from "@/contexts/BoardFilterContext";
import { CardModal } from "@/components/cards/CardModal";
import { Card as CardType, List as ListType } from "@/lib/types";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListForm } from "@/components/lists/CreateListForm";
import { ListContainer } from "@/components/lists/ListContainer";
import { Droppable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { generateCardSlug, parseCardSlug } from "@/lib/utils";

interface BoardContentWithCardModalProps {
  boardId: string;
  cardId: string;
  slug: string;
  onAddList: () => void;
}

// BoardContent component that can auto-open a card modal
function BoardContentWithCardModal({ 
  boardId, 
  cardId, 
  slug,
  onAddList 
}: BoardContentWithCardModalProps) {
  const { orderedData, isLoading, error } = useDndContext();
  const router = useRouter();
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedList, setSelectedList] = useState<ListType | null>(null);
  const [slugValidationError, setSlugValidationError] = useState<string | null>(null);

  // Find and open the card when data loads
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
          // Validate the slug
          const parsedSlug = parseCardSlug(slug);
          if (!parsedSlug) {
            setSlugValidationError("Invalid card URL format");
            return;
          }

          // Find the card's position in the list
          const cardIndex = list.cards?.findIndex((c: CardType) => c.id === cardId);
          const cardPosition = cardIndex !== undefined && cardIndex >= 0 ? cardIndex + 1 : 1;

          // Generate expected slug
          const expectedSlug = generateCardSlug(card.title, cardPosition);
          
          // Check if the slug matches
          if (slug !== expectedSlug) {
            // Redirect to the correct URL with proper slug
            router.replace(`/dashboard/boards/${boardId}/cards/${cardId}/${expectedSlug}`);
            return;
          }

          // Check if the position in slug matches actual position
          if (parsedSlug.position !== cardPosition) {
            setSlugValidationError("Card position has changed. Redirecting...");
            // Redirect to correct position
            setTimeout(() => {
              router.replace(`/dashboard/boards/${boardId}/cards/${cardId}/${expectedSlug}`);
            }, 1000);
            return;
          }

          setSelectedCard(card);
          setSelectedList(list);
          setIsCardModalOpen(true);
          setSlugValidationError(null);
        }
      }
    }
  }, [orderedData, cardId, slug, boardId, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">Failed to load board. Please try again.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (slugValidationError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Invalid Card URL</h2>
          <p className="text-muted-foreground">{slugValidationError}</p>
          <Button asChild className="mt-4">
            <Link href={`/dashboard/boards/${boardId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Board
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading || !orderedData) {
    return (
      <div className="w-full h-full">
        <div className="flex gap-2 min-[320px]:gap-3 sm:gap-4 overflow-x-auto pb-4 px-[18px] lg:px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-64 min-[320px]:w-72 sm:w-80 flex-shrink-0">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Skeleton className="h-6 w-24 mb-4 bg-slate-700" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-slate-700" />
                  <Skeleton className="h-20 w-full bg-slate-700" />
                  <Skeleton className="h-20 w-full bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
          <div className="w-72 flex-shrink-0">
            <Skeleton className="h-12 w-full border-dashed border-2 bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  // Handle case when there are no lists
  if (!orderedData.lists || orderedData.lists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first list to start organizing your tasks.
        </p>
        <Button onClick={onAddList} className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Create Your First List
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="pb-4 h-full lg:px-4">
        <div className="flex gap-2 min-[320px]:gap-3 sm:gap-4">
          <Droppable droppableId="lists" type="list" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-2 min-[320px]:gap-3 sm:gap-4"
              >
                {orderedData.lists.map((list: ListType, index: number) => (
                  <ListContainer key={list.id} list={list} boardId={boardId} index={index} />
                ))}
                {provided.placeholder}
                {/* Add List Button - Inside Droppable but not draggable */}
                <div className="flex-shrink-0 w-72">
                  <Button
                    onClick={onAddList}
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 hover:border-solid cursor-pointer transition-all duration-300 ease-out hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add another list
                  </Button>
                </div>
              </div>
            )}
          </Droppable>
        </div>
      </div>

      {/* Card Modal */}
      {selectedCard && selectedList && (
        <CardModal
          card={selectedCard as CardType}
          list={selectedList}
          boardId={boardId}
          isOpen={isCardModalOpen}
          onClose={() => {
            setIsCardModalOpen(false);
            setSelectedCard(null);
            setSelectedList(null);
            // Navigate back to the board page when modal is closed
            router.push(`/dashboard/boards/${boardId}`);
          }}
        />
      )}
    </>
  );
}

export default function CardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const cardId = params.cardId as string;
  const slug = params.slug as string;
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);

  return (
    <>
      {/* Board Content with Card Modal */}
      <div className="w-full h-full">
        <DndProvider boardId={boardId}>
          <BoardContentWithCardModal 
            boardId={boardId} 
            cardId={cardId}
            slug={slug}
            onAddList={() => setIsCreateListOpen(true)} 
          />
        </DndProvider>
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <CreateListForm 
            boardId={boardId} 
            onSuccess={() => setIsCreateListOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
