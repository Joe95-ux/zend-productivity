"use client";

import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

const copyListSchema = z.object({
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
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const queryClient = useQueryClient();

  const form = useForm<CopyListFormData>({
    resolver: zodResolver(copyListSchema),
    defaultValues: {
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy list");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("List copied successfully!");
      queryClient.invalidateQueries({ queryKey: ["board", data.targetBoardId] });
      if (data.targetBoardId !== currentBoardId) {
        queryClient.invalidateQueries({ queryKey: ["board", currentBoardId] });
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

  const targetBoardLists = targetBoard?.lists || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy List
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Target Board Selection */}
            <FormField
              control={form.control}
              name="targetBoardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Board</FormLabel>
                  <Select
                    onValueChange={handleBoardChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose target board" />
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Position Selection */}
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
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="left" />
                        <Label htmlFor="left">Left side</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="right" />
                        <Label htmlFor="right">Right side</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="after" id="after" />
                        <Label htmlFor="after">After specific list</Label>
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
                        <SelectTrigger>
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
