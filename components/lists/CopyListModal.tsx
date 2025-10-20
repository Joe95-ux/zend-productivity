"use client";

import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const copyListSchema = z.object({
  name: z.string().min(1, "Please enter a list name"),
  targetBoardId: z.string().min(1, "Please select a target board"),
  position: z.enum(["left", "right", "after"]),
  afterListId: z.string().optional(),
});

type CopyListFormData = z.infer<typeof copyListSchema>;

interface CopyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: {
    id: string;
    title: string;
    position: number;
    cards: any[];
  };
  currentBoardId: string;
}

export function CopyListModal({
  isOpen,
  onClose,
  list,
  currentBoardId,
}: CopyListModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>(currentBoardId);
  const queryClient = useQueryClient();

  const form = useForm<CopyListFormData>({
    resolver: zodResolver(copyListSchema),
    defaultValues: {
      name: list.title,
      targetBoardId: currentBoardId,
      position: "right",
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

  // Fetch target board for list selection
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

  const copyListMutation = useMutation({
    mutationFn: async (data: CopyListFormData) => {
      const response = await fetch("/api/lists/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listId: list.id,
          targetBoardId: data.targetBoardId,
          position: data.position,
          afterListId: data.afterListId,
          newTitle: data.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy list");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success("List copied successfully!");
      queryClient.refetchQueries({ queryKey: ["board", variables.targetBoardId] });
      if (variables.targetBoardId !== currentBoardId) {
        queryClient.refetchQueries({ queryKey: ["board", currentBoardId] });
      }
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy list");
    },
  });

  const onSubmit = async (data: CopyListFormData) => {
    copyListMutation.mutate(data);
  };

  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    form.setValue("targetBoardId", boardId);
  };

  const handlePositionChange = (position: string) => {
    form.setValue("position", position as "left" | "right" | "after");
  };

  // Watch for form changes to update selectedBoardId
  const watchedTargetBoardId = form.watch("targetBoardId");
  useEffect(() => {
    if (watchedTargetBoardId && watchedTargetBoardId !== selectedBoardId) {
      setSelectedBoardId(watchedTargetBoardId);
    }
  }, [watchedTargetBoardId, selectedBoardId]);

  const targetBoardLists = targetBoard?.lists || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-medium">
            Copy List
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* List Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter list name"
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
                        {boards?.map((board: any) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBoardId && targetBoardLists.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Target board has {targetBoardLists.length} list{targetBoardLists.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position Selection - Full Width */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={handlePositionChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="left" id="left" className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="left" className="font-medium">Left side</Label>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Place at the beginning of the board
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="right" id="right" className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="right" className="font-medium">Right side</Label>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Place at the end of the board
                              {targetBoardLists.length > 0 && (
                                <span className="ml-1">
                                  ({targetBoardLists.length} existing list{targetBoardLists.length !== 1 ? 's' : ''})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="after" id="after" className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="after" className="font-medium">After specific list</Label>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Choose which list to place after
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* After List Selection (if position is "after") */}
              {form.watch("position") === "after" && (
                <FormField
                  control={form.control}
                  name="afterListId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>After List</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBoardId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Choose list to place after" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetBoardLists.map((targetList: any) => (
                            <SelectItem key={targetList.id} value={targetList.id}>
                              {targetList.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={copyListMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {copyListMutation.isPending ? "Copying..." : "Copy List"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
