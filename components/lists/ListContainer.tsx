"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Edit, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCardForm } from "@/components/cards/CreateCardForm";
import { CardItem } from "@/components/cards/CardItem";
import { CopyListModal } from "./CopyListModal";
import { DeleteConfirmationModal } from "@/components/ui/DeleteConfirmationModal";
import { toast } from "sonner";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { List as ListType, UpdateListParams, Board, List } from "@/lib/types";

interface ListContainerProps {
  list: ListType;
  boardId: string;
  index: number;
}

export function ListContainer({ list, boardId, index }: ListContainerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get the current list data from query cache to stay in sync
  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: false, // Don't fetch, just subscribe to cache updates
  });

  // Get the current list title from the query cache
  const currentList = boardData?.lists?.find((l: List) => l.id === list.id);
  const displayTitle = currentList?.title || list.title;

  // Update editTitle when displayTitle changes
  useEffect(() => {
    setEditTitle(displayTitle);
  }, [displayTitle]);

  const updateListMutation = useMutation({
    mutationFn: async ({ title }: UpdateListParams) => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update list");
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success("List updated successfully!");
      // Update the query cache immediately for instant UI feedback
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          lists: oldData.lists.map((l: List) => 
            l.id === list.id ? { ...l, title: variables.title } : l
          )
        };
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      // Revert the optimistic update on error
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          lists: oldData.lists.map((l: List) => 
            l.id === list.id ? { ...l, title: list.title } : l
          )
        };
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete list");
      return response.json();
    },
    onSuccess: () => {
      toast.success("List deleted successfully!");
      queryClient.refetchQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = () => {
    if (editTitle.trim() && editTitle !== list.title) {
      const newTitle = editTitle.trim();
      
      // Optimistic update - update UI immediately
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          lists: oldData.lists.map((l: List) => 
            l.id === list.id ? { ...l, title: newTitle } : l
          )
        };
      });
      
      updateListMutation.mutate({ title: newTitle });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    deleteListMutation.mutate();
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <Draggable draggableId={list.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`w-64 min-[320px]:w-72 sm:w-80 flex-shrink-0 cursor-grab active:cursor-grabbing transition-all duration-300 ease-out ${
            snapshot.isDragging ? "opacity-90 scale-[1.02] rotate-1 shadow-lg z-50" : ""
          }`}
          >
            <Card
              className={cn(
                "h-fit bg-slate-50 dark:bg-black border-slate-200 border-2 dark:border-slate-800 py-0 shadow-lg gap-2 transition-all duration-300 ease-out rounded-md",
                snapshot.isDragging && "border-teal-600 shadow-md"
              )}
            >
              <CardHeader className="p-3 m-1 rounded-md rounded-b-none bg-slate-100 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
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
                        className="h-8 text-base font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-800 focus:border-blue-400 transition-all duration-200 flex-1"
                        autoFocus
                      />
                    ) : (
                      <CardTitle
                        className="text-base cursor-pointer px-2 py-1 rounded transition-all duration-200 text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-100 flex-1"
                        onClick={() => setIsEditing(true)}
                      >
                        {displayTitle}
                      </CardTitle>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    >
                      <DropdownMenuItem
                        onClick={() => setIsEditing(true)}
                        className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsCopyModalOpen(true)}
                        className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy List
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

              <CardContent className="p-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-700 hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-500">
                <Droppable droppableId={list.id} type="card">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[20px]",
                        snapshot.isDraggingOver &&
                          "bg-blue-50 dark:bg-blue-900/20 rounded-md"
                      )}
                    >
                      {list.cards.map((card, index) => (
                        <CardItem
                          key={card.id}
                          card={card}
                          list={{ id: list.id, title: list.title }}
                          boardId={boardId}
                          index={index}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>

              {/* Fixed Card Footer */}
              <div className="flex items-center m-1 px-3 py-4 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200">
                {isCreateCardOpen ? (
                  <CreateCardForm
                    listId={list.id}
                    boardId={boardId}
                    onSuccess={() => setIsCreateCardOpen(false)}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-500 dark:text-slate-400 hover:text-strong dark:hover:text-white transition-all duration-300 ease-out hover:scale-[1.005] group p-0 h-auto bg-transparent hover:bg-transparent dark:hover:bg-transparent"
                    onClick={() => setIsCreateCardOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300 ease-out" />
                    Add a card
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </Draggable>

      <CopyListModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        list={list}
        currentBoardId={boardId}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
        itemName={list.title}
        isLoading={deleteListMutation.isPending}
      />
    </>
  );
}
