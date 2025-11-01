"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, MoreHorizontal, Star, Share2, Users, Info, Eye, EyeOff, Printer, Download, Settings, Palette, Crown, Activity, Copy, Mail, Trash2, X, Tag, Edit, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useDndContextOptional } from "@/components/dnd/DndProvider";
import { toast } from "sonner";
import { HoverHint } from "@/components/HoverHint";
import Link from "next/link";
import { HexColorPicker } from "react-colorful";
import { format } from "date-fns";
import { CommentItem } from "@/components/comments/CommentItem";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { BoardFilter } from "./BoardFilter";

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
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    user?: {
      id: string;
      name?: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
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
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("");
  const [editLabelCustomColor, setEditLabelCustomColor] = useState("");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#ef4444");
  const [newLabelCustomColor, setNewLabelCustomColor] = useState("");
  const [labelSearchQuery, setLabelSearchQuery] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(boardTitle);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState(boardDescription || "");
  const [activeTab, setActiveTab] = useState("activity");
  const [isWatching, setIsWatching] = useState(false);
  const [isWatchLoading, setIsWatchLoading] = useState(false);
  const dndContext = useDndContextOptional();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currentUserId = useCurrentUserId();
  
  // Comment editing state (for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editingCommentId, setEditingCommentId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_commentToDelete, setCommentToDelete] = useState<string | null>(null);
  
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

  // Fetch board data (for owner and members for filter)
  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
  });

  // Fetch board labels
  const { data: boardLabels = [], isLoading: labelsLoading } = useQuery({
    queryKey: ["labels", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/labels?boardId=${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch labels");
      return response.json();
    },
    enabled: isLabelsOpen,
  });

  // Get members array for filter (from boardData or dndContext as fallback)
  const filterMembers = boardData?.owner && boardData?.members
    ? [boardData.owner, ...(boardData.members.map((m: { user: unknown }) => m.user).filter(Boolean) || [])]
    : dndContext?.orderedData
    ? [dndContext.orderedData.owner, ...(dndContext.orderedData.members?.map(m => m.user).filter(Boolean) || [])]
    : [];

  // Fallback: Check watch status if not in DndProvider context
  const { data: watchStatusFallback } = useQuery({
    queryKey: ["watch", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/watch/check?boardId=${boardId}`);
      if (!response.ok) throw new Error("Failed to check watch status");
      return response.json();
    },
    enabled: !dndContext && !!boardId,
  });

  // Use batch watch map from context if available, otherwise use fallback query
  useEffect(() => {
    if (dndContext?.watchMap) {
      setIsWatching(Boolean(dndContext.watchMap[`board:${boardId}`]));
    } else if (watchStatusFallback) {
      setIsWatching(watchStatusFallback.isWatching);
    }
  }, [dndContext?.watchMap, watchStatusFallback, boardId]);

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
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });
      
      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(["board", boardId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["board", boardId], (old: { title?: string; description?: string; [key: string]: unknown } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          title: newData.title || old.title,
          description: newData.description || old.description,
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousBoard };
    },
    onSuccess: () => {
      toast.success("Board updated successfully");
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
      toast.error("Failed to update board");
      // Reopen the modal on error so user can retry
      setIsEditingTitle(true);
      setEditTitle(newData.title || boardTitle);
    },
  });

  const handleEditTitle = () => {
    if (editTitle.trim() && editTitle !== boardTitle) {
      // Optimistic update - close modal immediately and update UI
      setIsEditingTitle(false);
      updateBoardMutation.mutate({ title: editTitle.trim() });
    } else {
      setEditTitle(boardTitle);
      setIsEditingTitle(false);
    }
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

  const handleLabelsClick = () => {
    setIsMenuOpen(false);
    setIsLabelsOpen(true);
  };

  const handleLabelsBack = () => {
    setIsLabelsOpen(false);
    setIsMenuOpen(true);
  };

  const handleLabelsClose = () => {
    setIsLabelsOpen(false);
    setIsMenuOpen(false);
    setEditingLabelId(null);
    setIsCreatingLabel(false);
    setLabelSearchQuery("");
  };

  // Comment mutations (updateCommentMutation kept for future use but currently not used)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Comment updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Comment deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEditComment = (_commentId: string, _currentContent: string) => {
    // TODO: Implement comment editing UI in activity dropdown
    // For now, editing is not implemented in the activity dropdown
    toast.info("Comment editing is not available in the activity dropdown. Please edit from the card modal.");
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    deleteCommentMutation.mutate(commentId);
  };

  const LABEL_COLORS = [
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Yellow", value: "#eab308" },
    { name: "Green", value: "#22c55e" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#a855f7" },
    { name: "Pink", value: "#ec4899" },
    { name: "Gray", value: "#6b7280" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Indigo", value: "#6366f1" },
  ];

  // Create label mutation
  const createLabelMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, boardId }),
      });
      if (!response.ok) throw new Error("Failed to create label");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      setIsCreatingLabel(false);
      setNewLabelName("");
      setNewLabelColor("#ef4444");
      setNewLabelCustomColor("");
      toast.success("Label created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update label mutation
  const updateLabelMutation = useMutation({
    mutationFn: async ({ labelId, name, color }: { labelId: string; name: string; color: string }) => {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!response.ok) throw new Error("Failed to update label");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      setEditingLabelId(null);
      setEditLabelName("");
      setEditLabelColor("");
      toast.success("Label updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete label mutation
  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete label");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingLabelId(null);
      toast.success("Label deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEditLabel = (label: { id: string; name: string; color: string }) => {
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
    setEditLabelCustomColor("");
  };

  const handleSaveLabel = () => {
    if (!editingLabelId || !editLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }
    const colorToUse = editLabelCustomColor.trim() || editLabelColor;
    updateLabelMutation.mutate({
      labelId: editingLabelId,
      name: editLabelName.trim(),
      color: colorToUse,
    });
  };

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }
    const colorToUse = newLabelCustomColor.trim() || newLabelColor;
    createLabelMutation.mutate({
      name: newLabelName.trim(),
      color: colorToUse,
    });
  };

  // Filter labels based on search
  const filteredLabels = boardLabels.filter((label: { id: string; name: string; color: string }) =>
    label.name.toLowerCase().includes(labelSearchQuery.toLowerCase())
  );

  // Watch toggle mutation (fallback when not in DndProvider)
  const watchToggleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/watch", {
        method: isWatching ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle watch");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsWatching(!isWatching);
      queryClient.invalidateQueries({ queryKey: ["watch", boardId] });
      toast.success(isWatching ? "Stopped watching board" : "Now watching board");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleWatchToggle = () => {
    if (isWatchLoading) return;
    setIsWatchLoading(true);
    
    // Use context toggle if available, otherwise use mutation
    if (dndContext?.toggleWatch) {
      dndContext.toggleWatch({ boardId, watch: !isWatching })
        .then(() => toast.success(!isWatching ? "Now watching board" : "Stopped watching board"))
        .catch(() => {})
        .finally(() => setIsWatchLoading(false));
    } else {
      watchToggleMutation.mutate();
      setIsWatchLoading(false);
    }
  };

  return (
    <>
      {/* Animated Title Edit Overlay */}
      <AnimatePresence>
        {isEditingTitle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setEditTitle(boardTitle);
              setIsEditingTitle(false);
            }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Edit Board Title</h3>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditTitle();
                  } else if (e.key === "Escape") {
                    setEditTitle(boardTitle);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-lg font-medium"
                autoFocus
                placeholder="Enter board title..."
              />
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleEditTitle}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditTitle(boardTitle);
                    setIsEditingTitle(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h1 
                className="text-sm sm:text-[17px] font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded transition-all duration-300 ease-out truncate"
                onClick={() => setIsEditingTitle(true)}
              >
                {boardTitle}
              </h1>
            </div>

            {/* Right side - All clickable actions */}
            <div className="flex items-center gap-1 min-[320px]:gap-2">
              {/* User Profile - Hidden on mobile, shown in menu */}
              <div className="hidden lg:block">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
              </div>

              {/* Members count - Clickable - Hidden on mobile */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label={`${membersCount} members`} side="bottom">
                  <Users className="h-4 w-4 mr-1" />
                </HoverHint>
                <span className="text-sm">{membersCount}</span>
              </Button>

              {/* Favorite button - Clickable - Hidden on mobile */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label="Add to favorites" side="bottom">
                  <Star className="h-4 w-4" />
                </HoverHint>
              </Button>

              {/* Share button - Clickable - Hidden on mobile */}
              <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-300 ease-out hover:scale-105 hidden lg:flex">
                <HoverHint label="Share board" side="bottom">
                  <Share2 className="h-4 w-4" />
                </HoverHint>
              </Button>

              {/* Filter button */}
              <BoardFilter
                labels={boardLabels}
                members={filterMembers}
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
                  sideOffset={isMobile ? -14 : 4} 
                  alignOffset={-25}
                  className="w-full sm:w-95 h-auto max-h-[calc(100vh-10rem)] p-0 flex flex-col dark:bg-[#0D1117]"
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
                  
                  {/* Mobile User Profile - Only visible on mobile */}
                  <div className="lg:hidden px-[14px] py-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <UserButton 
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            avatarBox: "w-8 h-8"
                          }
                        }}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Account</span>
                    </div>
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
                    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-lg dark:shadow-slate-900/50 rounded-md py-6">
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
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors" onClick={handleLabelsClick}>
                        <Tag className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Labels</span>
                      </div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                        <Copy className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-normal">Copy board</span>
                      </div>
                      <div 
                        className={`flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors ${isWatching ? 'text-blue-600 dark:text-blue-400' : ''}`}
                        onClick={handleWatchToggle}
                      >
                        {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        <span className="text-sm font-normal">{isWatching ? 'Stop Watching' : 'Watch'}</span>
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
          sideOffset={isMobile ? -14 : 4} 
          alignOffset={-10}
          className="w-full sm:w-95 h-auto max-h-[calc(100vh-10rem)] p-0 flex flex-col dark:bg-[#0D1117]"
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
                            {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
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
                    Array.from({ length: 6 }).map((_, index) => (
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
                      <CommentItem
                        key={comment.id}
                        comment={{
                          id: comment.id,
                          content: comment.content,
                          createdAt: comment.createdAt,
                          user: comment.user,
                          reactions: comment.reactions,
                        }}
                        currentUserId={currentUserId || undefined}
                        boardId={boardId}
                        showCardInfo={true}
                        cardTitle={comment.card.title}
                        listTitle={comment.card.list.title}
                        onEdit={handleEditComment}
                        onDelete={handleDeleteComment}
                      />
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

      {/* Labels Dropdown */}
      <DropdownMenu open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
        <DropdownMenuTrigger asChild>
          <div />
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="bottom" 
          align="end" 
          sideOffset={isMobile ? -14 : 4} 
          alignOffset={-10}
          className="w-full sm:w-95 h-auto max-h-[calc(100vh-10rem)] p-0 flex flex-col dark:bg-[#0D1117]"
        >
          <div className="p-[14px] pb-0 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLabelsBack}
                className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <HoverHint label="Back to menu" side="bottom">
                  <ArrowLeft className="h-4 w-4" />
                </HoverHint>
              </Button>
              <h3 className="text-[17px] font-bold">Labels</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLabelsClose}
              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <HoverHint label="Close labels" side="bottom">
                <X className="h-4 w-4" />
              </HoverHint>
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <div className="p-[14px] space-y-4">
              {/* Search Input - First */}
              {!labelsLoading && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={labelSearchQuery}
                    onChange={(e) => setLabelSearchQuery(e.target.value)}
                    placeholder="Search labels..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              )}

              {/* Labels List - Second */}
              {labelsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 flex items-center gap-3 px-3 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse">
                      <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                      <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredLabels.length > 0 ? (
                <div className="space-y-2">
                  {filteredLabels.map((label: { id: string; name: string; color: string }) => {
                    const isEditing = editingLabelId === label.id;
                    return (
                      <div key={label.id}>
                        {isEditing ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Name
                              </label>
                              <Input
                                value={editLabelName}
                                onChange={(e) => setEditLabelName(e.target.value)}
                                placeholder="Enter label name..."
                                className="h-8 text-sm"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveLabel();
                                  } else if (e.key === "Escape") {
                                    setEditingLabelId(null);
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                Select a color
                              </label>
                              <div className="grid grid-cols-10 gap-1.5">
                                {LABEL_COLORS.map((color) => (
                                  <button
                                    key={color.value}
                                    onClick={() => {
                                      setEditLabelColor(color.value);
                                      setEditLabelCustomColor(""); // Clear custom color when selecting predefined
                                    }}
                                    className={`w-7 h-7 rounded border-2 transition-all ${
                                      editLabelColor === color.value && !editLabelCustomColor
                                        ? "border-slate-900 dark:border-white scale-110"
                                        : "border-slate-300 dark:border-slate-600 hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              
                              {/* Custom Color Picker for Edit */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs text-slate-600 dark:text-slate-400">
                                    Or choose custom color:
                                  </label>
                                  {!editLabelCustomColor && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditLabelCustomColor(editLabelColor)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Palette className="w-3 h-3 mr-1" />
                                      Custom
                                    </Button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 rounded-sm cursor-pointer"
                                      style={{ backgroundColor: editLabelCustomColor || editLabelColor }}
                                      onClick={() => {
                                        if (!editLabelCustomColor) {
                                          setEditLabelCustomColor(editLabelColor);
                                        }
                                      }}
                                    />
                                    <Input
                                      type="text"
                                      value={editLabelCustomColor}
                                      onChange={(e) => {
                                        setEditLabelCustomColor(e.target.value);
                                        setEditLabelColor(e.target.value);
                                      }}
                                      placeholder="#000000"
                                      className="flex-1 h-8 text-sm"
                                    />
                                    {editLabelCustomColor && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditLabelCustomColor("")}
                                        className="h-8 px-2"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                  {editLabelCustomColor && (
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-700">
                                      <HexColorPicker
                                        color={editLabelCustomColor}
                                        onChange={(color) => {
                                          setEditLabelCustomColor(color);
                                          setEditLabelColor(color);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSaveLabel}
                                disabled={updateLabelMutation.isPending || !editLabelName.trim()}
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {updateLabelMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingLabelId(null);
                                  setEditLabelName("");
                                  setEditLabelColor("");
                                  setEditLabelCustomColor("");
                                }}
                                className="px-3"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteLabelMutation.mutate(label.id)}
                                disabled={deleteLabelMutation.isPending}
                                className="px-3 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                {deleteLabelMutation.isPending ? "..." : "Delete"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label 
                            className="h-12 flex items-center justify-between gap-3 px-3 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                            onClick={() => handleEditLabel(label)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-3 rounded-sm" style={{ backgroundColor: label.color }} />
                              <span className="text-sm text-slate-800 dark:text-slate-200">
                                {label.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLabel(label);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-all"
                              title="Edit label"
                              type="button"
                            >
                              <Edit className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            </button>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : labelSearchQuery ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Search className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">No labels found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Tag className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No labels yet</p>
                  <p className="text-xs mt-1">Create a new label to get started</p>
                </div>
              )}

              {/* Create New Label - Last */}
              {!labelsLoading && (
                <>
                  {!isCreatingLabel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingLabel(true)}
                      className="w-full h-10 text-sm justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create a new label
                    </Button>
                  ) : (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Name
                        </label>
                        <Input
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="Enter label name..."
                          className="h-8 text-sm"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleCreateLabel();
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Palette className="w-3 h-3" />
                          Select a color
                        </label>
                        <div className="grid grid-cols-10 gap-1.5">
                          {LABEL_COLORS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => {
                                setNewLabelColor(color.value);
                                setNewLabelCustomColor(""); // Clear custom color when selecting predefined
                              }}
                              className={`w-7 h-7 rounded border-2 transition-all ${
                                newLabelColor === color.value && !newLabelCustomColor
                                  ? "border-slate-900 dark:border-white scale-110"
                                  : "border-slate-300 dark:border-slate-600 hover:scale-105"
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                        
                        {/* Custom Color Picker */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-600 dark:text-slate-400">
                              Or choose custom color:
                            </label>
                            {!newLabelCustomColor && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setNewLabelCustomColor(newLabelColor)}
                                className="h-6 px-2 text-xs"
                              >
                                <Palette className="w-3 h-3 mr-1" />
                                Custom
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 rounded-sm cursor-pointer"
                                style={{ backgroundColor: newLabelCustomColor || newLabelColor }}
                                onClick={() => {
                                  if (!newLabelCustomColor) {
                                    setNewLabelCustomColor(newLabelColor);
                                  }
                                }}
                              />
                              <Input
                                type="text"
                                value={newLabelCustomColor}
                                onChange={(e) => {
                                  setNewLabelCustomColor(e.target.value);
                                  setNewLabelColor(e.target.value);
                                }}
                                placeholder="#000000"
                                className="flex-1 h-8 text-sm"
                              />
                              {newLabelCustomColor && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewLabelCustomColor("")}
                                  className="h-8 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            {newLabelCustomColor && (
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-700">
                                <HexColorPicker
                                  color={newLabelCustomColor}
                                  onChange={(color) => {
                                    setNewLabelCustomColor(color);
                                    setNewLabelColor(color);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateLabel}
                          disabled={createLabelMutation.isPending || !newLabelName.trim()}
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {createLabelMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreatingLabel(false);
                            setNewLabelName("");
                            setNewLabelColor("#ef4444");
                            setNewLabelCustomColor("");
                          }}
                          className="px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}