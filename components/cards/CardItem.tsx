"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Check } from "lucide-react";
import { CardModal } from "./CardModal";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CardItemProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
    isCompleted: boolean;
    labels: Array<{
      id: string;
      name: string;
      color: string;
    }>;
    comments: Array<{
      id: string;
      content: string;
      user: {
        name?: string;
        email: string;
      };
      createdAt: string;
    }>;
    checklists: Array<{
      id: string;
      title: string;
      items: Array<{
        id: string;
        content: string;
        isCompleted: boolean;
      }>;
    }>;
  };
}

export function CardItem({ card }: CardItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleted, setIsCompleted] = useState(card.isCompleted);
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateCardMutation = useMutation({
    mutationFn: async ({ title, description, position, isCompleted }: { title?: string; description?: string; position?: number; isCompleted?: boolean }) => {
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
    setIsCompleted(!isCompleted);
    updateCardMutation.mutate({ isCompleted: !isCompleted });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "group cursor-pointer transition-all duration-200 bg-slate-900 border-slate-800 shadow-sm",
          "hover:shadow-lg hover:shadow-slate-900/30 hover:border-slate-600",
          "hover:scale-[1.02] hover:bg-slate-800",
          isDragging && "opacity-50",
          isCompleted && "opacity-60 bg-slate-800"
        )}
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...attributes}
        {...listeners}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 h-12 px-3">
            {/* Radio Button - Always visible when completed, hover-only when not completed */}
            {(isCompleted || isHovered) && (
              <div 
                className="hidden lg:flex flex-shrink-0 w-5 h-5 items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                onClick={handleToggleComplete}
              >
                {isCompleted ? (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center transition-all duration-200 animate-in zoom-in">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-slate-400 rounded-full hover:border-blue-400 transition-all duration-200"></div>
                )}
              </div>
            )}

            {/* Card Title */}
            <h4 className={cn(
              "flex-1 font-medium text-sm text-white transition-all duration-200",
              isCompleted && "line-through text-slate-400"
            )}>
              {card.title}
            </h4>

            {/* Edit Icon - Show on hover for large devices */}
            <div className="flex-shrink-0">
              {isHovered && (
                <div className="hidden lg:block">
                  <button
                    onClick={handleEdit}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-600 transition-all duration-200 hover:scale-110"
                  >
                    <Edit className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Delete Icon - Only show when completed */}
            {isCompleted && (
              <div className="flex-shrink-0">
                <button
                  onClick={handleDelete}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 transition-all duration-200 hover:scale-110"
                >
                  <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CardModal 
        card={card} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
