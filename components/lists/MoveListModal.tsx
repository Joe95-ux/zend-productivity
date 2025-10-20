"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { List, Board } from "@/lib/types";

const moveListSchema = z.object({
  targetBoardId: z.string().min(1, "Please select a board"),
  position: z.number().min(0, "Please select a position"),
});

interface MoveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: List;
  currentBoardId: string;
}

export function MoveListModal({ isOpen, onClose, list, currentBoardId }: MoveListModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>(currentBoardId);
  const queryClient = useQueryClient();

  // Fetch boards for dropdown
  const { data: boards } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const response = await fetch("/api/boards");
      if (!response.ok) throw new Error("Failed to fetch boards");
      return response.json();
    },
  });

  // Fetch target board lists
  const { data: targetBoardLists } = useQuery({
    queryKey: ["board", selectedBoardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${selectedBoardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: !!selectedBoardId,
  });

  const form = useForm({
    resolver: zodResolver(moveListSchema),
    defaultValues: {
      targetBoardId: currentBoardId,
      position: 0, // zero-based position
    },
  });

  // Watch for board changes
  const watchedTargetBoardId = form.watch("targetBoardId");
  useEffect(() => {
    if (watchedTargetBoardId && watchedTargetBoardId !== selectedBoardId) {
      setSelectedBoardId(watchedTargetBoardId);
      form.setValue("position", 0); // Reset position when board changes
    }
  }, [watchedTargetBoardId, selectedBoardId, form]);

  // Update position options when target board changes
  useEffect(() => {
    if (targetBoardLists?.lists) {
      const listCount = targetBoardLists.lists.length;
      const currentPosition = form.getValues("position");
      
      // If current position is greater than available positions, reset to 0
      if (currentPosition > listCount) {
        form.setValue("position", 0);
      }
    }
  }, [targetBoardLists, form]);

  const moveListMutation = useMutation({
    mutationFn: async (data: { targetBoardId: string; position: number }) => {
      const response = await fetch("/api/lists/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: list.id,
          targetBoardId: data.targetBoardId,
          position: data.position,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move list");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.refetchQueries({ queryKey: ["board", currentBoardId] });
      queryClient.refetchQueries({ queryKey: ["board", variables.targetBoardId] });
      toast.success("List moved successfully!");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: { targetBoardId: string; position: number }) => {
    moveListMutation.mutate(data);
  };

  const listCount = targetBoardLists?.lists?.length || 0;
  const isSameBoard = selectedBoardId === currentBoardId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center font-medium">
            Move List
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Current Location */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Location</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Board: <span className="font-medium">{boards?.find((b: Board) => b.id === currentBoardId)?.title}</span>
              </p>
            </div>
            {/* Move to section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Move to...
              </p>

              {/* Board Selection - Full Width */}
              <FormField
                control={form.control}
                name="targetBoardId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Board</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue placeholder="Choose board" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {boards?.map((board: Board) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position Selection - Full Width */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue placeholder="Choose position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent side="top">
                        {Array.from({ length: isSameBoard ? listCount : listCount + 1 }, (_, i) => {
                          const position = i; // zero-based position
                          const displayPosition = i + 1; // user-facing
                          const isCurrentPosition = isSameBoard && position === (list.position - 1);
                          const isEndPosition = position === (isSameBoard ? Math.max(listCount - 1, 0) : listCount);

                          return (
                            <SelectItem
                              key={i}
                              value={position.toString()}
                              className={
                                isCurrentPosition
                                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium"
                                  : ""
                              }
                            >
                              {isCurrentPosition
                                ? `${displayPosition} (current)`
                                : isEndPosition
                                ? `${displayPosition} (end)`
                                : displayPosition.toString()}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Info text */}
            {selectedBoardId && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSameBoard 
                  ? `Moving within the same board (${listCount} existing lists)`
                  : `Target board has ${listCount} existing lists`
                }
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={moveListMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {moveListMutation.isPending ? "Moving..." : "Move List"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
