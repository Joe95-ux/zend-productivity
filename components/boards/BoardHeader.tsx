"use client";

import { useState } from "react";
import { ArrowLeft, MoreHorizontal, Star, Share2, Users, Info, Eye, Printer, Download, Settings, Palette, Crown, Activity, Copy, Mail, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { HoverHint } from "@/components/HoverHint";
import Link from "next/link";

interface BoardHeaderProps {
  boardId: string;
  boardTitle: string;
  boardDescription?: string;
  membersCount: number;
}

interface Activity {
  id: string;
  message: string;
  createdAt: string;
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  card: {
    id: string;
    title: string;
    list: {
      title: string;
    };
  };
}

export function BoardHeader({ boardId, boardTitle, boardDescription, membersCount }: BoardHeaderProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(boardTitle);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState(boardDescription || "");
  const [activeTab, setActiveTab] = useState("activity");
  const queryClient = useQueryClient();

  // Fetch activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/activities?boardId=${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
    enabled: isActivityOpen,
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/comments?boardId=${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: isActivityOpen,
  });

  // Update board mutation
  const updateBoardMutation = useMutation({
    mutationFn: async (data: { title?: string; description?: string }) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update board");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Board updated successfully");
    },
    onError: () => {
      toast.error("Failed to update board");
    },
  });

  const handleEditTitle = () => {
    if (editTitle.trim() && editTitle !== boardTitle) {
      updateBoardMutation.mutate({ title: editTitle.trim() });
    } else {
      setEditTitle(boardTitle);
    }
    setIsEditingTitle(false);
  };

  const handleEditDescription = () => {
    if (editDescription !== boardDescription) {
      updateBoardMutation.mutate({ description: editDescription.trim() });
    } else {
      setEditDescription(boardDescription || "");
    }
    setIsEditingDescription(false);
  };

  const handleActivityClick = () => {
    setIsMenuOpen(false);
    setIsActivityOpen(true);
  };

  const handleActivityBack = () => {
    setIsActivityOpen(false);
    setIsMenuOpen(true);
  };

  const handleActivityClose = () => {
    setIsActivityOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Board Header Navbar - Second Navbar */}
      <div className="relative w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="w-full px-[18px] lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left side - Board title only */}
            <div className="flex items-center gap-1 min-[320px]:gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" asChild className="cursor-pointer transition-all duration-300 ease-out hover:bg-muted/80 hover:scale-105">
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
                  className="h-8 text-[17px] font-bold bg-transparent border-none p-0 text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 focus:border-blue-400 transition-all duration-300 ease-out"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-sm sm:text-[17px] font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded transition-all duration-300 ease-out truncate"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {boardTitle}
                </h1>
              )}
            </div>

            {/* Right side - All clickable actions */}
            <div className="flex items-center gap-1 min-[320px]:gap-2">
              {/* Members count - Clickable */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label={`${membersCount} members`} side="bottom">
                  <Users className="h-4 w-4 mr-1" />
                </HoverHint>
                <span className="text-sm">{membersCount}</span>
              </Button>

              {/* Favorite button - Clickable */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label="Add to favorites" side="bottom">
                  <Star className="h-4 w-4" />
                </HoverHint>
              </Button>

              {/* Share button - Clickable */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label="Share board" side="bottom">
                  <Share2 className="h-4 w-4" />
                </HoverHint>
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
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="cursor-pointer transition-all duration-300 ease-out hover:scale-105"
                  >
                    <HoverHint label="Board menu" side="bottom">
                      <MoreHorizontal className="h-4 w-4" />
                    </HoverHint>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="bottom" 
                  align="end" 
                  sideOffset={14} 
                  alignOffset={-14}
                  className="w-80 sm:w-96 h-[600px] sm:h-[800px] p-0 flex flex-col"
                >
                  <div className="p-[14px] pb-0 flex-shrink-0 flex items-center justify-between">
                    <h3 className="text-[17px] font-bold">Menu</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMenuOpen(false)}
                      className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <HoverHint label="Close menu" side="bottom">
                        <X className="h-4 w-4" />
                      </HoverHint>
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                    <div className="p-[14px] space-y-2">
                    {/* About this board */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-3">
                        <Info className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">About this board</span>
                      </div>
                      {isEditingDescription ? (
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          onBlur={handleEditDescription}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleEditDescription();
                            } else if (e.key === "Escape") {
                              setEditDescription(boardDescription || "");
                              setIsEditingDescription(false);
                            }
                          }}
                          className="text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700 focus:border-blue-400 transition-all duration-300 ease-out resize-none"
                          placeholder="Add a description..."
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded transition-all duration-300 ease-out min-h-[40px] flex items-center"
                          onClick={() => setIsEditingDescription(true)}
                        >
                          {boardDescription || "Add a description..."}
                        </div>
                      )}
                    </div>

                    {/* Visibility */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Visibility</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Printer className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Print</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Download className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Export</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Share2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Share</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Settings */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Settings</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Palette className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Change background</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Crown className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Upgrade plan</span>
                      </div>
                    </div>

                    {/* Upgrade Plan Card */}
                    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-lg dark:shadow-slate-900/50 rounded-[4px] py-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Upgrade to Pro</CardTitle>
                        <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                          Get unlimited boards, advanced features, and priority support.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button 
                          size="sm" 
                          className="w-full bg-slate-600 hover:bg-slate-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-xs"
                        >
                          Upgrade Now
                        </Button>
                      </CardContent>
                    </Card>

                    <Separator />

                    {/* Board Features - Only on smaller screens */}
                    <div className="space-y-0 lg:hidden">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Members ({membersCount})</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Star className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Add to favorites</span>
                      </div>
                    </div>

                    <Separator className="lg:hidden" />

                    {/* Actions */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors" onClick={handleActivityClick}>
                        <Activity className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Activity</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Copy className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Copy board</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Eye className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Watch</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Email-to-board</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Close board</span>
                      </div>
                    </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Dropdown */}
      <DropdownMenu open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DropdownMenuTrigger asChild>
          <div />
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="bottom" 
          align="end" 
          sideOffset={14} 
          alignOffset={-14}
          className="w-80 sm:w-96 h-[600px] sm:h-[800px] p-0 flex flex-col"
        >
          <div className="p-[14px] pb-0 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleActivityBack}
                className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <HoverHint label="Back to menu" side="bottom">
                  <ArrowLeft className="h-4 w-4" />
                </HoverHint>
              </Button>
              <h3 className="text-[17px] font-bold">Activity</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleActivityClose}
              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <HoverHint label="Close activity" side="bottom">
                <X className="h-4 w-4" />
              </HoverHint>
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <div className="p-[14px]">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="activity" className="text-xs">All Activity</TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="activity" className="space-y-3">
                  {activitiesLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : activities && activities.length > 0 ? (
                    activities.map((activity: Activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <ConditionalUserProfile user={activity.user} size="md" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-900 dark:text-white">{activity.message}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="comments" className="space-y-3">
                  {commentsLoading ? (
                    // Loading skeleton for comments
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : comments && comments.length > 0 ? (
                    comments.map((comment: Comment) => (
                      <div key={comment.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <ConditionalUserProfile user={comment.user} size="md" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {comment.user.name || comment.user.email}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">on</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              {comment.card.title}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">in</span>
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              {comment.card.list.title}
                            </span>
                          </div>
                          <p className="text-sm text-slate-900 dark:text-white mb-2">{comment.content}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Mail className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No comments yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}