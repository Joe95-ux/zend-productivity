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
import { Card, Board, List } from "@/lib/types";
import { ArrowRight, Sparkles } from "lucide-react";

const moveCardSchema = z.object({
  targetBoardId: z.string().min(1, "Please select a board"),
  targetListId: z.string().min(1, "Please select a list"),
  position: z.number().min(0, "Please select a position"),
});

interface MoveCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  currentBoardId: string;
  currentListId: string;
}

export function MoveCardModal({ isOpen, onClose, card, currentBoardId, currentListId }: MoveCardModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>(currentBoardId);
  const [selectedListId, setSelectedListId] = useState<string>(currentListId);
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

  // Fetch current board data to get next list
  const { data: currentBoardData } = useQuery({
    queryKey: ["board", currentBoardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${currentBoardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: !!currentBoardId,
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
    resolver: zodResolver(moveCardSchema),
    defaultValues: {
      targetBoardId: currentBoardId,
      targetListId: currentListId,
      position: card.position - 1, // Convert 1-based to 0-based for dropdown
    },
  });

  // Watch for board changes
  const watchedTargetBoardId = form.watch("targetBoardId");
  const watchedTargetListId = form.watch("targetListId");

  useEffect(() => {
    if (watchedTargetBoardId && watchedTargetBoardId !== selectedBoardId) {
      setSelectedBoardId(watchedTargetBoardId);
      // Reset list and position when board changes
      const firstList = targetBoardLists?.lists?.[0];
      if (firstList) {
        setSelectedListId(firstList.id);
        form.setValue("targetListId", firstList.id);
      }
      form.setValue("position", 0); // Reset to first position when changing boards
    }
  }, [watchedTargetBoardId, selectedBoardId, targetBoardLists, form]);

  useEffect(() => {
    if (watchedTargetListId && watchedTargetListId !== selectedListId) {
      setSelectedListId(watchedTargetListId);
      // When changing lists, use card's current position if moving within same list, otherwise reset to 0
      const newPosition = watchedTargetListId === currentListId ? card.position - 1 : 0;
      form.setValue("position", newPosition);
    }
  }, [watchedTargetListId, selectedListId, form, card.position, currentListId]);

  // Update position options when target list changes
  useEffect(() => {
    if (targetBoardLists?.lists) {
      const targetList = targetBoardLists.lists.find((l: List) => l.id === selectedListId);
      if (targetList) {
        const cardCount = targetList.cards?.length || 0;
        const currentPosition = form.getValues("position");
        
        // If current position is greater than available positions, reset to the card's current position or 0
        if (currentPosition > cardCount) {
          const newPosition = selectedListId === currentListId ? Math.min(card.position - 1, cardCount) : 0;
          form.setValue("position", newPosition);
        }
      }
    }
  }, [targetBoardLists, selectedListId, form, card.position, currentListId]);

  const moveCardMutation = useMutation({
    mutationFn: async (data: { targetBoardId: string; targetListId: string; position: number }) => {
      console.log("Move card mutation:", { cardId: card.id, ...data });
      
      const response = await fetch("/api/cards/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          targetBoardId: data.targetBoardId,
          targetListId: data.targetListId,
          position: data.position,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Move card API error:", error);
        throw new Error(error.error || "Failed to move card");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log("Move card success:", data);
      console.log("Move card variables:", variables);
      queryClient.invalidateQueries({ queryKey: ["board", currentBoardId] });
      queryClient.invalidateQueries({ queryKey: ["board", variables.targetBoardId] });
      toast.success("Card moved successfully!");
      onClose();
    },
    onError: (error: Error) => {
      console.error("Move card error:", error);
      toast.error(`Failed to move card: ${error.message}`);
    },
    retry: 1, // Retry once on failure
  });

  const suggestedMoveMutation = useMutation({
    mutationFn: async (data: { targetBoardId: string; targetListId: string; position: number }) => {
      console.log("Suggested move mutation:", { cardId: card.id, ...data });
      
      const response = await fetch("/api/cards/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          targetBoardId: data.targetBoardId,
          targetListId: data.targetListId,
          position: data.position,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Suggested move API error:", error);
        throw new Error(error.error || "Failed to move card");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log("Suggested move success:", data);
      queryClient.invalidateQueries({ queryKey: ["board", currentBoardId] });
      queryClient.invalidateQueries({ queryKey: ["board", variables.targetBoardId] });
      toast.success("Card moved successfully!");
      onClose();
    },
    onError: (error: Error) => {
      console.error("Suggested move error:", error);
      toast.error(`Failed to move card: ${error.message}`);
    },
    retry: 1, // Retry once on failure
  });

  const handleSubmit = (data: { targetBoardId: string; targetListId: string; position: number }) => {
    moveCardMutation.mutate(data);
  };

  const handleSuggestedMove = () => {
    if (currentBoardData?.lists) {
      const currentListIndex = currentBoardData.lists.findIndex((l: List) => l.id === currentListId);
      const nextList = currentBoardData.lists[currentListIndex + 1];
      
      if (nextList) {
        console.log("Suggested move:", {
          cardId: card.id,
          targetBoardId: currentBoardId,
          targetListId: nextList.id,
          position: 0
        });
        
        // Trigger the move directly
        suggestedMoveMutation.mutate({
          targetBoardId: currentBoardId,
          targetListId: nextList.id,
          position: 0, // Move to the beginning of the next list
        });
      } else {
        console.error("No next list found");
      }
    } else {
      console.error("No current board data available");
    }
  };

  const targetList = targetBoardLists?.lists?.find((l: List) => l.id === selectedListId);
  const cardCount = targetList?.cards?.length || 0;
  const isSameBoard = selectedBoardId === currentBoardId;
  const isSameList = selectedListId === currentListId;

  // Get next list for suggested move
  const currentListIndex = currentBoardData?.lists?.findIndex((l: List) => l.id === currentListId) || -1;
  const nextList = currentBoardData?.lists?.[currentListIndex + 1];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center font-medium">
            Move Card
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Current Location */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Location</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Board: <span className="font-medium">{currentBoardData?.title}</span> • 
                List: <span className="font-medium">{currentBoardData?.lists?.find((l: List) => l.id === currentListId)?.title}</span>
              </p>
            </div>
            {/* Suggested Move */}
            {nextList && currentBoardData && (
              <div className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Suggested
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggestedMove}
                  className="w-full h-12 justify-start"
                  disabled={suggestedMoveMutation.isPending || !currentBoardData}
                >
                  {suggestedMoveMutation.isPending ? (
                    <div className="w-4 h-4 mr-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  <span>{nextList.title}</span>
                </Button>
              </div>
            )}

            {/* Move to section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select destination
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

              {/* List and Position Row */}
              <div className="flex gap-3">
                {/* List Selection - 2/3 width */}
                <FormField
                  control={form.control}
                  name="targetListId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>List</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Choose list" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetBoardLists?.lists?.map((list: List) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Position Selection - 1/3 width */}
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Pos" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="top">
                          {Array.from({ length: isSameList ? cardCount : cardCount + 1 }, (_, i) => {
                            const position = i; // zero-based position
                            const displayPosition = i + 1; // user-facing
                            const isCurrentPosition = isSameList && position === (card.position - 1);
                            const isEndPosition = position === (isSameList ? Math.max(cardCount - 1, 0) : cardCount);

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
            </div>

            {/* Info text */}
            {selectedBoardId && selectedListId && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSameBoard && isSameList 
                  ? `Moving within the same list (${cardCount} existing cards)`
                  : `Target list has ${cardCount} existing cards`
                }
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={moveCardMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {moveCardMutation.isPending ? "Moving..." : "Move Card"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
