"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit } from "lucide-react";
import { ChecklistItem } from "./ChecklistItem";
import { toast } from "sonner";

interface ChecklistProps {
  checklist: {
    id: string;
    title: string;
    items: Array<{
      id: string;
      text: string;
      completed: boolean;
      position: number;
    }>;
  };
  cardId: string;
}

export function Checklist({ checklist, cardId }: ChecklistProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);
  const queryClient = useQueryClient();

  const addItemMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch("/api/checklist-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          checklistId: checklist.id,
          position: checklist.items.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add checklist item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setNewItemText("");
      setIsAddingItem(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      const response = await fetch(`/api/checklists/${checklist.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update checklist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setIsEditingTitle(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/checklists/${checklist.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete checklist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Checklist deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addItemMutation.mutate(newItemText.trim());
    }
  };

  const handleEditTitle = () => {
    if (editTitle.trim() && editTitle !== checklist.title) {
      updateChecklistMutation.mutate({ title: editTitle.trim() });
    } else {
      setEditTitle(checklist.title);
      setIsEditingTitle(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this checklist?")) {
      deleteChecklistMutation.mutate();
    }
  };

  const completedCount = checklist.items.filter(item => item.completed).length;
  const totalCount = checklist.items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Checklist Header */}
      <div className="flex items-center justify-between">
        {isEditingTitle ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleEditTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditTitle();
              } else if (e.key === "Escape") {
                setEditTitle(checklist.title);
                setIsEditingTitle(false);
              }
            }}
            className="h-8 text-sm font-medium bg-slate-700 border-slate-600 text-white"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h4 
              className="text-sm font-medium text-slate-200 cursor-pointer hover:text-white transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {checklist.title}
            </h4>
            <span className="text-xs text-slate-400">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
            onClick={() => setIsEditingTitle(true)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-600"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-1">
        {checklist.items.map((item) => (
          <ChecklistItem 
            key={item.id} 
            item={item} 
            cardId={cardId}
          />
        ))}
      </div>

      {/* Add Item */}
      {isAddingItem ? (
        <div className="space-y-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddItem();
              } else if (e.key === "Escape") {
                setNewItemText("");
                setIsAddingItem(false);
              }
            }}
            placeholder="Add an item..."
            className="h-8 text-sm bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="h-7 px-3 text-xs"
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewItemText("");
                setIsAddingItem(false);
              }}
              className="h-7 px-3 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-600/50 h-8"
          onClick={() => setIsAddingItem(true)}
        >
          <Plus className="w-3 h-3 mr-2" />
          Add an item
        </Button>
      )}
    </div>
  );
}
