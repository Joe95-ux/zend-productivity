"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MessageSquare, Send, Edit, X, MoreHorizontal, Copy, Share, Trash2, Megaphone, FileText, Check, MoreVertical, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { HoverHint } from "@/components/HoverHint";

const updateCardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
});

type UpdateCardFormData = z.infer<typeof updateCardSchema>;
type CommentFormData = z.infer<typeof commentSchema>;

interface CardModalProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
    isCompleted: boolean;
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
  };
  list: {
    id: string;
    title: string;
  };
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CardModal({ card, list, boardId, isOpen, onClose }: CardModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isCommentFormExpanded, setIsCommentFormExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const queryClient = useQueryClient();

  // Fetch activities for this card
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities", boardId, card.id],
    queryFn: async () => {
      const response = await fetch(`/api/activities?boardId=${boardId}&cardId=${card.id}`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
    enabled: isOpen,
  });


  const cardForm = useForm<UpdateCardFormData>({
    resolver: zodResolver(updateCardSchema),
    defaultValues: {
      title: card.title,
      description: card.description || "",
    },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: async (data: UpdateCardFormData & { isCompleted?: boolean }) => {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update card");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Card updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          cardId: card.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      commentForm.reset();
      setIsCommentFormExpanded(false);
      toast.success("Comment added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setEditingCommentId(null);
      setEditingCommentContent("");
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
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Comment deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const handleAddComment = (data: CommentFormData) => {
    addCommentMutation.mutate(data);
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  const handleUpdateComment = () => {
    if (editingCommentId && editingCommentContent.trim()) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editingCommentContent.trim(),
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleDescriptionEdit = () => {
    setIsEditingDescription(true);
  };

  const handleTitleSave = (data: UpdateCardFormData) => {
    updateCardMutation.mutate(data);
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = (data: UpdateCardFormData) => {
    updateCardMutation.mutate(data);
    setIsEditingDescription(false);
  };

  const handleToggleComplete = () => {
    updateCardMutation.mutate({ 
      title: card.title, 
      description: card.description || "", 
      isCompleted: !card.isCompleted 
    });
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'delete':
        // TODO: Implement delete functionality
        toast.info("Delete functionality coming soon");
        break;
      case 'copy':
        // TODO: Implement copy functionality
        toast.info("Copy functionality coming soon");
        break;
      case 'move':
        // TODO: Implement move functionality
        toast.info("Move functionality coming soon");
        break;
      case 'share':
        // TODO: Implement share functionality
        toast.info("Share functionality coming soon");
        break;
    }
  };


  return (
    <>
      <Dialog open={isOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-8px)] sm:max-w-[65rem] max-h-[90vh] p-0 overflow-hidden gap-0 rounded-lg shadow-2xl border-0 bg-white dark:bg-slate-900">
          {/* Header */}
          <DialogHeader>
            <DialogTitle>
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-lg">
            <div className="flex items-center gap-2 md:gap-3">
              <Badge variant="secondary" className="text-xs md:text-sm font-medium px-2 md:px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600">
                {list.title}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <div  
                onClick={() => setIsFeedbackOpen(true)}
                className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center justify-center"
              >
                <HoverHint label="Share feedback" side="top">
                <Megaphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400" />
                </HoverHint>
                
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <HoverHint label="Actions" side="top">
                    <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400" />
                    </HoverHint>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleMenuAction('delete')} className="text-red-600 dark:text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction('copy')}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction('move')}>
                    <Edit className="w-4 h-4 mr-2" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction('share')}>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogClose>
              <div
                onClick={onClose}
                className="h-7 w-7 md:h-8 md:w-8 p-1.5 md:p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                <HoverHint label="Close" side="top">
                <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400" />
                </HoverHint>
              </div></DialogClose>
            </div>
            </div>
            </DialogTitle>
          </DialogHeader>
          

          {/* Body - Responsive Layout */}
          <div className="min-h-0 flex-1 bg-white dark:bg-slate-900">
            {/* Mobile: Tabbed Layout */}
            <div className="md:hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <TabsTrigger value="details" className="text-sm">Details</TabsTrigger>
                  <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {/* Card Title with Check Radio */}
                  <div className="flex items-start gap-3">
                    <div 
                      className={`w-5 h-5 border-2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 mt-0.5 ${
                        card.isCompleted 
                          ? 'bg-slate-600 border-slate-600 hover:bg-slate-700 hover:border-slate-700' 
                          : 'border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
                      } ${updateCardMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={updateCardMutation.isPending ? undefined : handleToggleComplete}
                    >
                      {updateCardMutation.isPending ? (
                        <div className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : card.isCompleted ? (
                        <Check className="w-3 h-3 text-white animate-in zoom-in duration-200" />
                      ) : null}
                    </div>
                {isEditingTitle ? (
                  <Form {...cardForm}>
                    <form onSubmit={cardForm.handleSubmit(handleTitleSave)} className="space-y-3 flex-1">
                      <FormField
                        control={cardForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="text-lg font-semibold border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 p-2 h-auto focus-visible:ring-0 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                autoFocus
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="bg-slate-600 hover:bg-slate-700 text-white text-sm px-3 py-1 h-7">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingTitle(false)}
                          className="border-slate-300 dark:border-slate-600 text-sm px-3 py-1 h-7"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <h1 
                    className="text-lg font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 -m-2 rounded-lg transition-all duration-200 flex-1 text-slate-900 dark:text-white"
                    onClick={handleTitleEdit}
                  >
                    {card.title}
                  </h1>
                )}
              </div>

              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Description</h3>
                  </div>
                  {card.description && !isEditingDescription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDescriptionEdit}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingDescription ? (
                  <Form {...cardForm}>
                    <form onSubmit={cardForm.handleSubmit(handleDescriptionSave)} className="space-y-4">
                      <FormField
                        control={cardForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={6} 
                                placeholder="Add a description..." 
                                className="border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 bg-slate-50 dark:bg-slate-800 rounded-lg resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-3">
                        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingDescription(false)}
                          className="border-slate-300 dark:border-slate-600"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div 
                    className="min-h-[120px] p-4 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                    onClick={handleDescriptionEdit}
                  >
                    {card.description ? (
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">{card.description}</p>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">Click to add a description...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Labels */}
              {card.labels.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Labels</h3>
                  <div className="flex flex-wrap gap-3">
                    {card.labels.map((label) => (
                      <Badge 
                        key={label.id} 
                        variant="secondary"
                        style={{ backgroundColor: label.color }}
                        className="px-3 py-1.5 text-sm font-medium rounded-full border-0 text-white shadow-sm"
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
                </TabsContent>
                
                <TabsContent value="activity" className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {/* Comments Header */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Comments and activity</h3>
                  </div>

                  {/* Add Comment Input */}
                  {!isCommentFormExpanded ? (
                    <div 
                      className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                      onClick={() => setIsCommentFormExpanded(true)}
                    >
                      <p className="text-sm text-slate-500 dark:text-slate-400">Write a comment...</p>
                    </div>
                  ) : (
                    <Form {...commentForm}>
                      <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-3">
                        <FormField
                          control={commentForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Write a comment..." 
                                  {...field} 
                                  rows={3}
                                  autoFocus
                                  className="border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-700 rounded-lg resize-none text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            size="sm" 
                            disabled={addCommentMutation.isPending}
                            className="bg-slate-600 hover:bg-slate-700 text-white text-sm px-3 py-1 h-7"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {addCommentMutation.isPending ? "Adding..." : "Comment"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCommentFormExpanded(false);
                              commentForm.reset();
                            }}
                            className="border-slate-300 dark:border-slate-600 text-sm px-3 py-1 h-7"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {/* Comments and Activity List */}
                  <div className="space-y-3">
                    {/* Comments Section */}
                    {card.comments.length > 0 && (
                      <div className="space-y-2">
                        {card.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                            <Avatar className="w-6 h-6 ring-1 ring-slate-200 dark:ring-slate-600">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs">
                                {comment.user.name?.charAt(0) || comment.user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-xs text-slate-900 dark:text-white">
                                    {comment.user.name || comment.user.email}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-slate-100 dark:hover:bg-slate-600"
                                    >
                                      <MoreVertical className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-28">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditComment(comment.id, comment.content)}
                                      className="text-slate-700 dark:text-slate-300 text-xs"
                                    >
                                      <Edit className="w-2.5 h-2.5 mr-1" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-red-600 dark:text-red-400 text-xs"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 mr-1" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="space-y-1">
                                  <Textarea
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                    rows={2}
                                    className="text-xs border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={handleUpdateComment}
                                      disabled={updateCommentMutation.isPending || !editingCommentContent.trim()}
                                      className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-2 py-0.5 h-6"
                                    >
                                      {updateCommentMutation.isPending ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      className="border-slate-300 dark:border-slate-600 text-xs px-2 py-0.5 h-6"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {comment.content}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Activities Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3" />
                        Recent Activity
                      </div>
                      <div className="space-y-1">
                        {activitiesLoading ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">Loading activities...</div>
                        ) : activities && activities.length > 0 ? (
                          activities.map((activity: { id: string; message: string; user: { name?: string; email: string }; createdAt: string }) => (
                            <div key={activity.id} className="flex gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-xs">
                                  {activity.user.name?.charAt(0) || activity.user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <p className="text-xs">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {activity.user.name || activity.user.email}
                                  </span>{" "}
                                  {activity.message}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-slate-400">No recent activity</div>
                        )}
                        {card.comments.length === 0 && (
                          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full w-fit mx-auto mb-2">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <p className="text-xs font-medium">No comments yet</p>
                            <p className="text-xs mt-0.5">Be the first to add a comment</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: Two Column Layout */}
            <div className="hidden md:flex flex-row min-h-0 flex-1">
              {/* Left Column */}
              <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                {/* Card Title with Check Radio */}
                <div className="flex items-start gap-4">
                  <div 
                    className={`w-6 h-6 border-2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 mt-0.5 ${
                      card.isCompleted 
                        ? 'bg-slate-600 border-slate-600 hover:bg-slate-700 hover:border-slate-700' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
                    } ${updateCardMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={updateCardMutation.isPending ? undefined : handleToggleComplete}
                  >
                    {updateCardMutation.isPending ? (
                      <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : card.isCompleted ? (
                      <Check className="w-4 h-4 text-white animate-in zoom-in duration-200" />
                    ) : null}
                  </div>
                  {isEditingTitle ? (
                    <Form {...cardForm}>
                      <form onSubmit={cardForm.handleSubmit(handleTitleSave)} className="space-y-3 flex-1">
                        <FormField
                          control={cardForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  className="text-xl font-semibold border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 p-3 h-auto focus-visible:ring-0 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                  autoFocus
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-3">
                          <Button type="submit" size="sm" className="bg-slate-600 hover:bg-slate-700 text-white">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingTitle(false)}
                            className="border-slate-300 dark:border-slate-600"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <h1 
                      className="text-xl font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-3 -m-3 rounded-lg transition-all duration-200 flex-1 text-slate-900 dark:text-white"
                      onClick={handleTitleEdit}
                    >
                      {card.title}
                    </h1>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Description</h3>
                    </div>
                    {card.description && !isEditingDescription && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDescriptionEdit}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingDescription ? (
                    <Form {...cardForm}>
                      <form onSubmit={cardForm.handleSubmit(handleDescriptionSave)} className="space-y-4">
                        <FormField
                          control={cardForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  rows={6} 
                                  placeholder="Add a description..." 
                                  className="border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-3">
                          <Button type="submit" size="sm" className="bg-slate-600 hover:bg-slate-700 text-white">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingDescription(false)}
                            className="border-slate-300 dark:border-slate-600"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div 
                      className="min-h-[120px] p-4 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                      onClick={handleDescriptionEdit}
                    >
                      {card.description ? (
                        <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">{card.description}</p>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Click to add a description...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Labels */}
                {card.labels.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Labels</h3>
                    <div className="flex flex-wrap gap-3">
                      {card.labels.map((label) => (
                        <Badge 
                          key={label.id} 
                          variant="secondary"
                          style={{ backgroundColor: label.color }}
                          className="px-3 py-1.5 text-sm font-medium rounded-full border-0 text-white shadow-sm"
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Separator Line */}
              <Separator orientation="vertical" className="bg-slate-200 dark:bg-slate-700" />

            {/* Right Column */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-800">
              {/* Comments Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                    <MessageSquare className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Comments and activity</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Hide details
                </Button>
              </div>

              {/* Add Comment Input */}
              {!isCommentFormExpanded ? (
                <div 
                  className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                  onClick={() => setIsCommentFormExpanded(true)}
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">Write a comment...</p>
                </div>
              ) : (
                <Form {...commentForm}>
                  <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-4">
                    <FormField
                      control={commentForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Write a comment..." 
                              {...field} 
                              rows={4}
                              autoFocus
                              className="border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-700 rounded-lg resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3">
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={addCommentMutation.isPending}
                        className="bg-slate-600 hover:bg-slate-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {addCommentMutation.isPending ? "Adding..." : "Comment"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCommentFormExpanded(false);
                          commentForm.reset();
                        }}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Comments and Activity List */}
              {showDetails && (
                <div className="space-y-4">
                  {/* Comments Section */}
                  {card.comments.length > 0 && (
                    <div className="space-y-3">
                      {card.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                          <Avatar className="w-8 h-8 ring-1 ring-slate-200 dark:ring-slate-600">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs">
                              {comment.user.name?.charAt(0) || comment.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-900 dark:text-white">
                                  {comment.user.name || comment.user.email}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-600"
                                  >
                                    <MoreVertical className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem 
                                    onClick={() => handleEditComment(comment.id, comment.content)}
                                    className="text-slate-700 dark:text-slate-300"
                                  >
                                    <Edit className="w-3 h-3 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-3 h-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  rows={3}
                                  className="text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleUpdateComment}
                                    disabled={updateCommentMutation.isPending || !editingCommentContent.trim()}
                                    className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-3 py-1 h-7"
                                  >
                                    {updateCommentMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="border-slate-300 dark:border-slate-600 text-xs px-3 py-1 h-7"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                {comment.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Activities Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Clock className="w-4 h-4" />
                      Recent Activity
                    </div>
                    <div className="space-y-2">
                      {activitiesLoading ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading activities...</div>
                      ) : activities && activities.length > 0 ? (
                        activities.map((activity: { id: string; message: string; user: { name?: string; email: string }; createdAt: string }) => (
                          <div key={activity.id} className="flex gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src="" />
                              <AvatarFallback>
                                {activity.user.name?.charAt(0) || activity.user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {activity.user.name || activity.user.email}
                                </span>{" "}
                                {activity.message}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No recent activity</div>
                      )}
                      {card.comments.length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full w-fit mx-auto mb-3">
                            <MessageSquare className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium">No comments yet</p>
                          <p className="text-xs mt-1">Be the first to add a comment</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  );
}