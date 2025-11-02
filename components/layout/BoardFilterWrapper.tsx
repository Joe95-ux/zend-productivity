"use client";

import { usePathname } from "next/navigation";
import { BoardFilterProvider } from "@/contexts/BoardFilterContext";

export function BoardFilterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if we're on a board page
  const isBoardPage = pathname.startsWith("/dashboard/boards/");
  
  if (!isBoardPage) {
    return <>{children}</>;
  }
  
  return (
    <BoardFilterProvider>
      {children}
    </BoardFilterProvider>
  );
}

