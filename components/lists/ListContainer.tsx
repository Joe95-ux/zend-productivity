"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCardForm } from "@/components/cards/CreateCardForm";
import { CardItem } from "@/components/cards/CardItem";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface ListContainerProps {
  list: {
    id: string;
    title: string;
    position: number;
    cards: Array<{
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
    }>;
  };
}

function SortableListContainer({ list }: ListContainerProps) {
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateListMutation = useMutation({
    mutationFn: async ({ title, position }: { title?: string; position?: number }) => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update list");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete list");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("List deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = () => {
    if (editTitle.trim() && editTitle !== list.title) {
      updateListMutation.mutate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this list? This action cannot be undone.")) {
      deleteListMutation.mutate();
    }
  };

  const combinedRef = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableRef(node);
  };

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`w-72 sm:w-80 flex-shrink-0 ${isDragging ? "opacity-50" : ""}`}
    >
      <Card className={cn(
        "h-fit bg-slate-50 dark:bg-black border-slate-200 dark:border-slate-800 shadow-lg gap-2 transition-all duration-200 py-6",
        isOver && "ring-2 ring-blue-400 ring-opacity-50 bg-slate-100 dark:bg-slate-900"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEdit();
                  } else if (e.key === "Escape") {
                    setEditTitle(list.title);
                    setIsEditing(false);
                  }
                }}
                className="h-8 text-base font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-800 focus:border-blue-400 transition-all duration-200"
                autoFocus
              />
            ) : (
              <CardTitle 
                className="text-base cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded transition-all duration-200 text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-100"
                onClick={() => setIsEditing(true)}
              >
                {list.title}
              </CardTitle>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DropdownMenuItem 
                  onClick={() => setIsEditing(true)} 
                  className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-400 focus:text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          <SortableContext items={list.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
            {list.cards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </SortableContext>
          
          {isCreateCardOpen ? (
            <CreateCardForm 
              listId={list.id} 
              onSuccess={() => setIsCreateCardOpen(false)} 
            />
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => setIsCreateCardOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
              Add a card
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ListContainer({ list }: ListContainerProps) {
  return <SortableListContainer list={list} />;
}
