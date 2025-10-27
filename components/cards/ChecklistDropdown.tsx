"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListTodo, X } from "lucide-react";
import { toast } from "sonner";
import { Checklist } from "@/lib/types";

interface ChecklistDropdownProps {
  cardId: string;
  boardId: string;
  existingChecklists: Checklist[];
}

export function ChecklistDropdown({ 
  cardId, 
  boardId, 
  existingChecklists
}: ChecklistDropdownProps) {
  const [title, setTitle] = useState("");
  const [copyFromChecklistId, setCopyFromChecklistId] = useState<string>("none");
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const createChecklistMutation = useMutation({
    mutationFn: async ({ title, copyFromChecklistId }: { title: string; copyFromChecklistId: string }) => {
      // When copying from a checklist, uncheck all items to avoid errors
      const itemsToCopy = copyFromChecklistId !== "none" 
        ? existingChecklists.find(c => c.id === copyFromChecklistId)?.items.map(item => ({
            content: item.content,
            isCompleted: false // Always set to false for new checklist
          })) || []
        : [];

      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          cardId,
          items: itemsToCopy
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checklist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Checklist created successfully!");
      setTitle("");
      setCopyFromChecklistId("none");
      setIsOpen(false); // Close dropdown after successful creation
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = useCallback(() => {
    setTitle("");
    setCopyFromChecklistId("none");
    setIsOpen(false);
  }, []);

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a checklist title");
      return;
    }

    createChecklistMutation.mutate({ 
      title: title.trim(), 
      copyFromChecklistId 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
        >
          <ListTodo className="w-4 h-4 mr-2" />
          Checklist
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0 bg-slate-200 dark:bg-[#0D1117]">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h3 className="text-[16px] mx-auto font-semibold text-slate-900 dark:text-white">
            Add Checklist
          </h3>
          <button
            onClick={handleClose}
            className="p-1 focus:outline-none focus:ring-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Title Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter checklist title..."
              className="w-full h-10 rounded-sm"
              autoFocus
              onKeyPress={handleKeyPress}
            />
          </div>

          {/* Copy Items From Dropdown */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Copy items from...
            </label>
            <Select value={copyFromChecklistId} onValueChange={setCopyFromChecklistId}>
              <SelectTrigger className="w-full h-10 rounderd-sm">
                <SelectValue placeholder="Select a checklist to copy from" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2 h-10">
                    <ListTodo className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">None (empty checklist)</span>
                  </div>
                </SelectItem>
                {existingChecklists.map((checklist) => (
                  <SelectItem key={checklist.id} value={checklist.id}>
                    <div className="flex items-center gap-2 h-10">
                      <ListTodo className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>{checklist.title}</span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({checklist.items.length} items)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end">
            <Button
              onClick={handleCreate}
              disabled={createChecklistMutation.isPending || !title.trim()}
              className="px-4 bg-teal-700 hover:bg-teal-900 text-slate-100"
            >
              {createChecklistMutation.isPending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              ) : null}
              {createChecklistMutation.isPending ? "Creating..." : "Add Checklist"}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
