"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { BoardCard } from "@/components/boards/BoardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Board {
  id: string;
  title: string;
  description?: string;
  owner: {
    name?: string;
    email: string;
  };
  members: Array<{
    user: {
      name?: string;
      email: string;
    };
  }>;
  lists: Array<{
    id: string;
    title: string;
    cards: Array<{
      id: string;
      title: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export default function AllBoardsPage() {
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [recentBoards, setRecentBoards] = useState<string[]>([]);

  // Load recent boards from localStorage
  useEffect(() => {
    const storedRecent = localStorage.getItem("recentBoards");
    if (storedRecent) {
      try {
        setRecentBoards(JSON.parse(storedRecent));
      } catch {
        setRecentBoards([]);
      }
    }
  }, []);

  const { data: boards, isLoading, error } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: async () => {
      const response = await fetch("/api/boards");
      if (!response.ok) {
        throw new Error("Failed to fetch boards");
      }
      return response.json();
    },
  });

  // Fetch favorite boards
  const { data: favoriteBoardsData } = useQuery<Array<{ boardId: string }>>({
    queryKey: ["favoriteBoards"],
    queryFn: async () => {
      const response = await fetch("/api/boards/favorites");
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  const favoriteBoardIds = favoriteBoardsData?.map((f) => f.boardId) || [];

  // Filter boards by category
  const starredBoards = boards?.filter((board) => favoriteBoardIds.includes(board.id)) || [];
  const recentBoardsList = boards?.filter((board) => recentBoards.includes(board.id)) || [];
  const allOtherBoards = boards?.filter(
    (board) => !favoriteBoardIds.includes(board.id) && !recentBoards.includes(board.id)
  ) || [];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">Failed to load boards. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Boards</h1>
          <p className="text-muted-foreground">
            View and manage all your boards
          </p>
        </div>
        
        <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <CreateBoardForm onSuccess={() => setIsCreateBoardOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Starred Boards */}
          {starredBoards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-xl font-semibold">Starred Boards</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {starredBoards.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed Boards */}
          {recentBoardsList.length > 0 && (
            <div>
              {starredBoards.length > 0 && <Separator className="my-6" />}
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Recently Viewed</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recentBoardsList.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
            </div>
          )}

          {/* All Boards */}
          {allOtherBoards.length > 0 && (
            <div>
              {(starredBoards.length > 0 || recentBoardsList.length > 0) && <Separator className="my-6" />}
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold">All Boards</h2>
                <span className="text-sm text-muted-foreground">({allOtherBoards.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {allOtherBoards.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {boards && boards.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first board to get started with organizing your tasks.
              </p>
              <Button onClick={() => setIsCreateBoardOpen(true)} className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Board
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

