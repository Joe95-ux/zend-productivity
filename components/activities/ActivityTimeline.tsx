"use client";

import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from "date-fns";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { cn } from "@/lib/utils";
import {
  Edit,
  Plus,
  Trash2,
  Move,
  FileText,
  SquareCheckBig,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  Paperclip,
  Calendar,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { User } from "@/lib/types";

export interface Activity {
  id: string;
  type?: string;
  message: string;
  user: User;
  createdAt: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
  showDetails?: boolean;
  onShowMore?: () => void;
  className?: string;
}

// Map activity types to icons and colors
const getActivityIcon = (type?: string) => {
  if (!type) return <Clock className="w-4 h-4" />;
  
  const iconClass = "w-4 h-4";
  
  if (type.includes("renamed") || type.includes("updated")) {
    return <Edit className={iconClass} />;
  }
  if (type.includes("added") || type.includes("created")) {
    return <Plus className={iconClass} />;
  }
  if (type.includes("removed") || type.includes("deleted")) {
    return <Trash2 className={iconClass} />;
  }
  if (type.includes("moved")) {
    return <Move className={iconClass} />;
  }
  if (type.includes("description")) {
    return <FileText className={iconClass} />;
  }
  if (type.includes("checklist")) {
    return <SquareCheckBig className={iconClass} />;
  }
  if (type.includes("comment")) {
    return <MessageSquare className={iconClass} />;
  }
  if (type.includes("completed")) {
    return <CheckCircle2 className={iconClass} />;
  }
  if (type.includes("uncompleted") || type.includes("incomplete")) {
    return <XCircle className={iconClass} />;
  }
  if (type.includes("label")) {
    return <Tag className={iconClass} />;
  }
  if (type.includes("attachment")) {
    return <Paperclip className={iconClass} />;
  }
  if (type.includes("due_date") || type.includes("dueDate")) {
    return <Calendar className={iconClass} />;
  }
  if (type.includes("member") || type.includes("assigned")) {
    return <UserPlus className={iconClass} />;
  }
  if (type.includes("unassigned")) {
    return <UserMinus className={iconClass} />;
  }
  
  return <Clock className={iconClass} />;
};

const getActivityColor = (type?: string): string => {
  if (!type) {
    return "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-400";
  }
  
  if (type.includes("added") || type.includes("created") || type.includes("completed")) {
    return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400";
  }
  if (type.includes("removed") || type.includes("deleted") || type.includes("uncompleted")) {
    return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400";
  }
  if (type.includes("updated") || type.includes("renamed") || type.includes("moved")) {
    return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400";
  }
  
  return "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-400";
};

// Group activities by date
const groupActivitiesByDate = (activities: Activity[]) => {
  const groups: Record<string, Activity[]> = {};
  
  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
    let key: string;
    
    if (isToday(date)) {
      key = "Today";
    } else if (isYesterday(date)) {
      key = "Yesterday";
    } else {
      key = format(date, "MMMM d, yyyy");
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  });
  
  return groups;
};

const formatActivityTime = (dateString: string): string => {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export function ActivityTimeline({
  activities,
  isLoading = false,
  showDetails = true,
  onShowMore,
  className,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-300">
          <Clock className="w-4 h-4" />
          Recent Activity
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Loading activities...
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-300">
          <Clock className="w-4 h-4" />
          Recent Activity
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          No recent activity
        </div>
      </div>
    );
  }

  // Limit activities based on showDetails
  const displayedActivities = showDetails ? activities : activities.slice(0, 1);
  const hasMoreActivities = !showDetails && activities.length > 1;

  // Group by date
  const groupedActivities = groupActivitiesByDate(displayedActivities);
  const dateKeys = Object.keys(groupedActivities);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-300">
        <Clock className="w-4 h-4" />
        Recent Activity
      </div>
      
      <div className="space-y-6">
        {dateKeys.map((dateKey, dateIndex) => (
          <div key={dateKey} className="space-y-4">
            {/* Date Header */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wide">
                {dateKey}
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Timeline Items */}
            <div className="relative">
              {groupedActivities[dateKey].map((activity, activityIndex) => {
                const isLast = 
                  dateIndex === dateKeys.length - 1 && 
                  activityIndex === groupedActivities[dateKey].length - 1 &&
                  !hasMoreActivities;
                
                const icon = getActivityIcon(activity.type || "");
                const colorClass = getActivityColor(activity.type || "");
                const timeText = formatActivityTime(activity.createdAt);

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "relative flex gap-3 sm:gap-4",
                      !isLast && "pb-4"
                    )}
                  >
                    {/* Timeline Line */}
                    {!isLast && (
                      <div className="absolute left-[11px] sm:left-[15px] top-6 sm:top-7 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    )}
                    
                    {/* Timeline Dot */}
                    <div className="relative flex-shrink-0 z-10">
                      <div
                        className={cn(
                          "w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center transition-all duration-200 hover:scale-110",
                          colorClass
                        )}
                      >
                        {icon}
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0 pt-0.5 pb-2 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                            <ConditionalUserProfile
                              user={activity.user}
                              size="sm"
                            />
                          </div>
                          <p className="text-sm text-slate-900 dark:text-slate-300 leading-relaxed break-words">
                            <span className="font-medium">
                              {activity.user.name || activity.user.email}
                            </span>{" "}
                            <span className="text-slate-600 dark:text-slate-400">
                              {activity.message}
                            </span>
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap sm:ml-2">
                            {timeText}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {hasMoreActivities && (
        <div className="text-center pt-2">
          <button
            onClick={onShowMore}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors underline-offset-4 hover:underline"
          >
            Show {activities.length - 1} more activit{activities.length - 1 === 1 ? "y" : "ies"}
          </button>
        </div>
      )}
    </div>
  );
}
