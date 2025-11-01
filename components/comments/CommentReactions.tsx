"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmojiPickerComponent } from "./EmojiPicker";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEmojiSelect = (emoji: string) => {
    toggleReactionMutation.mutate(emoji);
  };

  const hasReactions = Object.keys(reactionsByEmoji).length > 0;

  return (
    <div className="flex items-center gap-1 mt-2">
      {hasReactions && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
            const hasUserReaction = emojiReactions.some(
              (r) => r.userId === currentUserId
            );
            const count = emojiReactions.length;

            return (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors",
                  "hover:bg-slate-100 dark:hover:bg-slate-700",
                  hasUserReaction &&
                    "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                )}
                title={`${count} reaction${count > 1 ? "s" : ""}`}
              >
                <span className="text-base">{emoji}</span>
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
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              hasReactions && "opacity-70 hover:opacity-100"
            )}
            aria-label="Add reaction"
          >
            <Smile className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        }
      />
    </div>
  );
}

