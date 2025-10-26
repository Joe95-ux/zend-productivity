"use client";

import { Clock, TextQuote, MessagesSquare, Paperclip, Eye, CheckSquare } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HoverHint } from "@/components/HoverHint";

interface CardIndicatorsProps {
  card: Card;
  isWatching?: boolean;
}

export function CardIndicators({ card, isWatching = false }: CardIndicatorsProps) {
  const hasDescription = card.description && card.description.trim().length > 0;
  const hasComments = card.comments && card.comments.length > 0;
  const hasAttachments = false; // TODO: Add attachments field to Card type
  const hasDueDate = card.dueDate;
  const hasAssignedTo = card.assignedTo;
  const hasChecklists = card.checklists && card.checklists.length > 0;

  // Format due date
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Check if due date is overdue
  const isOverdue = hasDueDate && new Date(card.dueDate!) < new Date();
  
  // Check if due date is due soon (within 24 hours)
  const isDueSoon = hasDueDate && !isOverdue && (() => {
    const timeDiff = new Date(card.dueDate!).getTime() - new Date().getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff <= 24;
  })();

  return (
    <div className="flex items-center justify-between px-3 pb-2">
      {/* Left side indicators */}
      <div className="flex items-center gap-3">
        {/* Due Date */}
        {hasDueDate && (
          <HoverHint label={
            isOverdue ? "Overdue" : 
            isDueSoon ? "Due soon" : 
            "Due date"
          } side="bottom">
            <div className="flex items-center gap-1">
              <Clock className={cn(
                "w-4 h-4 cursor-pointer",
                isOverdue 
                  ? "text-red-600 dark:text-red-400" 
                  : isDueSoon
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-900 dark:text-slate-300"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isOverdue 
                  ? "text-red-600 dark:text-red-400" 
                  : isDueSoon
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-900 dark:text-slate-300"
              )}>
                {formatDueDate(card.dueDate!)}
              </span>
            </div>
          </HoverHint>
        )}

        {/* Description */}
        {hasDescription && (
          <HoverHint label="Has description" side="bottom">
            <TextQuote className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
          </HoverHint>
        )}

        {/* Comments */}
        {hasComments && (
          <HoverHint label={`${card.comments.length} comment${card.comments.length > 1 ? 's' : ''}`} side="bottom">
            <div className="flex items-center gap-1">
              <MessagesSquare className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
              <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
                {card.comments.length}
              </span>
            </div>
          </HoverHint>
        )}

        {/* Checklists */}
        {hasChecklists && (
          <HoverHint label="Has checklists" side="bottom">
            <div className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
              <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
                {card.checklists?.length || 0}
              </span>
            </div>
          </HoverHint>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <HoverHint label="Has attachments" side="bottom">
            <div className="flex items-center gap-1">
              <Paperclip className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
              <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
                0
              </span>
            </div>
          </HoverHint>
        )}

        {/* Watch indicator */}
        {isWatching && (
          <HoverHint label="Watching this card" side="bottom">
            <Eye className="w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400" />
          </HoverHint>
        )}
      </div>

      {/* Right side - Members */}
      <div className="flex items-center gap-1">
        {hasAssignedTo && (
          <HoverHint label="Assigned member" side="bottom">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-6 h-6"
                }
              }}
            />
          </HoverHint>
        )}
      </div>
    </div>
  );
}

