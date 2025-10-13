"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { usePathname } from "next/navigation";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { useQuery } from "@tanstack/react-query";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const boardId = pathname.split('/').pop();

  const { data: board } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!boardId && isSignedIn,
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access the dashboard.</p>
          <a href="/sign-in" className="text-primary hover:underline">
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Board Header - Second Navbar */}
      {board && (
        <BoardHeader 
          boardId={boardId || ""} 
          boardTitle={board.title} 
          membersCount={board.members ? board.members.length + 1 : 1}
        />
      )}
      
      {/* Board Content */}
      <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
        {children}
      </main>
    </>
  );
}
