"use client";

import { Clock, TextQuote, MessagesSquare, Paperclip, Eye, CheckSquare, Tag, MoreVertical } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HoverHint } from "@/components/HoverHint";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CardIndicatorsProps {
  card: Card;
  isWatching?: boolean;
}

export function CardIndicators({ card, isWatching = false }: CardIndicatorsProps) {
  const hasDescription = card.description && card.description.trim().length > 0;
  const hasComments = card.comments && card.comments.length > 0;
  const hasAttachments = card.attachments && card.attachments.length > 0;
  const hasDueDate = card.dueDate;
  const hasAssignedTo = card.assignedTo;
  const hasChecklists = card.checklists && card.checklists.length > 0;
  const hasLabels = card.labels && card.labels.length > 0;

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

  // Create all indicators with their components
  const allIndicators = [
    // Watch indicator (always first if present)
    ...(isWatching ? [{
      id: 'watch',
      component: (
        <HoverHint key="watch" label="Watching this card" side="bottom">
          <Eye className="w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400" />
        </HoverHint>
      )
    }] : []),
    
    // Due Date
    ...(hasDueDate ? [{
      id: 'dueDate',
      component: (
        <HoverHint key="dueDate" label={
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
      )
    }] : []),

    // Description
    ...(hasDescription ? [{
      id: 'description',
      component: (
        <HoverHint key="description" label="Has description" side="bottom">
          <TextQuote className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
        </HoverHint>
      )
    }] : []),

    // Comments
    ...(hasComments ? [{
      id: 'comments',
      component: (
        <HoverHint key="comments" label={`${card.comments.length} comment${card.comments.length > 1 ? 's' : ''}`} side="bottom">
          <div className="flex items-center gap-1">
            <MessagesSquare className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
            <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
              {card.comments.length}
            </span>
          </div>
        </HoverHint>
      )
    }] : []),

    // Checklists
    ...(hasChecklists ? [{
      id: 'checklists',
      component: (
        <HoverHint key="checklists" label="Has checklists" side="bottom">
          <div className="flex items-center gap-1">
            <CheckSquare className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
            <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
              {card.checklists?.length || 0}
            </span>
          </div>
        </HoverHint>
      )
    }] : []),

    // Labels
    ...(hasLabels ? [{
      id: 'labels',
      component: (
        <HoverHint key="labels" label={`${card.labels.length} label${card.labels.length > 1 ? 's' : ''}`} side="bottom">
          <div className="flex items-center gap-1">
            <Tag className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
            <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
              {card.labels.length}
            </span>
          </div>
        </HoverHint>
      )
    }] : []),

    // Attachments
    ...(hasAttachments ? [{
      id: 'attachments',
      component: (
        <HoverHint key="attachments" label={`${card.attachments.length} attachment${card.attachments.length > 1 ? 's' : ''}`} side="bottom">
          <div className="flex items-center gap-1">
            <Paperclip className="w-4 h-4 cursor-pointer text-slate-900 dark:text-slate-300" />
            <span className="text-xs font-medium text-slate-900 dark:text-slate-300">
              {card.attachments.length}
            </span>
          </div>
        </HoverHint>
      )
    }] : [])
  ];

  // Always include watch and members in the first 5, then add others
  const priorityIndicators = allIndicators.filter(ind => ind.id === 'watch' || ind.id === 'dueDate');
  const otherIndicators = allIndicators.filter(ind => ind.id !== 'watch' && ind.id !== 'dueDate');
  
  // Take up to 3 more indicators to reach 5 total (excluding members)
  const visibleIndicators = [
    ...priorityIndicators,
    ...otherIndicators.slice(0, 5 - priorityIndicators.length)
  ];
  
  const hiddenIndicators = otherIndicators.slice(5 - priorityIndicators.length);

  return (
    <div className="flex items-center justify-between px-3 pb-2">
      {/* Left side indicators */}
      <div className="flex items-center gap-3">
        {/* Visible indicators */}
        {visibleIndicators.map(indicator => indicator.component)}
        
        {/* More indicators dropdown */}
        {hiddenIndicators.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <HoverHint label="More" side="bottom">
                <MoreVertical className="w-4 h-4 cursor-pointer text-slate-500 dark:text-slate-400" />
              </HoverHint>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="p-2 space-y-2">
                {hiddenIndicators.map(indicator => (
                  <div key={indicator.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm">
                    {indicator.component}
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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

