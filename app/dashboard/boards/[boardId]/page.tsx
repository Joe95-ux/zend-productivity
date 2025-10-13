"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListForm } from "@/components/lists/CreateListForm";
import { ListContainer } from "@/components/lists/ListContainer";
import { DndProvider } from "@/components/dnd/DndProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

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
    position: number;
    cards: Array<{
      id: string;
      title: string;
      description?: string;
      position: number;
      labels: Array<{
        id: string;
        name: string;
        color: string;
      }>;
      comments: Array<{
        id: string;
        content: string;
        user: {
          name?: string;
          email: string;
        };
        createdAt: string;
      }>;
    }>;
  }>;
}

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);

  const { data: board, isLoading, error } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch board");
      }
      return response.json();
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">Failed to load board. Please try again.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-72 flex-shrink-0">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Skeleton className="h-6 w-24 mb-4 bg-slate-700" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-slate-700" />
                  <Skeleton className="h-20 w-full bg-slate-700" />
                  <Skeleton className="h-20 w-full bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
          <div className="w-72 flex-shrink-0">
            <Skeleton className="h-12 w-full border-dashed border-2 bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Board Content */}
      <div className="p-4">
        {board?.lists && board.lists.length > 0 ? (
          <DndProvider boardId={boardId}>
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
              {board.lists.map((list) => (
                <ListContainer key={list.id} list={list} />
              ))}
              
              {/* Add List Button */}
              <div className="flex-shrink-0 w-72">
                <Button
                  onClick={() => setIsCreateListOpen(true)}
                  variant="outline"
                  className="w-full h-12 border-dashed border-2 hover:border-solid cursor-pointer transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add another list
                </Button>
              </div>
            </div>
          </DndProvider>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first list to start organizing your tasks.
            </p>
            <Button onClick={() => setIsCreateListOpen(true)} className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          </div>
        )}
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <CreateListForm 
            boardId={boardId} 
            onSuccess={() => setIsCreateListOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
