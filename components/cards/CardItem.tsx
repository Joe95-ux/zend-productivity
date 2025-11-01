"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useDndContext } from "@/components/dnd/DndProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Check, Copy, MoreHorizontal, Move, Share, Tag } from "lucide-react";
import { CardModal } from "./CardModal";
import { CopyCardModal } from "./CopyCardModal";
import { MoveCardModal } from "./MoveCardModal";
import { CardIndicators } from "./CardIndicators";
import { DeleteConfirmationModal } from "@/components/ui/DeleteConfirmationModal";
import { ShootingStars } from "@/components/ui/ShootingStars";
import { HoverHint } from "@/components/HoverHint";
import { LabelDropdown } from "./LabelDropdown";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Draggable } from "@hello-pangea/dnd";
import { cn, generateCardSlug } from "@/lib/utils";
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
  const [watchStatus, setWatchStatus] = useState(false);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const [labelDropdownJustClosed, setLabelDropdownJustClosed] = useState(false);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wasDraggedRef = useRef(false);
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

  const { watchMap } = useDndContext();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardData, list.id, card.id]);

  // Update watch state from batch map
  useEffect(() => {
    setWatchStatus(Boolean(watchMap && watchMap[`card:${card.id}`]));
  }, [watchMap, card.id]);

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
      // Cache already updated optimistically, no need to refetch
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
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsDeleteModalOpen(false); // Close modal on success
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // No need to prevent clicks since we're doing optimistic updates
    
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
    // Don't close modal immediately - let onSuccess handle it
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
              "group cursor-pointer bg-white dark:bg-[#0D1117] border-slate-200 dark:border-slate-700 shadow-sm border rounded-md",
              "transition-all duration-200 ease-out",
              "hover:shadow-md hover:shadow-slate-900/20 hover:border-slate-300 dark:hover:border-slate-600",
              "hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600",
              snapshot.isDragging && "opacity-50 scale-105 rotate-2 shadow-2xl z-50 border-blue-300 dark:border-blue-600",
              // Keep a ghost/shadow at source position - the card becomes semi-transparent
              isCompleted && "opacity-40 bg-slate-100 dark:bg-slate-700",
              // Removed loading state since we're doing optimistic updates
            )}
            style={provided.draggableProps.style}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              if (!isDropdownOpen) {
                setIsHovered(false);
              }
            }}
            onTouchStart={(e) => {
              // Track touch start for mobile drag detection
              const touch = e.touches[0];
              touchStartPosRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
              };
              wasDraggedRef.current = false;
            }}
            onTouchMove={(e) => {
              // If user moves finger significantly, they're dragging
              if (touchStartPosRef.current) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
                const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // If moved more than 10px, consider it a drag
                if (distance > 10) {
                  wasDraggedRef.current = true;
                }
              }
            }}
            onTouchEnd={(e) => {
              // If it wasn't a drag and not currently dragging, trigger modal open
              if (!wasDraggedRef.current && !snapshot.isDragging) {
                const target = e.target as HTMLElement;
                if (
                  !target.closest('[data-dropdown-content]') && 
                  !target.closest('[data-label-dropdown-content]') &&
                  !target.closest('[data-action-button]') &&
                  !isLabelDropdownOpen &&
                  !labelDropdownJustClosed
                ) {
                  // Small delay to ensure drag handlers don't interfere
                  setTimeout(() => {
                    if (!snapshot.isDragging && !wasDraggedRef.current) {
                      setIsModalOpen(true);
                    }
                  }, 100);
                }
              }
              
              // Reset touch tracking after a delay
              setTimeout(() => {
                touchStartPosRef.current = null;
                wasDraggedRef.current = false;
              }, 300);
            }}
            onClick={(e) => {
              // On mobile, touch events handle modal opening
              // Only handle mouse clicks here (desktop)
              if ('ontouchstart' in window) {
                return;
              }
              
              // On desktop, don't open if this was a drag
              if (wasDraggedRef.current || snapshot.isDragging) {
                return;
              }
              
              // Don't open modal if clicking on dropdown elements or label dropdown
              const target = e.target as HTMLElement;
              if (
                target.closest('[data-dropdown-content]') || 
                target.closest('[data-label-dropdown-content]') ||
                target.closest('[data-action-button]') ||
                isLabelDropdownOpen ||
                labelDropdownJustClosed
              ) {
                return;
              }
              setIsModalOpen(true);
            }}
          >
            <CardContent className="p-0 relative">
              {/* Label Bands - Above title, Trello style */}
              {card.labels && card.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1">
                  {card.labels.map((label) => (
                    <HoverHint
                      key={label.id}
                      label={`${label.name} (${label.color})`}
                      side="top"
                    >
                      <div
                        className="h-5 px-2 rounded-sm flex-shrink-0 cursor-pointer flex items-center justify-center text-white text-xs font-medium leading-tight hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: label.color,
                          maxWidth: "150px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLabelDropdownOpen(true);
                        }}
                      >
                        <span className="truncate">{label.name}</span>
                      </div>
                    </HoverHint>
                  ))}
                </div>
              )}

              {/* Card Header with Title and Radio Button */}
              <div className="flex items-center min-h-10 px-3 relative">
                
                {/* Radio Button - Always present, hidden behind title by default */}
                <div 
                  className={cn(
                    "hidden lg:flex flex-shrink-0 w-5 h-5 items-center justify-center transition-all duration-300 ease-in-out absolute left-3 z-10",
                    "cursor-pointer hover:scale-110",
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
                  {isCompleted ? (
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
                    <div className="w-5 h-5 border-2 border-slate-400 rounded-full hover:border-teal-600 transition-all duration-300 ease-in-out"></div>
                  )}
                  <ShootingStars 
                    isActive={showShootingStars} 
                    onComplete={() => setShowShootingStars(false)} 
                  />
                </div>

                {/* Card Title - Slides right on hover to reveal radio icon underneath */}
                <h4 className={cn(
                  "font-medium text-sm text-slate-900 dark:text-white transition-all duration-300 ease-in-out relative z-20",
                  isCompleted && "line-through text-slate-600 dark:text-slate-300",
                  // Slide right on hover to reveal radio icon underneath
                  (isCompleted || isHovered) 
                    ? "translate-x-8" // Move right to reveal radio icon
                    : "translate-x-0" // Normal position, covering radio icon
                )}>
                  {card.title}
                </h4>
              </div>

              {/* Card Indicators */}
              <CardIndicators card={card} isWatching={watchStatus} />

              {/* LabelDropdown - Controlled externally, positioned near the action buttons */}
              <div 
                className="absolute right-3 top-3 z-[100]"
                style={{ 
                  width: '1px', 
                  height: '1px',
                  pointerEvents: 'none'
                }}
              >
                <LabelDropdown
                  card={card}
                  boardId={boardId}
                  controlledOpen={isLabelDropdownOpen}
                  onOpenChange={(open) => {
                    setIsLabelDropdownOpen(open);
                    if (!open) {
                      // Set flag to prevent card click from firing immediately
                      setLabelDropdownJustClosed(true);
                      setTimeout(() => setLabelDropdownJustClosed(false), 100);
                    }
                  }}
                  trigger={
                    <button
                      style={{ 
                        width: '1px',
                        height: '1px',
                        opacity: 0,
                        pointerEvents: 'none'
                      }}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  }
                />
              </div>

              {/* Action Buttons - Positioned absolutely on the right, aligned with title */}
              <div className="absolute right-3 top-3 flex items-center gap-1 z-50">
                {/* Background blur overlay for action buttons */}
                <div className="absolute inset-0 bg-white/80 opacity-0 hover:opacity-100 dark:bg-[#0D1117] rounded-md -m-1 z-0" />
                
                {/* Edit Icon - Show on hover for large devices */}
                {isHovered && (
                  <div className="hidden lg:block relative z-10 bg-white dark:bg-[#0D1117]">
                    <button
                      data-action-button
                      onClick={handleEdit}
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ease-out",
                        "hover:bg-slate-200 dark:hover:bg-slate-600",
                        "bg-white/50 dark:bg-slate-800/50"
                      )}
                    >
                      <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white" />
                    </button>
                  </div>
                )}

                {/* More Options Dropdown - Always visible on mobile, hover on desktop */}
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
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ease-out bg-white dark:bg-[#0D1117]",
                          "hover:bg-slate-200 dark:hover:bg-slate-600",
                        "bg-white/50 dark:bg-slate-800/50 relative z-10",
                        // Always visible on mobile, hover on desktop
                        "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        )}
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-50" data-dropdown-content>
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(e);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Card
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false); // Close the action menu
                      setTimeout(() => {
                        setIsLabelDropdownOpen(true);
                      }, 100);
                    }}>
                      <Tag className="h-4 w-4 mr-2" />
                      Edit Labels
                    </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        setIsCopyModalOpen(true);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Card
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        setIsMoveModalOpen(true);
                      }}>
                        <Move className="h-4 w-4 mr-2" />
                        Move Card
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        const cardSlug = generateCardSlug(card.title, card.position);
                        const cardUrl = `${window.location.origin}/dashboard/boards/${boardId}/cards/${card.id}/${cardSlug}`;
                        navigator.clipboard.writeText(cardUrl);
                        toast.success("Card link copied to clipboard!");
                      }}>
                        <Share className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(e);
                          }}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Card
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
        variant="card"
      />

    </>
  );
}