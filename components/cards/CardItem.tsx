"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Check, Copy, MoreHorizontal, Move } from "lucide-react";
import { CardModal } from "./CardModal";
import { CopyCardModal } from "./CopyCardModal";
import { MoveCardModal } from "./MoveCardModal";
import { CardIndicators } from "./CardIndicators";
import { DeleteConfirmationModal } from "@/components/ui/DeleteConfirmationModal";
import { ShootingStars } from "@/components/ui/ShootingStars";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card as CardType, UpdateCardParams, Board, List } from "@/lib/types";

interface CardItemProps {
  card: CardType;
  list: {
    id: string;
    title: string;
  };
  boardId: string;
  index: number;
}

export function CardItem({ card, list, boardId, index }: CardItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleted, setIsCompleted] = useState(card.isCompleted);
  const [showShootingStars, setShowShootingStars] = useState(false);
  const queryClient = useQueryClient();

  // Get the current card data from query cache to stay in sync
  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: false, // Don't fetch, just subscribe to cache updates
  });

  // Sync local state with query cache updates
  useEffect(() => {
    if (boardData) {
      const updatedCard = boardData.lists
        ?.find((l: List) => l.id === list.id)
        ?.cards?.find((c: CardType) => c.id === card.id);
      
      if (updatedCard && updatedCard.isCompleted !== isCompleted) {
        setIsCompleted(updatedCard.isCompleted);
      }
    }
  }, [boardData, list.id, card.id, isCompleted]);

  const updateCardMutation = useMutation({
    mutationFn: async ({ title, description, position, isCompleted }: UpdateCardParams) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, position, isCompleted }),
      });
      if (!response.ok) throw new Error("Failed to update card");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Card updated successfully!");
      queryClient.refetchQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      // Revert the local state change on error
      setIsCompleted(card.isCompleted);
      
      // Revert the query cache to the original state
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          lists: oldData.lists.map((list: List) => ({
            ...list,
            cards: list.cards.map((c: CardType) => 
              c.id === card.id 
                ? { ...c, isCompleted: card.isCompleted }
                : c
            )
          }))
        };
      });
      
      toast.error(error.message);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete card");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Card deleted successfully!");
      queryClient.refetchQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateCardMutation.isPending) return; // Prevent multiple clicks during update
    
    const newCompletedState = !isCompleted;
    
    // Trigger shooting stars animation when completing a card
    if (newCompletedState && !isCompleted) {
      setShowShootingStars(true);
    }
    
    // Update local state immediately for instant visual feedback
    setIsCompleted(newCompletedState);
    
    // Update the query cache immediately for instant UI updates
    queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        lists: oldData.lists.map((list: List) => ({
          ...list,
          cards: list.cards.map((c: CardType) => 
            c.id === card.id 
              ? { ...c, isCompleted: newCompletedState }
              : c
          )
        }))
      };
    });
    
    // Then update the database in the background
    updateCardMutation.mutate({ 
      title: card.title,
      description: card.description,
      isCompleted: newCompletedState 
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteCardMutation.isPending) return; // Prevent multiple clicks during deletion
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    deleteCardMutation.mutate();
    setIsDeleteModalOpen(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };


  return (
    <>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group cursor-pointer active:cursor-grabbing bg-white dark:bg-[#0D1117] border-slate-200 dark:border-slate-700 shadow-sm border rounded-md",
              "transition-all duration-300 ease-out",
              "hover:shadow-md hover:shadow-slate-900/20 hover:border-slate-300 dark:hover:border-slate-600",
              "hover:scale-[1.005] hover:bg-slate-50/50 dark:hover:bg-slate-700/50",
              "hover:-translate-y-0.5",
              snapshot.isDragging && "opacity-90 scale-105 rotate-2 shadow-2xl z-50",
              isCompleted && "opacity-60 bg-slate-100 dark:bg-slate-700",
              updateCardMutation.isPending && "opacity-75 pointer-events-none"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              if (!isDropdownOpen) {
                setIsHovered(false);
              }
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <CardContent className="p-0 relative">
              {/* Card Header with Title and Radio Button */}
              <div className="flex items-center min-h-12 px-3 relative">
                
                {/* Radio Button - Always present, hidden behind title by default */}
                <div 
                  className={cn(
                    "hidden lg:flex flex-shrink-0 w-5 h-5 items-center justify-center transition-all duration-200 ease-out absolute left-3 z-10",
                    updateCardMutation.isPending ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105",
                    // Always visible but opacity changes based on state
                    (isCompleted || isHovered) 
                      ? "opacity-100" 
                      : "opacity-0"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(e);
                  }}
                >
                  {updateCardMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-slate-400 rounded-full animate-pulse"></div>
                  ) : isCompleted ? (
                    <motion.div 
                      className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 15,
                        duration: 0.3 
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 600, 
                          damping: 12,
                          duration: 0.4,
                          delay: 0.1
                        }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    </motion.div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-400 rounded-full hover:border-teal-600 transition-all duration-200"></div>
                  )}
                  <ShootingStars 
                    isActive={showShootingStars} 
                    onComplete={() => setShowShootingStars(false)} 
                  />
                </div>

                {/* Card Title - Slides right on hover to reveal radio icon underneath */}
                <h4 className={cn(
                  "font-medium text-sm text-slate-900 dark:text-white transition-all duration-200 ease-out relative z-20",
                  isCompleted && "line-through text-slate-500 dark:text-slate-400",
                  // Slide right on hover to reveal radio icon underneath
                  (isCompleted || isHovered) 
                    ? "translate-x-8" // Move right to reveal radio icon
                    : "translate-x-0" // Normal position, covering radio icon
                )}>
                  {card.title}
                </h4>
              </div>

              {/* Card Indicators */}
              <CardIndicators card={card} />

              {/* Action Buttons - Positioned absolutely on the right, aligned with title */}
              <div className="absolute right-3 top-3 flex items-center gap-1">
              {/* Edit Icon - Show on hover for large devices */}
              {isHovered && (
                <div className="hidden lg:block">
                  <button
                    data-action-button
                    onClick={handleEdit}
                    disabled={updateCardMutation.isPending}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ease-out",
                      updateCardMutation.isPending 
                        ? "cursor-not-allowed opacity-50" 
                        : "hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
                    )}
                  >
                    {updateCardMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white" />
                    )}
                  </button>
                </div>
              )}

              {/* More Options Dropdown - Show on hover */}
              {isHovered && (
                <DropdownMenu onOpenChange={(open) => {
                  setIsDropdownOpen(open);
                  if (!open) {
                    // Close hover state when dropdown closes, with shorter delay
                    setTimeout(() => setIsHovered(false), 100);
                  }
                }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-dropdown-trigger
                      onClick={(e) => e.stopPropagation()}
                      disabled={updateCardMutation.isPending}
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ease-out",
                        updateCardMutation.isPending 
                          ? "cursor-not-allowed opacity-50" 
                          : "hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
                      )}
                    >
                      <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" data-dropdown-content>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setIsCopyModalOpen(true);
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setIsMoveModalOpen(true);
                    }}>
                      <Move className="h-4 w-4 mr-2" />
                      Move Card
                    </DropdownMenuItem>
                    {isCompleted && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(e);
                        }}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Card
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              </div>
            </CardContent>
          </Card>
        )}
      </Draggable>

      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={card}
        list={list}
        boardId={boardId}
      />

      <CopyCardModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        card={card}
        currentBoardId={boardId}
        currentListId={list.id}
      />

      <MoveCardModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        card={card}
        currentBoardId={boardId}
        currentListId={list.id}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Card"
        description="Are you sure you want to delete this card? This action cannot be undone."
        itemName={card.title}
        isLoading={deleteCardMutation.isPending}
      />
    </>
  );
}