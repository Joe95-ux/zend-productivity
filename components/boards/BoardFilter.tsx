"use client";

import { useState, useRef, useEffect } from "react";
import { ListFilter, X, Calendar, Clock, AlertCircle, Users, Tag, UserRound, ChevronDown } from "lucide-react";
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
  const [isLabelsDropdownOpen, setIsLabelsDropdownOpen] = useState(false);
  const [labelsSearchQuery, setLabelsSearchQuery] = useState("");
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);
  const labelBandRef = useRef<HTMLDivElement>(null);
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

  const selectAllLabels = () => {
    const allLabelIds = uniqueLabels.map((label) => label.id);
    updateFilters({ selectedLabels: allLabelIds });
  };

  const deselectAllLabels = () => {
    updateFilters({ selectedLabels: [] });
  };

  const allLabelsSelected = uniqueLabels.length > 0 && filters.selectedLabels.length === uniqueLabels.length;
  
  // Split labels into visible (first 3) and collapsed (rest)
  const visibleLabels = uniqueLabels.slice(0, 3);
  const collapsedLabels = uniqueLabels.slice(3);
  
  // Filter collapsed labels by search query
  const filteredCollapsedLabels = labelsSearchQuery
    ? collapsedLabels.filter((label) =>
        label.name.toLowerCase().includes(labelsSearchQuery.toLowerCase())
      )
    : collapsedLabels;

  // Calculate dropdown width to match label bands
  useEffect(() => {
    if (labelBandRef.current) {
      const width = labelBandRef.current.offsetWidth;
      setDropdownWidth(width);
    }
  }, [visibleLabels.length]);

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
    (filters.noLabels ? 1 : 0) +
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
            <ListFilter className="h-4 w-4" />
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
        alignOffset={isMobile ? -60 : -70}
        className="w-full rounded-md sm:w-90 p-0 overflow-hidden dark:bg-[#0D1117]"
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#0D1117] px-4 py-4">
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
        <ScrollArea className="h-[calc(100vh-12rem)] max-h-[calc(100vh-10rem)]">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="flex flex-col gap-2">
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
                {/* No members option */}
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                  onClick={() =>
                    updateFilters({
                      membersFilter: "unassigned",
                    })
                  }
                >
                  <Checkbox
                    checked={filters.membersFilter === "unassigned"}
                    onCheckedChange={(checked) => {
                      updateFilters({
                        membersFilter: checked ? "unassigned" : "all",
                      });
                    }}
                    className="rounded-sm"
                  />
                  <UserRound className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                    No members
                  </span>
                </div>

                {/* Member list */}
                {uniqueMembers.length > 0 && (
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
                )}

                {uniqueMembers.length === 0 && (
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
                      <Checkbox
                        checked={filters.dueDateFilter === option.value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({
                              dueDateFilter: option.value as "all" | "overdue" | "today" | "thisWeek" | "noDueDate",
                            });
                          }
                        }}
                        className="rounded-sm"
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
                {/* No labels option */}
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer"
                  onClick={() =>
                    updateFilters({
                      noLabels: !filters.noLabels,
                    })
                  }
                >
                  <Checkbox
                    checked={filters.noLabels}
                    onCheckedChange={(checked) =>
                      updateFilters({
                        noLabels: checked === true,
                      })
                    }
                    className="rounded-sm"
                  />
                  <Tag className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">No labels</span>
                </div>

                {/* Label list */}
                {uniqueLabels.length > 0 && (
                  <div className="space-y-1 mt-1">
                      {/* Visible labels (first 3) */}
                      {visibleLabels.map((label, index) => {
                        const isSelected = filters.selectedLabels.includes(label.id);
                        return (
                          <div
                            key={label.id}
                            ref={index === 0 ? labelBandRef : undefined}
                            className="flex items-center gap-3"
                          >
                            <div
                              className="flex items-center cursor-pointer"
                              onClick={() => toggleLabel(label.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleLabel(label.id)}
                                className="rounded-sm"
                              />
                            </div>
                            <div
                              className={cn(
                                "flex-1 px-3 py-2 rounded-sm cursor-pointer transition-all",
                                isSelected && "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1"
                              )}
                              style={{ 
                                backgroundColor: label.color,
                                color: 'white',
                              }}
                              onClick={() => toggleLabel(label.id)}
                            >
                              <span className="text-sm font-medium text-left">
                                {label.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Select labels dropdown (if more than 3 labels) */}
                      {collapsedLabels.length > 0 && (
                        <DropdownMenu open={isLabelsDropdownOpen} onOpenChange={(open) => {
                          setIsLabelsDropdownOpen(open);
                          if (!open) {
                            setLabelsSearchQuery("");
                          }
                        }}>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (allLabelsSelected) {
                                    deselectAllLabels();
                                  } else {
                                    selectAllLabels();
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={allLabelsSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      selectAllLabels();
                                    } else {
                                      deselectAllLabels();
                                    }
                                  }}
                                  className="rounded-sm"
                                />
                              </div>
                              {isLabelsDropdownOpen ? (
                                <Input
                                  placeholder="Search labels..."
                                  value={labelsSearchQuery}
                                  onChange={(e) => setLabelsSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="flex-1 h-9"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className={cn(
                                    "flex-1 flex items-center justify-between px-3 py-2 rounded-sm cursor-pointer transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                                  )}
                                  onClick={() => setIsLabelsDropdownOpen(true)}
                                >
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Select labels
                                  </span>
                                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                </div>
                              )}
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={4}
                            className="p-0 overflow-hidden dark:bg-[#0D1117]"
                            style={{ width: dropdownWidth ? `${dropdownWidth}px` : undefined }}
                          >
                            <ScrollArea className="h-64 max-h-64">
                              <div className="p-2 space-y-1">
                                {filteredCollapsedLabels.map((label) => {
                                  const isSelected = filters.selectedLabels.includes(label.id);
                                  return (
                                    <div
                                      key={label.id}
                                      className="flex items-center gap-3"
                                    >
                                      <div
                                        className="flex items-center cursor-pointer"
                                        onClick={() => toggleLabel(label.id)}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleLabel(label.id)}
                                          className="rounded-sm"
                                        />
                                      </div>
                                      <div
                                        className={cn(
                                          "flex-1 px-3 py-2 rounded-sm cursor-pointer transition-all relative",
                                          isSelected && "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1"
                                        )}
                                        style={{ 
                                          backgroundColor: label.color,
                                          color: 'white',
                                        }}
                                        onClick={() => toggleLabel(label.id)}
                                      >
                                        <span className="text-sm font-medium text-left">
                                          {label.name}
                                        </span>
                                        {isSelected && (
                                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-sm" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {filteredCollapsedLabels.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                                    No labels found
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
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
                        activityFilter: option.value as "week" | "twoWeeks" | "fourWeeks" | "inactive",
                      })
                    }
                  >
                    <Checkbox
                      checked={filters.activityFilter === option.value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({
                            activityFilter: option.value as "week" | "twoWeeks" | "fourWeeks" | "inactive",
                          });
                        }
                      }}
                      className="rounded-sm"
                    />
                    <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Card Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Card status
              </label>
              <div className="space-y-1">
                {[
                  { value: "completed", label: "Marked as complete" },
                  { value: "incomplete", label: "Not marked as complete" },
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
                    <Checkbox
                      checked={filters.completedFilter === option.value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({
                            completedFilter: option.value as "all" | "completed" | "incomplete",
                          });
                        } else {
                          updateFilters({
                            completedFilter: "all",
                          });
                        }
                      }}
                      className="rounded-sm"
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
