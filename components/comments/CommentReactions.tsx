"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmojiPickerComponent } from "./EmojiPicker";
import { Smile, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CommentItemData } from "./CommentItem";

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
}

interface CommentReactionsProps {
  commentId: string;
  reactions: Reaction[];
  currentUserId?: string;
  boardId: string;
}

export function CommentReactions({
  commentId,
  reactions,
  currentUserId,
  boardId,
}: CommentReactionsProps) {
  const queryClient = useQueryClient();
  const [loadingEmoji, setLoadingEmoji] = useState<string | null>(null);

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const toggleReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      setLoadingEmoji(emoji);
      const response = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle reaction");
      }

      return response.json();
    },
    onMutate: async (emoji: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["comments", boardId] });
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentItemData[]>(["comments", boardId]);
      
      // Get current user data from comments query if available
      const comments = previousComments;
      const currentUser = comments?.find((c: CommentItemData) => c.user?.id === currentUserId)?.user || null;

      // Optimistically update comments
      queryClient.setQueryData<CommentItemData[]>(["comments", boardId], (old) => {
        if (!old || !Array.isArray(old)) return old;
        
        return old.map((comment: CommentItemData) => {
          if (comment.id !== commentId) return comment;
          
          const reactions = comment.reactions || [];
          const existingReactionIndex = reactions.findIndex(
            (r) => r.emoji === emoji && r.userId === currentUserId
          );

          const hasReaction = existingReactionIndex >= 0;
          
          if (hasReaction) {
            // Remove reaction optimistically
            const updatedReactions = reactions.filter(
              (_: unknown, idx: number) => idx !== existingReactionIndex
            );
            return {
              ...comment,
              reactions: updatedReactions,
            };
          } else {
            // Add reaction optimistically with proper user data
            const newReaction = {
              id: `temp-${Date.now()}`,
              emoji,
              userId: currentUserId || "",
              user: currentUser || (currentUserId ? {
                id: currentUserId,
                email: "",
                name: undefined,
                avatarUrl: undefined,
              } : undefined),
            };
            return {
              ...comment,
              reactions: [...reactions, newReaction],
            };
          }
        });
      });

      // Return context with snapshot for rollback
      return { previousComments };
    },
    onError: (error: Error, emoji: string, context) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", boardId], context.previousComments);
      }
      toast.error(error.message);
      setLoadingEmoji(null);
    },
    onSuccess: () => {
      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["comments", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setLoadingEmoji(null);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["comments", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const handleEmojiSelect = (emoji: string) => {
    toggleReactionMutation.mutate(emoji);
  };

  const hasReactions = Object.keys(reactionsByEmoji).length > 0;
  const isPending = toggleReactionMutation.isPending;

  return (
    <div className="flex items-center gap-1">
      {hasReactions && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
            const hasUserReaction = emojiReactions.some(
              (r) => r.userId === currentUserId
            );
            const count = emojiReactions.length;

            const isLoading = isPending && loadingEmoji === emoji;

            return (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors",
                  "hover:bg-slate-100 dark:hover:bg-slate-700",
                  hasUserReaction &&
                    "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700",
                  isPending && "opacity-50 cursor-wait"
                )}
                title={`${count} reaction${count > 1 ? "s" : ""}`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500 dark:text-slate-400" />
                ) : (
                  <span className="text-base">{emoji}</span>
                )}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <EmojiPickerComponent
        onEmojiSelect={handleEmojiSelect}
        trigger={
          <button
            disabled={isPending}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              hasReactions && "opacity-70 hover:opacity-100",
              isPending && "opacity-50 cursor-wait"
            )}
            aria-label="Add reaction"
          >
            {isPending && !loadingEmoji ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400" />
            ) : (
              <Smile className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        }
      />
    </div>
  );
}

