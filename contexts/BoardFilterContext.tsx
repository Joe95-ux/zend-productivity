"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface BoardFilters {
  searchQuery: string;
  selectedLabels: string[];
  selectedMembers: string[];
  membersFilter: "all" | "unassigned";
  dueDateFilter: "all" | "overdue" | "today" | "thisWeek" | "noDueDate";
  completedFilter: "all" | "completed" | "incomplete";
  hasAttachments: boolean | null;
  hasChecklists: boolean | null;
  activityFilter: "all" | "week" | "twoWeeks" | "fourWeeks" | "inactive";
}

interface BoardFilterContextType {
  filters: BoardFilters;
  updateFilters: (updates: Partial<BoardFilters>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: BoardFilters = {
  searchQuery: "",
  selectedLabels: [],
  selectedMembers: [],
  membersFilter: "all",
  dueDateFilter: "all",
  completedFilter: "all",
  hasAttachments: null,
  hasChecklists: null,
  activityFilter: "all",
};

const BoardFilterContext = createContext<BoardFilterContextType | undefined>(undefined);

export function BoardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<BoardFilters>(defaultFilters);

  const updateFilters = (updates: Partial<BoardFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.selectedLabels.length > 0 ||
    filters.selectedMembers.length > 0 ||
    filters.membersFilter !== "all" ||
    filters.dueDateFilter !== "all" ||
    filters.completedFilter !== "all" ||
    filters.hasAttachments !== null ||
    filters.hasChecklists !== null ||
    filters.activityFilter !== "all";

  return (
    <BoardFilterContext.Provider
      value={{
        filters,
        updateFilters,
        clearFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </BoardFilterContext.Provider>
  );
}

export function useBoardFilters() {
  const context = useContext(BoardFilterContext);
  if (!context) {
    throw new Error("useBoardFilters must be used within BoardFilterProvider");
  }
  return context;
}

