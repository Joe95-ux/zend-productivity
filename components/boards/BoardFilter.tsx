"use client";

import { useState } from "react";
import { Filter, Search, Tag, User, Calendar, CheckCircle2, XCircle, Paperclip, SquareCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverHint } from "@/components/HoverHint";
import { useBoardFilters } from "@/contexts/BoardFilterContext";
import { cn } from "@/lib/utils";
import { Label, User as UserType } from "@/lib/types";

interface BoardFilterProps {
  labels: Label[];
  members: UserType[];
}

export function BoardFilter({ labels, members }: BoardFilterProps) {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useBoardFilters();
  const [isOpen, setIsOpen] = useState(false);

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
    (filters.dueDateFilter !== "all" ? 1 : 0) +
    (filters.completedFilter !== "all" ? 1 : 0) +
    (filters.hasAttachments !== null ? 1 : 0) +
    (filters.hasChecklists !== null ? 1 : 0);

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
        sideOffset={4}
        className="w-80 p-0 max-h-[calc(100vh-8rem)] overflow-y-auto"
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Filter Cards</h3>
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
          </div>

          <Separator />

          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search cards
            </label>
            <Input
              placeholder="Search by title or description..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="h-9"
            />
          </div>

          <Separator />

          {/* Labels */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Labels
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uniqueLabels.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No labels available</p>
              ) : (
                uniqueLabels.map((label) => {
                  const isSelected = filters.selectedLabels.includes(label.id);
                  return (
                    <div
                      key={label.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => toggleLabel(label.id)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleLabel(label.id)} />
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                        {label.name}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Separator />

          {/* Members */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Members
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uniqueMembers.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No members available</p>
              ) : (
                uniqueMembers.map((member) => {
                  const isSelected = filters.selectedMembers.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => toggleMember(member.id)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleMember(member.id)} />
                      <span className="text-sm text-slate-900 dark:text-slate-300 flex-1">
                        {member.name || member.email}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Separator />

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </label>
            <div className="space-y-2">
              {[
                { value: "all", label: "All dates" },
                { value: "overdue", label: "Overdue" },
                { value: "today", label: "Due today" },
                { value: "thisWeek", label: "Due this week" },
                { value: "noDueDate", label: "No due date" },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() =>
                    updateFilters({
                      dueDateFilter: option.value as "all" | "overdue" | "today" | "thisWeek" | "noDueDate",
                    })
                  }
                >
                  <input
                    type="radio"
                    checked={filters.dueDateFilter === option.value}
                    onChange={() =>
                      updateFilters({
                        dueDateFilter: option.value as "all" | "overdue" | "today" | "thisWeek" | "noDueDate",
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-900 dark:text-slate-300">{option.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Completed Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Status
            </label>
            <div className="space-y-2">
              {[
                { value: "all", label: "All cards", icon: null },
                { value: "completed", label: "Completed", icon: CheckCircle2 },
                { value: "incomplete", label: "Not completed", icon: XCircle },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() =>
                      updateFilters({
                        completedFilter: option.value as "all" | "completed" | "incomplete",
                      })
                    }
                  >
                    <input
                      type="radio"
                      checked={filters.completedFilter === option.value}
                      onChange={() =>
                        updateFilters({
                          completedFilter: option.value as "all" | "completed" | "incomplete",
                        })
                      }
                      className="w-4 h-4"
                    />
                    {Icon && <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                    <span className="text-sm text-slate-900 dark:text-slate-300">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Additional Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Additional Filters</label>
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                />
                <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-900 dark:text-slate-300">Has attachments</span>
              </div>
              <div
                className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                />
                <SquareCheckBig className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-900 dark:text-slate-300">Has checklists</span>
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

