"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Checklist } from "@/lib/types";

interface CopyChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: Checklist;
  cardId: string;
  boardId: string;
}

export function CopyChecklistModal({ 
  isOpen, 
  onClose, 
  checklist, 
  cardId, 
  boardId 
}: CopyChecklistModalProps) {
  const [newTitle, setNewTitle] = useState(`${checklist.title} (Copy)`);
  const queryClient = useQueryClient();

  const copyChecklistMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          cardId,
          items: checklist.items.map(item => ({
            content: item.content,
            isCompleted: false // Reset completion status for copy
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy checklist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Checklist copied successfully!");
      onClose();
      setNewTitle(`${checklist.title} (Copy)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCopy = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title for the copied checklist");
      return;
    }

    copyChecklistMutation.mutate({
      title: newTitle.trim(),
    });
  };

  const handleClose = () => {
    setNewTitle(`${checklist.title} (Copy)`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* Custom Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Copy Checklist
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter checklist title..."
              className="w-full"
              autoFocus
            />
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            This will copy {checklist.items.length} item(s) to the new checklist
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={copyChecklistMutation.isPending}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopy}
              disabled={copyChecklistMutation.isPending || !newTitle.trim()}
              className="px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
            >
              {copyChecklistMutation.isPending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              ) : null}
              {copyChecklistMutation.isPending ? "Copying..." : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
