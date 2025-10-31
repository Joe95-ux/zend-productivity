"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Board, List } from "@/lib/types";

const createListSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
});

type CreateListFormData = z.infer<typeof createListSchema>;

interface CreateListFormProps {
  boardId: string;
  onSuccess?: () => void;
}

export function CreateListForm({ boardId, onSuccess }: CreateListFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateListFormData>({
    resolver: zodResolver(createListSchema),
    defaultValues: {
      title: "",
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (data: CreateListFormData) => {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          boardId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create list");
      }

      return response.json();
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(["board", boardId]);

      // Get current lists to determine next position
      const currentBoard = queryClient.getQueryData<Board>(["board", boardId]);
      const nextPosition = currentBoard?.lists?.length ? Math.max(...currentBoard.lists.map((l) => l.position)) + 1 : 1;

      // Create optimistic list
      const optimisticList = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: newData.title,
        position: nextPosition,
        boardId: boardId,
        cards: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically update the cache
      queryClient.setQueryData<Board>(["board", boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: [...(old.lists || []), optimisticList]
        };
      });

      // Return a context object with the snapshotted value
      return { previousBoard, optimisticList };
    },
    onSuccess: (data, variables, context) => {
      // Update the cache with the real data from server
      queryClient.setQueryData<Board>(["board", boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((list) => 
            list.id === context?.optimisticList.id ? data : list
          )
        };
      });
      
      toast.success("List created successfully!");
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CreateListFormData) => {
    setIsSubmitting(true);
    try {
      await createListMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>List Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter list title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
            {isSubmitting ? "Creating..." : "Create List"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
