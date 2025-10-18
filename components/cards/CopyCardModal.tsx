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

const copyCardSchema = z.object({
  targetBoardId: z.string().min(1, "Please select a target board"),
  targetListId: z.string().min(1, "Please select a target list"),
  position: z.enum(["top", "bottom", "after"]),
  afterCardId: z.string().optional(),
});

type CopyCardFormData = z.infer<typeof copyCardSchema>;

interface CopyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
    isCompleted: boolean;
    labels: any[];
    checklists: any[];
    comments: any[];
    dueDate?: string;
    assignedTo?: string;
  };
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
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const queryClient = useQueryClient();

  const form = useForm<CopyCardFormData>({
    resolver: zodResolver(copyCardSchema),
    defaultValues: {
      targetBoardId: currentBoardId,
      targetListId: "",
      position: "bottom",
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
          afterCardId: data.afterCardId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy card");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Card copied successfully!");
      queryClient.invalidateQueries({ queryKey: ["board", data.targetBoardId] });
      if (data.targetBoardId !== currentBoardId) {
        queryClient.invalidateQueries({ queryKey: ["board", currentBoardId] });
      }
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy card");
    },
  });

  const onSubmit = async (data: CopyCardFormData) => {
    copyCardMutation.mutate(data);
  };

  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    form.setValue("targetBoardId", boardId);
    form.setValue("targetListId", ""); // Reset list selection
  };

  const handleListChange = (listId: string) => {
    form.setValue("targetListId", listId);
  };

  const handlePositionChange = (position: string) => {
    form.setValue("position", position as "top" | "bottom" | "after");
  };

  const targetBoardLists = targetBoard?.lists || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Card
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

            {/* Target List Selection */}
            <FormField
              control={form.control}
              name="targetListId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target List</FormLabel>
                  <Select
                    onValueChange={handleListChange}
                    value={field.value}
                    disabled={!selectedBoardId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose target list" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {targetBoardLists.map((list: any) => (
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
                        <RadioGroupItem value="top" id="top" />
                        <Label htmlFor="top">Top of list</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bottom" id="bottom" />
                        <Label htmlFor="bottom">Bottom of list</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="after" id="after" />
                        <Label htmlFor="after">After specific card</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* After Card Selection (if position is "after") */}
            {form.watch("position") === "after" && (
              <FormField
                control={form.control}
                name="afterCardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>After Card</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch("targetListId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose card to place after" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targetBoardLists
                          .find((list: any) => list.id === form.watch("targetListId"))
                          ?.cards?.map((card: any) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.title}
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
