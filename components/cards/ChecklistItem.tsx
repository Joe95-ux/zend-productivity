"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  item: {
    id: string;
    text: string;
    completed: boolean;
    position: number;
  };
  cardId: string;
}

export function ChecklistItem({ item, cardId }: ChecklistItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async ({ text, completed }: { text?: string; completed?: boolean }) => {
      const response = await fetch(`/api/checklist-items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, completed }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update checklist item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const handleToggle = () => {
    updateItemMutation.mutate({ completed: !item.completed });
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2 rounded-md transition-all duration-200 cursor-pointer",
        "hover:bg-slate-600/50",
        item.completed && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggle}
    >
      {/* Radio Button */}
      <div className="flex-shrink-0">
        {item.completed ? (
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className={cn(
            "w-5 h-5 border-2 rounded-full transition-all duration-200",
            isHovered 
              ? "border-blue-400 bg-blue-400/10" 
              : "border-slate-400 group-hover:border-blue-300"
          )}>
            {isHovered && (
              <div className="w-full h-full rounded-full bg-blue-400/20 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Task Text */}
      <span className={cn(
        "flex-1 text-sm transition-all duration-200",
        item.completed 
          ? "line-through text-slate-400" 
          : "text-slate-200 group-hover:text-white"
      )}>
        {item.text}
      </span>
    </div>
  );
}
