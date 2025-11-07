"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { BoardCard } from "@/components/boards/BoardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

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

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function WorkspaceBoardsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  // Fetch workspace details
  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>({
    queryKey: ["workspace", workspaceId],
    queryFn: async (): Promise<Workspace> => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) throw new Error("Failed to fetch workspace");
      return response.json() as Promise<Workspace>;
    },
    enabled: !!workspaceId,
  });

  // Fetch boards for this workspace
  const { data: boards, isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["workspaceBoards", workspaceId],
    queryFn: async (): Promise<Board[]> => {
      const response = await fetch(`/api/workspaces/${workspaceId}/boards`);
      if (!response.ok) throw new Error("Failed to fetch boards");
      return response.json() as Promise<Board[]>;
    },
    enabled: !!workspaceId,
  });

  if (!workspaceId) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invalid workspace ID</p>
        </div>
      </div>
    );
  }

  if (workspaceLoading) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="py-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
          <p className="text-muted-foreground">
            {workspace?.name ? `Boards in ${workspace.name}` : "Manage your boards"}
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
            {workspaceId && (
              <CreateBoardForm
                workspaceId={workspaceId}
                onSuccess={() => setIsCreateBoardOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {boardsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="py-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Kanban className="w-8 h-8 text-muted-foreground" />
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

