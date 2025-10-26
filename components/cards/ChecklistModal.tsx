"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Plus, Trash2, Edit, X, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Checklist, ChecklistItem } from "@/lib/types";
import { ChecklistConfirmationModal } from "@/components/ui/ChecklistConfirmationModal";

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    title: string;
    checklists?: Checklist[];
  };
  boardId: string;
}

export function ChecklistModal({ isOpen, onClose, card, boardId }: ChecklistModalProps) {
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleteChecklistOpen, setIsDeleteChecklistOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Create new checklist
  const createChecklistMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, cardId: card.id }),
      });
      if (!response.ok) throw new Error("Failed to create checklist");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Checklist created successfully!");
      setNewChecklistTitle("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update checklist title
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistId, title }: { checklistId: string; title: string }) => {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update checklist");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Checklist updated successfully!");
      setEditingChecklistId(null);
      setEditingTitle("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete checklist
  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete checklist");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Checklist deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create checklist item
  const createItemMutation = useMutation({
    mutationFn: async ({ checklistId, content }: { checklistId: string; content: string }) => {
      const response = await fetch("/api/checklist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId, content }),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Item added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update checklist item
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, content, isCompleted }: { itemId: string; content?: string; isCompleted?: boolean }) => {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isCompleted }),
      });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete checklist item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Item deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateChecklist = () => {
    if (newChecklistTitle.trim()) {
      createChecklistMutation.mutate(newChecklistTitle.trim());
    }
  };

  const handleUpdateChecklist = (checklistId: string) => {
    if (editingTitle.trim()) {
      updateChecklistMutation.mutate({ checklistId, title: editingTitle.trim() });
    }
  };

  const handleDeleteChecklist = (checklistId: string) => {
    setChecklistToDelete(checklistId);
    setIsDeleteChecklistOpen(true);
  };

  const handleCreateItem = (checklistId: string) => {
    if (newItemContent.trim()) {
      createItemMutation.mutate({ checklistId, content: newItemContent.trim() });
      setNewItemContent("");
    }
  };

  const handleToggleItem = (itemId: string, isCompleted: boolean) => {
    updateItemMutation.mutate({ itemId, isCompleted: !isCompleted });
  };

  const handleUpdateItem = (itemId: string) => {
    if (editingItemContent.trim()) {
      updateItemMutation.mutate({ itemId, content: editingItemContent.trim() });
      setEditingItemId(null);
      setEditingItemContent("");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const confirmDeleteChecklist = () => {
    if (checklistToDelete) {
      deleteChecklistMutation.mutate(checklistToDelete);
      setIsDeleteChecklistOpen(false);
      setChecklistToDelete(null);
    }
  };

  const getChecklistProgress = (checklist: Checklist) => {
    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter((item) => item.isCompleted).length;
    return { completed: completedItems, total: totalItems, percentage: totalItems > 0 ? (completedItems / totalItems) * 100 : 0 };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0D1117] border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Checklists
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Add Checklist</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Checklist title..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateChecklist()}
                className="flex-1 focus:ring-1 focus:ring-teal-500 h-10 rounded-sm"
              />
              <Button
                onClick={handleCreateChecklist}
                disabled={createChecklistMutation.isPending || !newChecklistTitle.trim()}
                className="bg-teal-600 text-slate-100 hover:bg-teal-700 h-10 rounded-sm"
              >
                {createChecklistMutation.isPending ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {createChecklistMutation.isPending ? "Creating..." : "Add"}
              </Button>
            </div>
          </div>

          {/* Existing Checklists */}
          <div className="space-y-4">
            {card.checklists?.map((checklist) => {
              const progress = getChecklistProgress(checklist);
              
              return (
                <div key={checklist.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  {/* Checklist Header */}
                  <div className="flex items-center justify-between mb-3">
                    {editingChecklistId === checklist.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleUpdateChecklist(checklist.id)}
                          className="flex-1 focus:ring-1 focus:ring-teal-500"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateChecklist(checklist.id)}
                          disabled={updateChecklistMutation.isPending}
                          className="h-10 rounded-sm"
                        >
                          {updateChecklistMutation.isPending ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingChecklistId(null);
                            setEditingTitle("");
                          }}
                          className="h-10 rounded-sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {checklist.title}
                          </h3>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingChecklistId(checklist.id);
                              setEditingTitle(checklist.title);
                            }}
                            className="h-8 rounded-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteChecklist(checklist.id)}
                            className="h-10 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress.percentage === 0 
                          ? 'bg-slate-400 dark:bg-slate-600' 
                          : progress.percentage < 25 
                          ? 'bg-red-500' 
                          : progress.percentage < 50 
                          ? 'bg-orange-500' 
                          : progress.percentage < 75 
                          ? 'bg-yellow-500' 
                          : progress.percentage < 100 
                          ? 'bg-blue-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {checklist.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingItemContent}
                              onChange={(e) => setEditingItemContent(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && handleUpdateItem(item.id)}
                              className="h-10 rounded-sm flex-1 focus:ring-1 focus:ring-teal-500"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateItem(item.id)}
                              disabled={updateItemMutation.isPending}
                              className="h-8 rounded-sm"
                            >
                              {updateItemMutation.isPending ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItemId(null);
                                setEditingItemContent("");
                              }}
                              className="h-8 rounded-sm"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleItem(item.id, item.isCompleted)}
                              className="flex-shrink-0 w-5 h-5 border-2 rounded border-slate-300 dark:border-slate-600 hover:border-teal-600 dark:hover:border-teal-600 transition-colors"
                            >
                              {item.isCompleted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                >
                                  <Check className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                            </button>
                            <span className={`flex-1 text-sm ${item.isCompleted ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                              {item.content}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemContent(item.content);
                                }}
                                className="h-8 rounded-sm"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add New Item */}
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder="Add an item..."
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCreateItem(checklist.id)}
                        className="flex-1 h-10 rounded-sm focus:ring-1 focus:ring-teal-500"
                      />
                      <Button
                        onClick={() => handleCreateItem(checklist.id)}
                        disabled={createItemMutation.isPending || !newItemContent.trim()}
                        size="sm"
                        className="bg-teal-600 text-slate-100 hover:bg-teal-700 h-10 rounded-sm"
                      >
                        {createItemMutation.isPending ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} className="bg-slate-600 text-slate-100 hover:bg-slate-700 h-10 rounded-sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <ChecklistConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteItem}
        title="Delete Checklist Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        isLoading={deleteItemMutation.isPending}
      />
      
      <ChecklistConfirmationModal
        isOpen={isDeleteChecklistOpen}
        onClose={() => setIsDeleteChecklistOpen(false)}
        onConfirm={confirmDeleteChecklist}
        title="Delete Checklist"
        description="Are you sure you want to delete this checklist? This action cannot be undone."
        isLoading={deleteChecklistMutation.isPending}
      />
    </Dialog>
  );
}
