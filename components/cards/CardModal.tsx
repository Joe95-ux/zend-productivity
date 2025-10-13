"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MessageSquare, Send, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const updateCardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
});

type UpdateCardFormData = z.infer<typeof updateCardSchema>;
type CommentFormData = z.infer<typeof commentSchema>;

interface CardModalProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
    labels: Array<{
      id: string;
      name: string;
      color: string;
    }>;
    comments: Array<{
      id: string;
      content: string;
      user: {
        name?: string;
        email: string;
      };
      createdAt: string;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function CardModal({ card, isOpen, onClose }: CardModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const cardForm = useForm<UpdateCardFormData>({
    resolver: zodResolver(updateCardSchema),
    defaultValues: {
      title: card.title,
      description: card.description || "",
    },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: async (data: UpdateCardFormData) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update card");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Card updated successfully!");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          cardId: card.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      commentForm.reset();
      toast.success("Comment added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateCard = (data: UpdateCardFormData) => {
    updateCardMutation.mutate(data);
  };

  const handleAddComment = (data: CommentFormData) => {
    addCommentMutation.mutate(data);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {isEditing ? (
                <Form {...cardForm}>
                  <form onSubmit={cardForm.handleSubmit(handleUpdateCard)} className="space-y-2">
                    <FormField
                      control={cardForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} className="text-xl font-semibold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{card.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            {isEditing ? (
              <Form {...cardForm}>
                <form onSubmit={cardForm.handleSubmit(handleUpdateCard)} className="space-y-2">
                  <FormField
                    control={cardForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="min-h-[60px] p-3 bg-muted/50 rounded-md">
                {card.description ? (
                  <p className="text-sm whitespace-pre-wrap">{card.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description</p>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          {card.labels.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {card.labels.map((label) => (
                  <Badge 
                    key={label.id} 
                    variant="secondary"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="font-semibold mb-2">Comments</h3>
            
            {/* Add Comment Form */}
            <Form {...commentForm}>
              <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-2 mb-4">
                <FormField
                  control={commentForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Write a comment..." 
                          {...field} 
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" disabled={addCommentMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </form>
            </Form>

            {/* Comments List */}
            <div className="space-y-3">
              {card.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {comment.user.name?.charAt(0) || comment.user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
