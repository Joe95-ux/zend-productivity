"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardFilterProvider } from "@/contexts/BoardFilterContext";

export function BoardHeaderWrapper() {
  const pathname = usePathname();
  
  // Check if we're on a board page
  const isBoardPage = pathname.startsWith("/dashboard/boards/") && pathname.split('/').length === 4;
  const boardId = pathname.split('/').pop();

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!boardId && isBoardPage,
  });
  
  if (!isBoardPage) return null;

  if (isLoading || !board) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="w-full px-[18px] lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-1 min-[320px]:gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-1 min-[320px]:gap-2">
              <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse hidden lg:block" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse hidden lg:block" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse hidden lg:block" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BoardFilterProvider>
      <BoardHeader 
        boardId={boardId || ""} 
        boardTitle={board.title || "Board Title"} 
        boardDescription={board.description || "Board Description"}
        membersCount={board.members ? board.members.length + 1 : 1}
      />
    </BoardFilterProvider>
  );
}
