"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmojiPickerComponent } from "./EmojiPicker";
import { Smile, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CommentItemData } from "./CommentItem";
import { Board, Card, List, Comment } from "@/lib/types";

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

interface MutationContext {
  previousComments: CommentItemData[] | undefined;
  previousBoard: Board | undefined;
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

      // Snapshot the previous values
      const previousComments = queryClient.getQueryData<CommentItemData[]>(["comments", boardId]);
      const previousBoard = queryClient.getQueryData<Board>(["board", boardId]);
      
      // Get current user data from comments query if available
      const comments = previousComments;
      const currentUser = comments?.find((c: CommentItemData) => c.user?.id === currentUserId)?.user || null;

      // Helper function to update a comment's reactions
      const updateCommentReactions = (comment: CommentItemData): CommentItemData => {
        if (comment.id !== commentId) return comment;
        
        const reactions = comment.reactions || [];
        const existingReactionIndex = reactions.findIndex(
          (r) => r.emoji === emoji && r.userId === currentUserId
        );

        const hasReaction = existingReactionIndex >= 0;
        
        // Type for reaction in CommentItemData
        type ReactionItem = NonNullable<CommentItemData["reactions"]>[number];
        
        if (hasReaction) {
          // Remove reaction optimistically
          const updatedReactions = reactions.filter(
            (_reaction: ReactionItem, idx: number) => idx !== existingReactionIndex
          );
          return {
            ...comment,
            reactions: updatedReactions.length > 0 ? updatedReactions : undefined,
          };
        } else {
          // Add reaction optimistically with proper user data
          type ReactionType = NonNullable<CommentItemData["reactions"]>[number];
          const newReaction: ReactionType = {
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
      };

      // Optimistically update comments query (for activity dropdown)
      queryClient.setQueryData<CommentItemData[]>(["comments", boardId], (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map(updateCommentReactions);
      });

      // Optimistically update board query (for card modal)
      queryClient.setQueryData<Board>(["board", boardId], (old: Board | undefined) => {
        if (!old || !old.lists) return old;
        
        return {
          ...old,
          lists: old.lists.map((list: List) => {
            if (!list.cards) return list;
            
            return {
              ...list,
              cards: list.cards.map((card: Card) => {
                if (!card.comments) return card;
                
                return {
                  ...card,
                  comments: card.comments.map((comment: Comment) => {
                    // Convert Comment to CommentItemData format for update function
                    const commentItemData: CommentItemData = {
                      id: comment.id,
                      content: comment.content,
                      createdAt: comment.createdAt,
                      user: comment.user,
                      reactions: comment.reactions?.map((r) => ({
                        id: r.id,
                        emoji: r.emoji,
                        userId: r.userId,
                        user: r.user,
                      })),
                    };
                    const updated = updateCommentReactions(commentItemData);
                    // Convert back to Comment format
                    return {
                      ...comment,
                      reactions: updated.reactions,
                    } as Comment;
                  }),
                };
              }),
            };
          }),
        };
      });

      // Return context with snapshots for rollback
      return { previousComments, previousBoard } as MutationContext;
    },
    onError: (error: Error, emoji: string, context: MutationContext | undefined) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", boardId], context.previousComments);
      }
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmojiSelect(emoji);
                }}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors cursor-pointer",
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
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer",
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

