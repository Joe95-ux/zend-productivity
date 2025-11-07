"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsersRound, Calendar, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditBoardForm } from "./EditBoardForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface BoardCardProps {
  board: {
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
  };
}

export function BoardCard({ board }: BoardCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete board");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      deleteBoardMutation.mutate(board.id);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group py-6">
        <Link href={`/dashboard/boards/${board.id}`} className="block">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">
                  {board.title}
                </CardTitle>
                {board.description && (
                  <CardDescription className="line-clamp-2 mt-1">
                    {board.description}
                  </CardDescription>
                )}
              </div>
              <div onClick={(e) => e.preventDefault()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-background cursor-pointer transition-all duration-300 ease-out hover:scale-105"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound className="w-4 h-4" />
              <span>{board.members.length + 1} members</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Updated {new Date(board.updatedAt).toLocaleDateString()}
              </span>
            </div>
            
            {board.lists.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {board.lists.slice(0, 3).map((list) => (
                  <Badge key={list.id} variant="secondary" className="text-xs">
                    {list.title}
                  </Badge>
                ))}
                {board.lists.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{board.lists.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
        </Link>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <EditBoardForm 
            board={board} 
            onSuccess={() => setIsEditOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
