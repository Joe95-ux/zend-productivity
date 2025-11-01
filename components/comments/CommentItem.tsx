"use client";

import { format } from "date-fns";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { CommentContent } from "@/components/cards/CommentContent";
import { CommentReactions } from "./CommentReactions";
import { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CommentItemData {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    user?: User;
  }>;
}

interface CommentItemProps {
  comment: CommentItemData;
  currentUserId?: string;
  boardId: string;
  isEditing?: boolean;
  editingContent?: string;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  isSaving?: boolean;
  showCardInfo?: boolean;
  cardTitle?: string;
  listTitle?: string;
  className?: string;
}

export function CommentItem({
  comment,
  currentUserId,
  boardId,
  isEditing = false,
  editingContent,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
  isSaving = false,
  showCardInfo = false,
  cardTitle,
  listTitle,
  className,
}: CommentItemProps) {
  const isOwner = currentUserId === comment.user.id;
  const formattedDate = format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a");

  return (
    <div
      className={cn(
        "flex gap-3 p-3 items-start rounded-lg",
        "bg-slate-50 dark:bg-slate-800/50",
        "ring-1 ring-slate-200 dark:ring-slate-700",
        className
      )}
    >
      <ConditionalUserProfile user={comment.user} size="md" />
      <div className="flex-1 min-w-0">
        {/* Header: Author, Date, and Card Info (if applicable) */}
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900 dark:text-white">
              {comment.user.name || comment.user.email}
            </span>
            {showCardInfo && cardTitle && (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400">on</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {cardTitle}
                </span>
                {listTitle && (
                  <>
                    <span className="text-xs text-slate-500 dark:text-slate-400">in</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {listTitle}
                    </span>
                  </>
                )}
              </>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Content */}
        {isEditing && editingContent !== undefined ? (
          <div className="space-y-2">
            <div className="text-sm text-slate-900 dark:text-slate-300">
              {editingContent}
            </div>
            {onCancelEdit && onSaveEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={isSaving}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <span className="text-xs text-slate-400">•</span>
                <button
                  onClick={onCancelEdit}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <CommentContent content={comment.content} className="mb-2" />
            
            {/* Actions and Reactions Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <CommentReactions
                commentId={comment.id}
                reactions={comment.reactions || []}
                currentUserId={currentUserId}
                boardId={boardId}
              />
              
              {/* Edit and Delete Actions (only show for owner) */}
              {isOwner && (
                <>
                  {onEdit && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(comment.id, comment.content)}
                        className="h-auto p-0 text-xs text-slate-600 dark:text-slate-400 hover:underline hover:bg-transparent dark:hover:bg-transparent"
                      >
                        Edit
                      </Button>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(comment.id)}
                        className="h-auto p-0 text-xs text-red-600 dark:text-red-400 hover:underline hover:bg-transparent dark:hover:bg-transparent"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

