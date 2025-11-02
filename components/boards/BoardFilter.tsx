"use client";

import { useState } from "react";
import { Filter, X, Calendar, Clock, AlertCircle, Users, Tag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverHint } from "@/components/HoverHint";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { useBoardFilters } from "@/contexts/BoardFilterContext";
import { cn } from "@/lib/utils";
import { Label, User as UserType } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface BoardFilterProps {
  labels: Label[];
  members: UserType[];
}

export function BoardFilter({ labels, members }: BoardFilterProps) {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useBoardFilters();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Deduplicate labels by id
  const uniqueLabels = labels.filter((label, index, self) => 
    index === self.findIndex((l) => l.id === label.id)
  );

  // Deduplicate members by id
  const uniqueMembers = members.filter((member, index, self) => 
    index === self.findIndex((m) => m.id === member.id)
  );

  const toggleLabel = (labelId: string) => {
    const newLabels = filters.selectedLabels.includes(labelId)
      ? filters.selectedLabels.filter((id) => id !== labelId)
      : [...filters.selectedLabels, labelId];
    updateFilters({ selectedLabels: newLabels });
  };

  const toggleMember = (memberId: string) => {
    const newMembers = filters.selectedMembers.includes(memberId)
      ? filters.selectedMembers.filter((id) => id !== memberId)
      : [...filters.selectedMembers, memberId];
    updateFilters({ selectedMembers: newMembers });
  };

  const handleClearAll = () => {
    clearFilters();
  };

  const activeFilterCount =
    (filters.searchQuery ? 1 : 0) +
    filters.selectedLabels.length +
    filters.selectedMembers.length +
    (filters.membersFilter !== "all" ? 1 : 0) +
    (filters.dueDateFilter !== "all" ? 1 : 0) +
    (filters.completedFilter !== "all" ? 1 : 0) +
    (filters.hasAttachments !== null ? 1 : 0) +
    (filters.hasChecklists !== null ? 1 : 0) +
    (filters.activityFilter !== "all" ? 1 : 0);

  const dateOptions = [
    { value: "all", label: "All dates", icon: null, color: null },
    { value: "overdue", label: "Overdue", icon: AlertCircle, color: "text-red-500" },
    { value: "today", label: "Due today", icon: Clock, color: "text-blue-500" },
    { value: "thisWeek", label: "Due this week", icon: Calendar, color: "text-yellow-500" },
    { value: "noDueDate", label: "No due date", icon: Calendar, color: "text-slate-400" },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "cursor-pointer transition-all duration-300 ease-out hover:scale-105 relative",
            hasActiveFilters && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          )}
        >
          <HoverHint label="Filter cards" side="bottom">
            <Filter className="h-4 w-4" />
          </HoverHint>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end" 
        sideOffset={isMobile ? -14 : 4} 
        alignOffset={-40}
        className="w-full sm:w-95 p-0 overflow-hidden dark:bg-[#0D1117]"
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#0D1117] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filter Cards</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-155 max-h-[calc(100vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Search cards
              </label>
              <Input
                placeholder="Search by title or description..."
                value={filters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Members */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Members
              </label>
              <div className="space-y-1">
                {/* Filter options */}
                <div className="space-y-1 mb-2">
                  {[
                    { value: "all", label: "All cards" },
                    { value: "assigned", label: "Assigned" },
                    { value: "unassigned", label: "No members", icon: UserRound },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                      onClick={() =>
                        updateFilters({
                          membersFilter: option.value as "all" | "assigned" | "unassigned",
                        })
                      }
                    >
                      <input
                        type="radio"
                        name="members"
                        checked={filters.membersFilter === option.value}
                        onChange={() =>
                          updateFilters({
                            membersFilter: option.value as "all" | "assigned" | "unassigned",
                          })
                        }
                        className="w-4 h-4 cursor-pointer"
                        style={{ 
                          appearance: 'none', 
                          WebkitAppearance: 'none', 
                          borderRadius: '2px',
                          border: '2px solid rgb(148 163 184)',
                          backgroundColor: filters.membersFilter === option.value ? 'rgb(59 130 246)' : 'transparent',
                        }}
                      />
                      {option.icon && (
                        <option.icon className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                      )}
                      <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                        {option.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Member list (only show if filtering by specific members) */}
                {filters.membersFilter === "all" && uniqueMembers.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      {uniqueMembers.map((member) => {
                        const isSelected = filters.selectedMembers.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                            onClick={() => toggleMember(member.id)}
                          >
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleMember(member.id)}
                              className="rounded-sm"
                            />
                            <ConditionalUserProfile user={member} size="sm" />
                            <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                              {member.name || member.email}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {uniqueMembers.length === 0 && filters.membersFilter === "all" && (
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">No members available</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Due Date
              </label>
              <div className="space-y-1">
                {dateOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                      onClick={() =>
                        updateFilters({
                          dueDateFilter: option.value as "all" | "overdue" | "today" | "thisWeek" | "noDueDate",
                        })
                      }
                    >
                      <input
                        type="radio"
                        name="dueDate"
                        checked={filters.dueDateFilter === option.value}
                        onChange={() =>
                          updateFilters({
                            dueDateFilter: option.value as "all" | "overdue" | "today" | "thisWeek" | "noDueDate",
                          })
                        }
                        className="w-4 h-4 cursor-pointer"
                        style={{ 
                          appearance: 'none', 
                          WebkitAppearance: 'none', 
                          borderRadius: '2px',
                          border: '2px solid rgb(148 163 184)',
                          backgroundColor: filters.dueDateFilter === option.value ? 'rgb(59 130 246)' : 'transparent',
                        }}
                      />
                      {Icon && (
                        <Icon className={cn("w-4 h-4 flex-shrink-0", option.color)} />
                      )}
                      <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                        {option.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Labels */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Labels
              </label>
              <div className="space-y-1">
                {uniqueLabels.length === 0 ? (
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">No labels</span>
                  </div>
                ) : (
                  uniqueLabels.map((label) => {
                    const isSelected = filters.selectedLabels.includes(label.id);
                    return (
                      <div
                        key={label.id}
                        className={cn(
                          "w-full px-3 py-2 rounded-sm cursor-pointer transition-all",
                          isSelected && "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1"
                        )}
                        style={{ 
                          backgroundColor: label.color,
                          color: 'white',
                        }}
                        onClick={() => toggleLabel(label.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => toggleLabel(label.id)}
                            className="rounded-sm border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                          />
                          <span className="text-sm font-medium flex-1 text-left">
                            {label.name}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            {/* Activity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Activity
              </label>
              <div className="space-y-1">
                {[
                  { value: "all", label: "All cards" },
                  { value: "week", label: "Active in the last week" },
                  { value: "twoWeeks", label: "Active in the last two weeks" },
                  { value: "fourWeeks", label: "Active in the last four weeks" },
                  { value: "inactive", label: "Without activity in the last four weeks" },
                ].map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                    onClick={() =>
                      updateFilters({
                        activityFilter: option.value as "all" | "week" | "twoWeeks" | "fourWeeks" | "inactive",
                      })
                    }
                  >
                    <input
                      type="radio"
                      name="activity"
                      checked={filters.activityFilter === option.value}
                      onChange={() =>
                        updateFilters({
                          activityFilter: option.value as "all" | "week" | "twoWeeks" | "fourWeeks" | "inactive",
                        })
                      }
                      className="w-4 h-4 cursor-pointer"
                      style={{ 
                        appearance: 'none', 
                        WebkitAppearance: 'none', 
                        borderRadius: '2px',
                        border: '2px solid rgb(148 163 184)',
                        backgroundColor: filters.activityFilter === option.value ? 'rgb(59 130 246)' : 'transparent',
                      }}
                    />
                    <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <div className="space-y-1">
                {[
                  { value: "all", label: "All cards" },
                  { value: "completed", label: "Completed" },
                  { value: "incomplete", label: "Not completed" },
                ].map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                    onClick={() =>
                      updateFilters({
                        completedFilter: option.value as "all" | "completed" | "incomplete",
                      })
                    }
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={filters.completedFilter === option.value}
                      onChange={() =>
                        updateFilters({
                          completedFilter: option.value as "all" | "completed" | "incomplete",
                        })
                      }
                      className="w-4 h-4 cursor-pointer"
                      style={{ 
                        appearance: 'none', 
                        WebkitAppearance: 'none', 
                        borderRadius: '2px',
                        border: '2px solid rgb(148 163 184)',
                        backgroundColor: filters.completedFilter === option.value ? 'rgb(59 130 246)' : 'transparent',
                      }}
                    />
                    <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Additional Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Show cards with</label>
              <div className="space-y-1">
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                  onClick={() =>
                    updateFilters({
                      hasAttachments: filters.hasAttachments === true ? null : true,
                    })
                  }
                >
                  <Checkbox
                    checked={filters.hasAttachments === true}
                    onCheckedChange={(checked) =>
                      updateFilters({ hasAttachments: checked ? true : null })
                    }
                    className="rounded-sm"
                  />
                  <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                    Attachments
                  </span>
                </div>
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                  onClick={() =>
                    updateFilters({
                      hasChecklists: filters.hasChecklists === true ? null : true,
                    })
                  }
                >
                  <Checkbox
                    checked={filters.hasChecklists === true}
                    onCheckedChange={(checked) =>
                      updateFilters({ hasChecklists: checked ? true : null })
                    }
                    className="rounded-sm"
                  />
                  <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                    Checklists
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
