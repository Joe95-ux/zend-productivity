"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Check } from "lucide-react";
import { CardModal } from "./CardModal";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card as CardType, UpdateCardParams } from "@/lib/types";

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
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleted, setIsCompleted] = useState(card.isCompleted);
  const queryClient = useQueryClient();

  const updateCardMutation = useMutation({
    mutationFn: async ({ title, description, position, isCompleted }: UpdateCardParams) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, position, isCompleted }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update card");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (error: Error) => {
      console.error("Error updating card:", error);
      // Revert the local state change on error
      setIsCompleted(card.isCompleted);
      toast.error(error.message);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete card");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Card deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateCardMutation.isPending) return; // Prevent multiple clicks during update
    
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);
    updateCardMutation.mutate({ 
      title: card.title,
      description: card.description,
      isCompleted: newCompletedState 
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteCardMutation.isPending) return; // Prevent multiple clicks during deletion
    
    if (confirm("Are you sure you want to delete this card?")) {
      deleteCardMutation.mutate();
    }
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
              "group cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm border rounded-md",
              "transition-all duration-300 ease-out",
              "hover:shadow-md hover:shadow-slate-900/20 hover:border-slate-300 dark:hover:border-slate-600",
              "hover:scale-[1.005] hover:bg-slate-50/50 dark:hover:bg-slate-700/50",
              "hover:-translate-y-0.5",
              snapshot.isDragging && "opacity-50 scale-105 rotate-2 shadow-xl",
              isCompleted && "opacity-60 bg-slate-100 dark:bg-slate-700",
              updateCardMutation.isPending && "opacity-75 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!updateCardMutation.isPending && !snapshot.isDragging) {
                setIsModalOpen(true);
              }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
        <CardContent className="p-0 relative">
          <div className="flex items-center h-12 px-3 relative overflow-hidden">
            
            {/* Radio Button - Always present, hidden behind title by default */}
            <div 
              className={cn(
                "hidden lg:flex flex-shrink-0 w-5 h-5 items-center justify-center transition-all duration-300 ease-out absolute left-3 z-10",
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
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center transition-all duration-200 animate-in zoom-in">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-slate-400 rounded-full hover:border-blue-400 transition-all duration-200"></div>
              )}
            </div>

            {/* Card Title - Slides right on hover to reveal radio icon underneath */}
            <h4 className={cn(
              "font-medium text-sm text-slate-900 dark:text-white transition-all duration-300 ease-out relative z-20",
              isCompleted && "line-through text-slate-500 dark:text-slate-400",
              // Slide right on hover to reveal radio icon underneath
              (isCompleted || isHovered) 
                ? "translate-x-8" // Move right to reveal radio icon
                : "translate-x-0" // Normal position, covering radio icon
            )}>
              {card.title}
            </h4>

            {/* Action Buttons - Positioned absolutely on the right */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Edit Icon - Show on hover for large devices */}
              {isHovered && (
                <div className="hidden lg:block">
                  <button
                    onClick={handleEdit}
                    disabled={updateCardMutation.isPending}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded transition-all duration-300 ease-out",
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

              {/* Delete Icon - Only show when completed */}
              {isCompleted && (
                <button
                  onClick={handleDelete}
                  disabled={deleteCardMutation.isPending}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded transition-all duration-300 ease-out",
                    deleteCardMutation.isPending 
                      ? "cursor-not-allowed opacity-50" 
                      : "hover:bg-red-100 dark:hover:bg-red-500/20 hover:scale-105"
                  )}
                >
                  {deleteCardMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300" />
                  )}
                </button>
              )}
            </div>
          </div>
        </CardContent>
          </Card>
        )}
      </Draggable>

      <CardModal 
        card={card}
        list={list}
        boardId={boardId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
