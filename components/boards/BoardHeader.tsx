"use client";

import { useState } from "react";
import { ArrowLeft, Plus, MoreHorizontal, Star, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityFeed } from "@/components/activities/ActivityFeed";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

interface BoardHeaderProps {
  boardId: string;
  boardTitle: string;
  membersCount: number;
}

export function BoardHeader({ boardId, boardTitle, membersCount }: BoardHeaderProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(boardTitle);
  const queryClient = useQueryClient();

  const updateBoardMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update board");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setIsEditingTitle(false);
      toast.success("Board title updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setEditTitle(boardTitle);
      setIsEditingTitle(false);
    },
  });

  const handleEditTitle = () => {
    if (editTitle.trim() && editTitle !== boardTitle) {
      updateBoardMutation.mutate(editTitle.trim());
    } else {
      setEditTitle(boardTitle);
      setIsEditingTitle(false);
    }
  };

  return (
    <>
      {/* Board Header Navbar - Second Navbar */}
      <div className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left side - Board title only */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="cursor-pointer transition-all duration-200 hover:bg-muted/80 hover:scale-105">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              {isEditingTitle ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleEditTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEditTitle();
                    } else if (e.key === "Escape") {
                      setEditTitle(boardTitle);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="h-8 text-[17px] font-bold bg-transparent border-none p-0 text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 focus:border-blue-400 transition-all duration-200"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-[17px] font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded transition-all duration-200"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {boardTitle}
                </h1>
              )}
            </div>

          {/* Right side - All clickable actions */}
          <div className="flex items-center gap-2">
            {/* Members count - Clickable */}
            <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-200 hover:scale-105">
              <Users className="h-4 w-4 mr-1" />
              <span className="text-sm">{membersCount}</span>
            </Button>

            {/* Favorite button - Clickable */}
            <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-200 hover:scale-105">
              <Star className="h-4 w-4" />
            </Button>

            {/* Share button - Clickable */}
            <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-200 hover:scale-105">
              <Share2 className="h-4 w-4" />
            </Button>

            {/* User Profile - Same as main navbar */}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />

            {/* Menu - Clickable */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => setIsMenuOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Sidebar */}
      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="fixed right-0 top-0 h-full w-80 max-w-[80vw] translate-x-0 translate-y-0 data-[state=closed]:translate-x-full">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80">
              <Users className="h-4 w-4 mr-2" />
              About this board
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80"
              onClick={() => {
                setIsMenuOpen(false);
                setIsActivityOpen(true);
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Activity
            </Button>
            <Button variant="ghost" className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80">
              <Star className="h-4 w-4 mr-2" />
              Star
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Sidebar */}
      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="fixed right-0 top-0 h-full w-80 max-w-[80vw] translate-x-0 translate-y-0 data-[state=closed]:translate-x-full">
          <DialogHeader>
            <DialogTitle>Activity</DialogTitle>
          </DialogHeader>
          <ActivityFeed boardId={boardId} />
        </DialogContent>
      </Dialog>
    </>
  );
}
