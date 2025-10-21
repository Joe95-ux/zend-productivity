"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Board, List, Card } from "@/lib/types";

const copyCardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  targetBoardId: z.string().min(1, "Please select a target board"),
  targetListId: z.string().min(1, "Please select a target list"),
  position: z.number().min(0, "Position must be 0 or greater"),
});

type CopyCardFormData = z.infer<typeof copyCardSchema>;

interface CopyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  currentBoardId: string;
  currentListId: string;
}

export function CopyCardModal({
  isOpen,
  onClose,
  card,
  currentBoardId,
  currentListId,
}: CopyCardModalProps) {
  const [selectedBoardId, setSelectedBoardId] =
    useState<string>(currentBoardId);
  const queryClient = useQueryClient();

  const form = useForm<CopyCardFormData>({
    resolver: zodResolver(copyCardSchema),
    defaultValues: {
      name: card.title,
      targetBoardId: currentBoardId,
      targetListId: currentListId,
      position: card.position - 1, // Convert 1-based to 0-based for dropdown
    },
  });

  // Fetch all boards
  const { data: boards } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const response = await fetch("/api/boards");
      if (!response.ok) throw new Error("Failed to fetch boards");
      return response.json();
    },
  });

  // Fetch lists for selected board
  const { data: targetBoard } = useQuery({
    queryKey: ["board", selectedBoardId],
    queryFn: async () => {
      if (!selectedBoardId) return null;
      const response = await fetch(`/api/boards/${selectedBoardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: !!selectedBoardId,
  });

  const copyCardMutation = useMutation({
    mutationFn: async (data: CopyCardFormData) => {
      const response = await fetch("/api/cards/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: card.id,
          targetBoardId: data.targetBoardId,
          targetListId: data.targetListId,
          position: data.position,
          newTitle: data.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy card");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success("Card copied successfully!");
      
      // Force refetch of the target board to ensure UI updates immediately
      queryClient.refetchQueries({
        queryKey: ["board", variables.targetBoardId],
      });
      
      // If copying to a different board, also refetch the current board
      if (variables.targetBoardId !== currentBoardId) {
        queryClient.refetchQueries({ 
          queryKey: ["board", currentBoardId] 
        });
      }
      
      // Also invalidate any activities queries that might be affected
      queryClient.invalidateQueries({
        queryKey: ["activities"],
      });
      
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy card");
    },
  });

  const onSubmit = async (data: CopyCardFormData) => {
    copyCardMutation.mutate(data);
  };

  const targetBoardLists = useMemo(
    () => targetBoard?.lists || [],
    [targetBoard?.lists]
  );

  // Get the current list to show card count
  const selectedListId = form.watch("targetListId");
  const currentList = targetBoardLists.find(
    (list: List) => list.id === selectedListId
  );


  // Check if copying to the same list
  const isSameList = selectedListId === currentListId;

  // Calculate card count: use full count for position dropdown (we want to show all possible positions)
  const cardCount = currentList?.cards?.length || 0;


  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    form.setValue("targetBoardId", boardId);
    form.setValue("targetListId", ""); // Reset list selection
    form.setValue("position", 0); // Reset position to first (0-based)
  };

  // Update position when target list changes
  useEffect(() => {
    if (selectedListId) {
      const targetList = targetBoardLists.find(
        (list: List) => list.id === selectedListId
      );
      const targetCardCount = targetList?.cards?.length || 0;

        if (selectedListId === currentListId) {
          // When copying within the same list, we can place the card at any position
          // including the current card's position, plus the end position
          const maxPosition = targetCardCount; // Maximum valid position (end position)

          // Use current position as default when copying within same list (convert to 0-based)
          const newPosition = Math.min(card.position - 1, maxPosition);
          form.setValue("position", newPosition);
        } else {
          // If copying to different list, default to end position
          form.setValue("position", targetCardCount);
        }
    }
  }, [selectedListId, targetBoardLists, currentListId, card.position, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-medium">
            Copy Card
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Card Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter card name"
                      className="w-full h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Copy to section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Copy to...
              </p>

              {/* Board Selection - Full Width */}
              <FormField
                control={form.control}
                name="targetBoardId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Board</FormLabel>
                    <Select
                      onValueChange={handleBoardChange}
                      defaultValue={field.value}
                    >
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

              {/* List and Position - Same Row */}
              <div className="grid grid-cols-3 gap-4">
                {/* List Selection - 2/3 width */}
                <FormField
                  control={form.control}
                  name="targetListId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>List</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBoardId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Choose list" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetBoardLists.map((list: List) => (
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

                {/* Position - 1/3 width */}
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Position</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        value={field.value?.toString() ?? card.position.toString()}
                        disabled={!selectedListId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue
                              placeholder={
                                selectedListId
                                  ? "Select position"
                                  : "Select list first"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="top">
                          {selectedListId ? (
                            <>
                              {Array.from({ length: cardCount + 1 }, (_, i) => {
                                const position = i; // zero-based position
                                const displayPosition = i + 1; // user-facing
                                const isCurrentPosition =
                                  isSameList && position === (card.position - 1);
                                const isEndPosition = position === cardCount;

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
                            </>
                          ) : (
                            <SelectItem value="1" disabled>
                              Select a list first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {/* {cardCount > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {cardCount} cards in list
                        </p>
                      )} */}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={copyCardMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {copyCardMutation.isPending ? "Copying..." : "Copy Card"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
