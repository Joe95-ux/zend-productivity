"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Paperclip, CheckSquare, Circle } from "lucide-react";
import { CardModal } from "./CardModal";
import { Checklist } from "./Checklist";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface CardItemProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
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
        text: string;
        completed: boolean;
        position: number;
      }>;
    }>;
  };
}

export function CardItem({ card }: CardItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
    mutationFn: async ({ title, description, position }: { title?: string; description?: string; position?: number }) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, position }),
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

  // Calculate checklist progress
  const totalChecklistItems = card.checklists.reduce((acc, checklist) => acc + checklist.items.length, 0);
  const completedChecklistItems = card.checklists.reduce((acc, checklist) => 
    acc + checklist.items.filter(item => item.completed).length, 0
  );

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "group cursor-pointer transition-all duration-200 bg-slate-700 border-slate-600",
          "hover:shadow-lg hover:shadow-slate-900/20 hover:border-slate-500",
          "hover:scale-[1.02] hover:bg-slate-650",
          isDragging && "opacity-50"
        )}
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...attributes}
        {...listeners}
      >
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Card Title with Hover Radio Button */}
            <div className="flex items-start gap-3">
              {isHovered && (
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-4 h-4 border-2 border-blue-400 rounded-full bg-blue-400/10 flex items-center justify-center transition-all duration-200 animate-pulse">
                    <Circle className="w-2 h-2 text-blue-400" />
                  </div>
                </div>
              )}
              <h4 className="font-medium text-sm line-clamp-2 text-white group-hover:text-blue-100 transition-colors">
                {card.title}
              </h4>
            </div>
            
            {/* Description */}
            {card.description && (
              <p className="text-xs text-slate-300 line-clamp-2 group-hover:text-slate-200 transition-colors">
                {card.description}
              </p>
            )}
            
            {/* Labels */}
            {card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.labels.map((label) => (
                  <Badge 
                    key={label.id} 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 rounded-md transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Checklists Preview */}
            {card.checklists.length > 0 && (
              <div className="space-y-2">
                {card.checklists.slice(0, 2).map((checklist) => (
                  <div key={checklist.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">
                        {checklist.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {checklist.items.filter(item => item.completed).length}/{checklist.items.length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${checklist.items.length > 0 
                            ? (checklist.items.filter(item => item.completed).length / checklist.items.length) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
                {card.checklists.length > 2 && (
                  <span className="text-xs text-slate-400">
                    +{card.checklists.length - 2} more checklist{card.checklists.length - 2 !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            
            {/* Footer Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {card.comments.length > 0 && (
                  <div className="flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                    <MessageSquare className="w-3 h-3" />
                    <span>{card.comments.length}</span>
                  </div>
                )}
                {totalChecklistItems > 0 && (
                  <div className="flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                    <CheckSquare className="w-3 h-3" />
                    <span>{completedChecklistItems}/{totalChecklistItems}</span>
                  </div>
                )}
              </div>
              
              {/* Hover Actions */}
              {isHovered && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                </div>
              )}
            </div>
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
