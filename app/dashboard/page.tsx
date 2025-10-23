"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { BoardCard } from "@/components/boards/BoardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
}

export default function DashboardPage() {
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

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
    <div className="w-full space-y-6 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Boards</h1>
          <p className="text-muted-foreground">
            Manage your projects and tasks
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

      {/* Boards Grid */}
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
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
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
  );
}
