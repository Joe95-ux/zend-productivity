"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MessageSquare, Send, Edit, X, MoreHorizontal, Copy, Share, Trash2, Megaphone, FileText, Check, MoreVertical, Clock, Eye, EyeOff, Calendar, Users, Paperclip, RotateCcw, SquareCheckBig } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { HoverHint } from "@/components/HoverHint";
import { ShootingStars } from "@/components/ui/ShootingStars";
import { motion, AnimatePresence } from "framer-motion";
import { Board, List, Card as CardType, Checklist } from "@/lib/types";
import { DueDateDropdown } from "./DueDateDropdown";
import { ChecklistDropdown } from "./ChecklistDropdown";
import { LabelDropdown } from "./LabelDropdown";
import { CopyChecklistModal } from "./CopyChecklistModal";
import { ChecklistItemDndProvider } from "@/components/dnd/ChecklistItemDndProvider";
import { DraggableChecklistItem } from "./DraggableChecklistItem";

const updateCardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
});

type UpdateCardFormData = z.infer<typeof updateCardSchema>;
type CommentFormData = z.infer<typeof commentSchema>;

type UserWithAvatar = {
  name?: string;
  email: string;
  avatarUrl?: string;
};

interface CardModalProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position: number;
    isCompleted: boolean;
    dueDate?: string;
    startDate?: string;
    isRecurring?: boolean;
    recurringType?: string;
    reminderType?: string;
    labels: Array<{
      id: string;
      name: string;
      color: string;
    }>;
    checklists?: Checklist[];
    comments: Array<{
      id: string;
      content: string;
      user: {
        name?: string;
        email: string;
        avatarUrl?: string;
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
  const [isCompleted, setIsCompleted] = useState(card.isCompleted);
  const [showShootingStars, setShowShootingStars] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [isWatchLoading, setIsWatchLoading] = useState(false);
  const [isCopyChecklistOpen, setIsCopyChecklistOpen] = useState(false);
  const [checklistToCopy, setChecklistToCopy] = useState<Checklist | null>(null);
  
  // Checklist inline editing state
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [showAddItemForm, setShowAddItemForm] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState("");
  
  // Mobile checklist title editing popup
  const [isMobileEditTitleOpen, setIsMobileEditTitleOpen] = useState(false);
  const [mobileEditChecklistId, setMobileEditChecklistId] = useState<string | null>(null);
  const [mobileEditTitle, setMobileEditTitle] = useState("");
  
  // Checklist deletion and visibility state
  const [isDeleteChecklistOpen, setIsDeleteChecklistOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);
  const [hiddenChecklists, setHiddenChecklists] = useState<Set<string>>(new Set());
  const [optimisticItemStates, setOptimisticItemStates] = useState<Map<string, boolean>>(new Map());
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [itemPriorities, setItemPriorities] = useState<Map<string, 'low' | 'medium' | 'high'>>(new Map());
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeItemId, setSwipeItemId] = useState<string | null>(null);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const queryClient = useQueryClient();

  // Checklist mutations
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistId, title }: { checklistId: string; title: string }) => {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update checklist");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingChecklistId(null);
      setEditingChecklistTitle("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, content, isCompleted }: { itemId: string; content?: string; isCompleted?: boolean }) => {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isCompleted }),
      });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingItemId(null);
      setEditingItemContent("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async ({ checklistId, content }: { checklistId: string; content: string }) => {
      console.log("Creating checklist item:", { checklistId, content });
      const response = await fetch("/api/checklist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId, content }),
      });
      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(`Failed to create item: ${errorData.error || response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setNewItemContent("");
      setShowAddItemForm(null);
    },
    onError: (error: Error) => {
      console.error("Create item mutation error:", error);
      toast.error(error.message);
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete checklist");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsDeleteChecklistOpen(false);
      setChecklistToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Get the current card data from query cache to stay in sync
  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: false, // Don't fetch, just subscribe to cache updates
  });

  // Sync local state with query cache updates
  useEffect(() => {
    if (boardData) {
      const updatedCard = boardData.lists
        ?.find((l: List) => l.id === list.id)
        ?.cards?.find((c: CardType) => c.id === card.id);
      
      if (updatedCard && updatedCard.isCompleted !== isCompleted) {
        setIsCompleted(updatedCard.isCompleted);
      }
    }
  }, [boardData, list.id, card.id, isCompleted]);

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

  // Check if user is watching this card
  const { data: watchStatus } = useQuery({
    queryKey: ["watch", card.id],
    queryFn: async () => {
      const response = await fetch(`/api/watch/check?cardId=${card.id}`);
      if (!response.ok) throw new Error("Failed to check watch status");
      return response.json();
    },
    enabled: isOpen,
  });

  // Update watch state when data changes
  useEffect(() => {
    if (watchStatus) {
      setIsWatching(watchStatus.isWatching);
    }
  }, [watchStatus]);


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
      // Just refetch to ensure server sync (cache already updated)
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card updated successfully!");
    },
    onError: (error: Error) => {
      // Revert the local state change on error
      setIsCompleted(card.isCompleted);
      
      // Revert the query cache to the original state
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          lists: oldData.lists.map((list: List) => ({
            ...list,
            cards: list.cards.map((c: CardType) => 
              c.id === card.id 
                ? { ...c, isCompleted: card.isCompleted }
                : c
            )
          }))
        };
      });
      
      toast.error(error.message);
    },
  });

  const updateCardContentMutation = useMutation({
    mutationFn: async (data: UpdateCardFormData) => {
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
    onSuccess: (data, variables) => {
      // Update the query cache immediately with the new data
      queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          lists: oldData.lists.map((list: List) => ({
            ...list,
            cards: list.cards.map((c: CardType) => 
              c.id === card.id 
                ? { ...c, title: variables.title, description: variables.description }
                : c
            )
          }))
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card updated successfully!");
      // Close the editing forms after successful update
      setIsEditingTitle(false);
      setIsEditingDescription(false);
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
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
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
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
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
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Comment deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Watch toggle mutation
  const watchToggleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/watch", {
        method: isWatching ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle watch");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsWatching(!isWatching);
      queryClient.invalidateQueries({ queryKey: ["watch", card.id] });
      toast.success(isWatching ? "Stopped watching card" : "Now watching card");
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
    updateCardContentMutation.mutate(data);
  };

  const handleDescriptionSave = (data: UpdateCardFormData) => {
    updateCardContentMutation.mutate(data);
  };

  const handleToggleComplete = () => {
    const newCompletedState = !isCompleted;
    
    // Trigger shooting stars animation when completing a card
    if (newCompletedState && !isCompleted) {
      setShowShootingStars(true);
    }
    
    // Update local state immediately for instant visual feedback
    setIsCompleted(newCompletedState);
    
    // Update the query cache immediately for instant UI updates
    queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        lists: oldData.lists.map((list: List) => ({
          ...list,
          cards: list.cards.map((c: CardType) => 
            c.id === card.id 
              ? { ...c, isCompleted: newCompletedState }
              : c
          )
        }))
      };
    });
    
    // Then update the database in the background
    updateCardMutation.mutate({ 
      title: card.title, 
      description: card.description || "", 
      isCompleted: newCompletedState 
    });
  };

  const handleWatchToggle = () => {
    if (isWatchLoading) return;
    setIsWatchLoading(true);
    watchToggleMutation.mutate();
  };

  // Checklist handlers
  const handleEditChecklist = (checklistId: string, title: string) => {
    setEditingChecklistId(checklistId);
    setEditingChecklistTitle(title);
  };

  const handleUpdateChecklist = (checklistId: string) => {
    if (editingChecklistTitle.trim()) {
      updateChecklistMutation.mutate({ checklistId, title: editingChecklistTitle.trim() });
    }
  };

  const handleEditItem = (itemId: string, content: string) => {
    setEditingItemId(itemId);
    setEditingItemContent(content);
  };

  const handleUpdateItem = (itemId: string) => {
    if (editingItemContent.trim()) {
      updateItemMutation.mutate({ itemId, content: editingItemContent.trim() });
    }
  };

  const handleToggleItem = (itemId: string, isCompleted: boolean) => {
    const newCompletedState = !isCompleted;
    
    // Show completion animation if item is being completed
    if (newCompletedState && !isCompleted) {
      setShowCompletionAnimation(itemId);
      setTimeout(() => setShowCompletionAnimation(null), 1000);
    }
    
    // Optimistic update - immediately update UI
    setOptimisticItemStates(prev => new Map(prev).set(itemId, newCompletedState));
    
    // Update the query cache immediately for instant UI updates
    queryClient.setQueryData(["board", boardId], (oldData: Board | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        lists: oldData.lists.map((list: List) => ({
          ...list,
          cards: list.cards.map((c: CardType) => 
            c.id === card.id 
              ? {
                  ...c,
                  checklists: c.checklists.map((checklist) => ({
                    ...checklist,
                    items: checklist.items.map((item) => 
                      item.id === itemId 
                        ? { ...item, isCompleted: newCompletedState }
                        : item
                    )
                  }))
                }
              : c
          )
        }))
      };
    });
    
    // Check if checklist is 100% complete for confetti
    const checklist = card.checklists?.find(c => c.items.some(item => item.id === itemId));
    if (checklist && newCompletedState) {
      const allCompleted = checklist.items.every(item => 
        item.id === itemId ? newCompletedState : item.isCompleted
      );
      if (allCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        toast.success("🎉 Checklist completed!");
      }
    }
    
    // Then update the database in the background
    updateItemMutation.mutate({ itemId, isCompleted: newCompletedState });
  };

  const handleCreateItem = (checklistId: string) => {
    if (newItemContent.trim()) {
      createItemMutation.mutate({ checklistId, content: newItemContent.trim() });
    }
  };

  // Mobile checklist title editing handlers
  const handleMobileEditChecklist = (checklistId: string, title: string) => {
    setMobileEditChecklistId(checklistId);
    setMobileEditTitle(title);
    setIsMobileEditTitleOpen(true);
  };

  const handleMobileUpdateChecklist = () => {
    if (mobileEditTitle.trim() && mobileEditChecklistId) {
      updateChecklistMutation.mutate({ 
        checklistId: mobileEditChecklistId, 
        title: mobileEditTitle.trim() 
      });
      setIsMobileEditTitleOpen(false);
      setMobileEditChecklistId(null);
      setMobileEditTitle("");
    }
  };

  const handleMobileCancelEdit = () => {
    setIsMobileEditTitleOpen(false);
    setMobileEditChecklistId(null);
    setMobileEditTitle("");
  };

  // Checklist deletion handlers
  const handleDeleteChecklist = (checklistId: string) => {
    setChecklistToDelete(checklistId);
    setIsDeleteChecklistOpen(true);
  };

  const confirmDeleteChecklist = () => {
    if (checklistToDelete) {
      deleteChecklistMutation.mutate(checklistToDelete);
    }
  };

  const handleCopyChecklist = (checklist: Checklist) => {
    setChecklistToCopy(checklist);
    setIsCopyChecklistOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      // Store item for potential undo
      const itemToDelete = card.checklists
        ?.flatMap(checklist => checklist.items)
        .find(item => item.id === itemId);
      
      deleteItemMutation.mutate(itemId);
      
      // Show undo toast
      toast.success("Item deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            if (itemToDelete) {
              // Restore item logic would go here
              toast.info("Undo functionality coming soon");
            }
          }
        }
      });
    }
  };

  // Hide/show checked items
  const handleToggleHideChecked = (checklistId: string) => {
    setHiddenChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };

  // Toggle checklist expansion
  const handleToggleExpand = (checklistId: string) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };

  // Bulk actions
  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    const itemIds = Array.from(selectedItems);
    itemIds.forEach(itemId => {
      deleteItemMutation.mutate(itemId);
    });
    setSelectedItems(new Set());
    setBulkMode(false);
    toast.success(`Deleted ${itemIds.length} item(s)`);
  };

  const handleBulkComplete = () => {
    if (selectedItems.size === 0) return;
    
    const itemIds = Array.from(selectedItems);
    itemIds.forEach(itemId => {
      // Find the current completion state and toggle it
      const item = card.checklists
        ?.flatMap(checklist => checklist.items)
        .find(item => item.id === itemId);
      if (item) {
        handleToggleItem(itemId, item.isCompleted);
      }
    });
    setSelectedItems(new Set());
    setBulkMode(false);
    toast.success(`Completed ${itemIds.length} item(s)`);
  };

  // Priority system
  const handleSetPriority = (itemId: string, priority: 'low' | 'medium' | 'high') => {
    setItemPriorities(prev => new Map(prev).set(itemId, priority));
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default: return '';
    }
  };

  // Swipe actions for mobile
  const handleSwipeStart = (e: React.TouchEvent, itemId: string) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeItemId(itemId);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!swipeStartX || !swipeItemId) return;
    
    const swipeEndX = e.changedTouches[0].clientX;
    const swipeDistance = swipeEndX - swipeStartX;
    const swipeThreshold = 50;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe right - complete item
        const item = card.checklists
          ?.flatMap(checklist => checklist.items)
          .find(item => item.id === swipeItemId);
        if (item) {
          handleToggleItem(swipeItemId, item.isCompleted);
          toast.success("Item completed");
        }
      } else {
        // Swipe left - delete item
        handleDeleteItem(swipeItemId);
      }
    }
    
    setSwipeStartX(null);
    setSwipeItemId(null);
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
      case 'watch':
        handleWatchToggle();
        break;
    }
  };


  return (
    <>
      <Dialog open={isOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-8px)] sm:max-w-[65rem] h-[85vh] max-h-[85vh] p-0 overflow-hidden gap-0 rounded-lg shadow-2xl border-0 bg-white dark:bg-slate-900 flex flex-col">
          {/* Header */}
          <DialogHeader>
            <DialogTitle>
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-lg">
            <div className="flex items-center gap-2 md:gap-3">
              <Badge variant="secondary" className="text-xs md:text-sm font-medium px-2 md:px-3 py-1 bg-slate-100 dark:bg-slate-700 text-strong dark:text-slate-300 border-slate-200 dark:border-slate-600">
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
              {/* Watch indicator */}
              {isWatching && (
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 border-none hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <HoverHint label="Actions" side="top">
                    <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400" />
                    </HoverHint>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleMenuAction('watch')} className={isWatching ? "text-blue-600 dark:text-blue-400" : ""}>
                    {isWatching ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {isWatching ? "Stop Watching" : "Watch"}
                  </DropdownMenuItem>
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
          <div className="min-h-0 flex-1 bg-white dark:bg-[#0D1117] flex flex-col">
            {/* Mobile: Tabbed Layout */}
            <div className="md:hidden flex flex-col flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <TabsTrigger value="details" className="text-sm">Details</TabsTrigger>
                  <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="p-4 space-y-6 flex-1 overflow-y-auto min-h-0 max-h-[70vh]">
                  {/* Card Title with Check Radio */}
                  <div className="flex items-start gap-3">
                    <div 
                      className={`relative w-5 h-5 border-2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 mt-0.5 ${
                        isCompleted 
                          ? 'bg-teal-600 border-teal-600 hover:bg-teal-700 hover:border-teal-700' 
                          : 'border-slate-300 dark:border-slate-600 hover:border-teal-600 dark:hover:border-teal-600'
                      }`}
                      onClick={handleToggleComplete}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 15,
                            duration: 0.3 
                          }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      ) : null}
                      <ShootingStars 
                        isActive={showShootingStars} 
                        onComplete={() => setShowShootingStars(false)} 
                      />
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
                        <Button 
                          type="submit" 
                          size="sm" 
                          disabled={updateCardContentMutation.isPending}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-3 py-1 h-7"
                        >
                          {updateCardContentMutation.isPending ? "Saving..." : "Save"}
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
                  <div className="flex items-center gap-2">
                    <h1 
                      className="text-lg font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 -m-2 rounded-lg transition-all duration-200 flex-1 text-slate-900 dark:text-white"
                      onClick={handleTitleEdit}
                    >
                      {card.title}
                    </h1>
                  </div>
                )}
              </div>

              {/* Action Buttons - Trello Style */}
              <div className="flex flex-wrap gap-2">
                <DueDateDropdown
                  card={card}
                  boardId={boardId}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Members
                </Button>
                <LabelDropdown
                  card={card}
                  boardId={boardId}
                />
                <ChecklistDropdown
                  cardId={card.id}
                  boardId={boardId}
                  existingChecklists={card.checklists || []}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attachment
                </Button>
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
                                rows={4} 
                                placeholder="Add a description..." 
                                className="border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 bg-slate-50 dark:bg-slate-800 rounded-lg resize-none"
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
                          disabled={updateCardContentMutation.isPending}
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {updateCardContentMutation.isPending ? "Saving..." : "Save"}
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
                      <p className="text-sm whitespace-pre-wrap text-strong dark:text-slate-300 leading-relaxed">{card.description}</p>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">Click to add a description...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date Display */}
              {card.dueDate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Due Date</h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {new Date(card.dueDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {card.startDate && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Started: {new Date(card.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                    {card.isRecurring && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <RotateCcw className="w-3 h-3" />
                        {card.recurringType}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checklists */}
              {card.checklists && card.checklists.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Checklists</h3>
                  <div className="space-y-3">
                    {card.checklists.map((checklist) => {
                      const completedItems = checklist.items.filter(item => {
                        const optimisticState = optimisticItemStates.get(item.id);
                        return optimisticState !== undefined ? optimisticState : item.isCompleted;
                      }).length;
                      const totalItems = checklist.items.length;
                      const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                      const isHidden = hiddenChecklists.has(checklist.id);
                      const visibleItems = isHidden 
                        ? checklist.items.filter(item => {
                            const optimisticState = optimisticItemStates.get(item.id);
                            const isCompleted = optimisticState !== undefined ? optimisticState : item.isCompleted;
                            return !isCompleted;
                          })
                        : checklist.items;
                      
                      return (
                        <div key={checklist.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <SquareCheckBig className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              {editingChecklistId === checklist.id ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 min-w-0">
                                  <Input
                                    value={editingChecklistTitle}
                                    onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleUpdateChecklist(checklist.id)}
                                    onBlur={() => handleUpdateChecklist(checklist.id)}
                                    className="flex-1 h-10 text-sm min-w-0 w-full sm:w-auto"
                                    autoFocus
                                    placeholder="Enter checklist title..."
                                  />
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateChecklist(checklist.id)}
                                      disabled={updateChecklistMutation.isPending}
                                      className="h-10 rounded-sm flex-1 sm:flex-none"
                                    >
                                      {updateChecklistMutation.isPending ? (
                                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingChecklistId(null);
                                        setEditingChecklistTitle("");
                                      }}
                                      className="h-10 rounded-sm flex-1 sm:flex-none"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <h4 
                                    className="font-medium text-slate-900 dark:text-white text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded"
                                    onClick={() => {
                                      // Use mobile popup on small screens, inline on larger screens
                                      if (window.innerWidth < 640) {
                                        handleMobileEditChecklist(checklist.id, checklist.title);
                                      } else {
                                        handleEditChecklist(checklist.id, checklist.title);
                                      }
                                    }}
                                  >
                                    {checklist.title}
                                  </h4>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {completedItems}/{totalItems} ({Math.round(progress)}%)
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                  >
                                    <MoreHorizontal className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setBulkMode(!bulkMode)}>
                                    {bulkMode ? "Exit Bulk Mode" : "Bulk Actions"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleHideChecked(checklist.id)}>
                                    {isHidden ? `Show checked items (${completedItems})` : `Hide checked items (${completedItems})`}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyChecklist(checklist)}>
                                    Copy Checklist
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteChecklist(checklist.id)}
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2 relative">
                            {/* Progress milestones */}
                            <div className="absolute inset-0 flex justify-between items-center">
                              <div className={`w-1 h-1 rounded-full ${progress >= 25 ? 'bg-white' : 'bg-slate-400'}`} />
                              <div className={`w-1 h-1 rounded-full ${progress >= 50 ? 'bg-white' : 'bg-slate-400'}`} />
                              <div className={`w-1 h-1 rounded-full ${progress >= 75 ? 'bg-white' : 'bg-slate-400'}`} />
                              <div className={`w-1 h-1 rounded-full ${progress >= 100 ? 'bg-white' : 'bg-slate-400'}`} />
                            </div>
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress === 0 
                                  ? 'bg-slate-400 dark:bg-slate-600' 
                                  : progress < 25 
                                  ? 'bg-red-500' 
                                  : progress < 50 
                                  ? 'bg-orange-500' 
                                  : progress < 75 
                                  ? 'bg-yellow-500' 
                                  : progress < 100 
                                  ? 'bg-blue-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                            {/* Milestone celebration */}
                            {progress === 100 && (
                              <motion.div
                                className="absolute -top-1 -right-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                              >
                                <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              </motion.div>
                            )}
                          </div>
                          <div className="space-y-1 relative">
                            {showConfetti && (
                              <div className="absolute inset-0 pointer-events-none z-10">
                                <ShootingStars isActive={true} onComplete={() => setShowConfetti(false)} />
                              </div>
                            )}
                            {visibleItems.length === 0 && isHidden && completedItems > 0 ? (
                              <div className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">
                                Everything in this checklist is complete
                              </div>
                            ) : (
                              <ChecklistItemDndProvider 
                                checklistId={checklist.id} 
                                boardId={boardId} 
                                items={visibleItems}
                              >
                                {visibleItems.slice(0, expandedChecklists.has(checklist.id) ? visibleItems.length : 3).map((item) => {
                                  const actualIndex = visibleItems.findIndex(visibleItem => visibleItem.id === item.id);
                                const optimisticState = optimisticItemStates.get(item.id);
                                const isCompleted = optimisticState !== undefined ? optimisticState : item.isCompleted;
                                
                                const priority = itemPriorities.get(item.id) || 'medium';
                                
                                return (
                                  <DraggableChecklistItem key={item.id} item={item} index={actualIndex}>
                                    <div 
                                      className={`flex items-center gap-2 text-xs border-l-4 ${getPriorityColor(priority)} bg-slate-50 dark:bg-slate-800 rounded p-1`}
                                      onTouchStart={(e) => handleSwipeStart(e, item.id)}
                                      onTouchEnd={handleSwipeEnd}
                                    >
                                  {bulkMode && (
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.has(item.id)}
                                      onChange={() => handleToggleItemSelection(item.id)}
                                      className="w-3 h-3 rounded border-slate-300"
                                    />
                                  )}
                                  {editingItemId === item.id ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full min-w-0">
                                      <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button
                                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                            isCompleted 
                                              ? 'bg-teal-600 border-teal-600' 
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                          onClick={() => handleToggleItem(item.id, isCompleted)}
                                        >
                                          <AnimatePresence>
                                            {isCompleted && (
                                              <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                exit={{ scale: 0, rotate: 180 }}
                                                transition={{ 
                                                  type: "spring", 
                                                  stiffness: 500, 
                                                  damping: 15,
                                                  duration: 0.3 
                                                }}
                                              >
                                                <Check className="w-3 h-3 text-white" />
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                          {showCompletionAnimation === item.id && (
                                            <motion.div
                                              className="absolute inset-0 bg-teal-600 rounded-full"
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1.5, opacity: 0 }}
                                              transition={{ duration: 0.6 }}
                                            />
                                          )}
                                        </button>
                                        <Input
                                          value={editingItemContent}
                                          onChange={(e) => setEditingItemContent(e.target.value)}
                                          onKeyPress={(e) => e.key === "Enter" && handleUpdateItem(item.id)}
                                          onBlur={() => handleUpdateItem(item.id)}
                                          className="flex-1 h-8 text-sm min-w-0"
                                          autoFocus
                                          placeholder="Enter item content..."
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateItem(item.id)}
                                          disabled={updateItemMutation.isPending}
                                          className="h-8 rounded-sm flex-1 sm:flex-none"
                                        >
                                          {updateItemMutation.isPending ? (
                                            <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                          ) : (
                                            <Check className="w-3 h-3" />
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingItemId(null);
                                            setEditingItemContent("");
                                          }}
                                          className="h-8 rounded-sm flex-1 sm:flex-none"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
                                          isCompleted 
                                            ? 'bg-teal-600 border-teal-600' 
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                        onClick={() => handleToggleItem(item.id, isCompleted)}
                                      >
                                        {isCompleted && <Check className="w-3 h-3 text-white" />}
                                      </button>
                                      <span 
                                        className={`flex-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                                        onClick={() => handleEditItem(item.id, item.content)}
                                      >
                                        {item.content}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {/* Priority selector */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                              <div className={`w-2 h-2 rounded-full ${
                                                priority === 'high' ? 'bg-red-500' : 
                                                priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                              }`} />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'high')}>
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                High Priority
                                              </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'medium')}>
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                Medium Priority
                                              </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'low')}>
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                Low Priority
                                              </div>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        
                                        <HoverHint label="Delete item" side="top">
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </HoverHint>
                                      </div>
                                    </>
                                  )}
                                
                                    </div>
                                  </DraggableChecklistItem>
                                );
                                })}
                              </ChecklistItemDndProvider>
                            )}
                            {visibleItems.length > 3 && !expandedChecklists.has(checklist.id) && (
                              <button
                                onClick={() => handleToggleExpand(checklist.id)}
                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                              >
                                +{visibleItems.length - 3} more items
                              </button>
                            )}
                            {visibleItems.length > 3 && expandedChecklists.has(checklist.id) && (
                              <button
                                onClick={() => handleToggleExpand(checklist.id)}
                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                          {/* Bulk Actions Bar */}
                          {bulkMode && selectedItems.size > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {selectedItems.size} selected
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleBulkComplete}
                                className="h-6 px-2 text-xs"
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleBulkDelete}
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedItems(new Set())}
                                className="h-6 px-2 text-xs"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                          {showAddItemForm === checklist.id ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                              <Input
                                value={newItemContent}
                                onChange={(e) => setNewItemContent(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleCreateItem(checklist.id)}
                                placeholder="Add an item..."
                                className="flex-1 h-10 text-sm w-full sm:w-auto"
                                autoFocus
                              />
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                  onClick={() => handleCreateItem(checklist.id)}
                                  disabled={createItemMutation.isPending || !newItemContent.trim()}
                                  className="bg-teal-600 hover:bg-teal-700 h-10 rounded-sm flex-1 sm:flex-none"
                                >
                                  {createItemMutation.isPending ? (
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowAddItemForm(null);
                                    setNewItemContent("");
                                  }}
                                  className="h-10 rounded-sm flex-1 sm:flex-none"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 h-8 text-xs"
                              onClick={() => setShowAddItemForm(checklist.id)}
                            >
                              Add an item
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                
                <TabsContent value="activity" className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
                  {/* Comments Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Comments and activity</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                      className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {showDetails ? "Hide details" : "Show details"}
                    </Button>
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
                                  className="border-2 border-slate-300 dark:border-slate-700 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-900 rounded-lg resize-none text-sm"
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
                  <div className="space-y-3 pb-4">
                    {/* Comments Section */}
                    {card.comments.length > 0 && (
                      <div className="space-y-2">
                        {card.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 items-start border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <ConditionalUserProfile user={comment.user as UserWithAvatar} size="sm" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
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
                                      className="h-5 w-5 p-0 hover:bg-slate-100 dark:hover:bg-slate-600"
                                    >
                                      <MoreVertical className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-28">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditComment(comment.id, comment.content)}
                                      className="text-strong dark:text-slate-300 text-xs"
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
                                <p className="text-sm text-strong dark:text-slate-300 leading-relaxed">
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
                      <div className="flex items-center gap-1 text-sm font-medium text-strong dark:text-slate-300 mb-2">
                        <Clock className="w-3 h-3" />
                        Recent Activity
                      </div>
                      <div className="space-y-1">
                        {activitiesLoading ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">Loading activities...</div>
                        ) : activities && activities.length > 0 ? (
                          activities.map((activity: { id: string; message: string; user: { name?: string; email: string; avatarUrl?: string }; createdAt: string }) => (
                            <div key={activity.id} className="flex items-start gap-2">
                              <ConditionalUserProfile user={activity.user} size="sm" />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium text-strong dark:text-slate-300">
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
              <div className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-thin bg-slate-50 dark:bg-slate-900 min-h-0">
                {/* Card Title with Check Radio */}
                <div className="flex items-start gap-4">
                  <div 
                    className={`relative w-6 h-6 border-2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 mt-0.5 ${
                      isCompleted 
                        ? 'bg-teal-600 border-teal-600 hover:bg-teal-700 hover:border-teal-700' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-teal-600 dark:hover:border-teal-600'
                    }`}
                    onClick={handleToggleComplete}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 15,
                          duration: 0.3 
                        }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    ) : null}
                    <ShootingStars 
                      isActive={showShootingStars} 
                      onComplete={() => setShowShootingStars(false)} 
                    />
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
                          <Button 
                            type="submit" 
                            size="sm" 
                            disabled={updateCardContentMutation.isPending}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            {updateCardContentMutation.isPending ? "Saving..." : "Save"}
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

                {/* Action Buttons - Trello Style */}
                <div className="flex flex-wrap gap-3">
                  <DueDateDropdown
                    card={card}
                    boardId={boardId}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                  <LabelDropdown
                    card={card}
                    boardId={boardId}
                  />
                  <ChecklistDropdown
                    cardId={card.id}
                    boardId={boardId}
                    existingChecklists={card.checklists || []}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attachment
                  </Button>
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
                                  rows={4} 
                                  placeholder="Add a description..." 
                                  className="border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg resize-none"
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
                            disabled={updateCardContentMutation.isPending}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            {updateCardContentMutation.isPending ? "Saving..." : "Save"}
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
                        <p className="text-sm whitespace-pre-wrap text-strong dark:text-slate-300 leading-relaxed">{card.description}</p>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Click to add a description...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date Display */}
                {card.dueDate && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Due Date</h3>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {new Date(card.dueDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        {card.startDate && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Started: {new Date(card.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                      {card.isRecurring && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <RotateCcw className="w-3 h-3" />
                          {card.recurringType}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Checklists */}
                {card.checklists && card.checklists.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Checklists</h3>
                    <div className="space-y-4">
                      {card.checklists.map((checklist) => {
                        const completedItems = checklist.items.filter(item => {
                          const optimisticState = optimisticItemStates.get(item.id);
                          return optimisticState !== undefined ? optimisticState : item.isCompleted;
                        }).length;
                        const totalItems = checklist.items.length;
                        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                        const isHidden = hiddenChecklists.has(checklist.id);
                        const visibleItems = isHidden 
                          ? checklist.items.filter(item => {
                              const optimisticState = optimisticItemStates.get(item.id);
                              const isCompleted = optimisticState !== undefined ? optimisticState : item.isCompleted;
                              return !isCompleted;
                            })
                          : checklist.items;
                        
                        return (
                          <div key={checklist.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <SquareCheckBig className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                {editingChecklistId === checklist.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      value={editingChecklistTitle}
                                      onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                      onKeyPress={(e) => e.key === "Enter" && handleUpdateChecklist(checklist.id)}
                                      onBlur={() => handleUpdateChecklist(checklist.id)}
                                      className="flex-1 h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateChecklist(checklist.id)}
                                      disabled={updateChecklistMutation.isPending}
                                      className="h-8 rounded-sm"
                                    >
                                      {updateChecklistMutation.isPending ? (
                                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingChecklistId(null);
                                        setEditingChecklistTitle("");
                                      }}
                                      className="h-8 rounded-sm"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-1">
                                    <h4 
                                      className="font-medium text-slate-900 dark:text-white text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded"
                                      onClick={() => {
                                        // Use mobile popup on small screens, inline on larger screens
                                        if (window.innerWidth < 640) {
                                          handleMobileEditChecklist(checklist.id, checklist.title);
                                        } else {
                                          handleEditChecklist(checklist.id, checklist.title);
                                        }
                                      }}
                                    >
                                      {checklist.title}
                                    </h4>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {completedItems}/{totalItems} ({Math.round(progress)}%)
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setBulkMode(!bulkMode)}>
                                      {bulkMode ? "Exit Bulk Mode" : "Bulk Actions"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleHideChecked(checklist.id)}>
                                      {isHidden ? `Show checked items (${completedItems})` : `Hide checked items (${completedItems})`}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyChecklist(checklist)}>
                                      Copy Checklist
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteChecklist(checklist.id)}
                                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress === 0 
                                    ? 'bg-slate-400 dark:bg-slate-600' 
                                    : progress < 25 
                                    ? 'bg-red-500' 
                                    : progress < 50 
                                    ? 'bg-orange-500' 
                                    : progress < 75 
                                    ? 'bg-yellow-500' 
                                    : progress < 100 
                                    ? 'bg-blue-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="space-y-2">
                              {visibleItems.length === 0 && isHidden && completedItems > 0 ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-2">
                                  Everything in this checklist is complete
                                </div>
                              ) : (
                                <ChecklistItemDndProvider 
                                  checklistId={checklist.id} 
                                  boardId={boardId} 
                                  items={visibleItems}
                                >
                                  {visibleItems.slice(0, expandedChecklists.has(checklist.id) ? visibleItems.length : 5).map((item) => {
                                  const actualIndex = visibleItems.findIndex(visibleItem => visibleItem.id === item.id);
                                  const optimisticState = optimisticItemStates.get(item.id);
                                  const isCompleted = optimisticState !== undefined ? optimisticState : item.isCompleted;
                                  
                                  const priority = itemPriorities.get(item.id) || 'medium';
                                  
                                  return (
                                    <DraggableChecklistItem key={item.id} item={item} index={actualIndex}>
                                      <div className={`flex items-center gap-3 text-sm border-l-4 ${getPriorityColor(priority)} bg-slate-50 dark:bg-slate-800 rounded p-1`}>
                                    {editingItemId === item.id ? (
                                      <div className="flex items-center gap-2 w-full">
                                        <button
                                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                            isCompleted 
                                              ? 'bg-teal-600 border-teal-600' 
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                          onClick={() => handleToggleItem(item.id, isCompleted)}
                                        >
                                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                        <Input
                                          value={editingItemContent}
                                          onChange={(e) => setEditingItemContent(e.target.value)}
                                          onKeyPress={(e) => e.key === "Enter" && handleUpdateItem(item.id)}
                                          onBlur={() => handleUpdateItem(item.id)}
                                          className="flex-1 h-6 text-sm"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateItem(item.id)}
                                          disabled={updateItemMutation.isPending}
                                          className="h-6 rounded-sm"
                                        >
                                          {updateItemMutation.isPending ? (
                                            <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                          ) : (
                                            <Check className="w-3 h-3" />
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingItemId(null);
                                            setEditingItemContent("");
                                          }}
                                          className="h-6 rounded-sm"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        {bulkMode && (
                                          <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.id)}
                                            onChange={() => handleToggleItemSelection(item.id)}
                                            className="w-4 h-4 rounded border-slate-300"
                                          />
                                        )}
                                        <button
                                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                            isCompleted 
                                              ? 'bg-teal-600 border-teal-600' 
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                          onClick={() => handleToggleItem(item.id, isCompleted)}
                                        >
                                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                        <span 
                                          className={`flex-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                                          onClick={() => handleEditItem(item.id, item.content)}
                                        >
                                          {item.content}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {/* Priority selector */}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                <div className={`w-2 h-2 rounded-full ${
                                                  priority === 'high' ? 'bg-red-500' : 
                                                  priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`} />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'high')}>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                                  High Priority
                                                </div>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'medium')}>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                  Medium Priority
                                                </div>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleSetPriority(item.id, 'low')}>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                                  Low Priority
                                                </div>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                          
                                          <HoverHint label="Delete item" side="top">
                                            <button
                                              onClick={() => handleDeleteItem(item.id)}
                                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </HoverHint>
                                        </div>
                                      </>
                                    )}
                                      </div>
                                    </DraggableChecklistItem>
                                  );
                                  })}
                                </ChecklistItemDndProvider>
                              )}
                              {/* Bulk Actions Bar */}
                              {bulkMode && selectedItems.size > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {selectedItems.size} selected
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkComplete}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkDelete}
                                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedItems(new Set())}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Clear
                                  </Button>
                                </div>
                              )}
                              {visibleItems.length > 5 && !expandedChecklists.has(checklist.id) && (
                                <button
                                  onClick={() => handleToggleExpand(checklist.id)}
                                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                >
                                  +{visibleItems.length - 5} more items
                                </button>
                              )}
                              {visibleItems.length > 5 && expandedChecklists.has(checklist.id) && (
                                <button
                                  onClick={() => handleToggleExpand(checklist.id)}
                                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                            {showAddItemForm === checklist.id ? (
                              <div className="flex items-center gap-2 mt-3">
                                <Input
                                  value={newItemContent}
                                  onChange={(e) => setNewItemContent(e.target.value)}
                                  onKeyPress={(e) => e.key === "Enter" && handleCreateItem(checklist.id)}
                                  placeholder="Add an item..."
                                  className="flex-1 h-8 text-sm"
                                  autoFocus
                                />
                                <Button
                                  onClick={() => handleCreateItem(checklist.id)}
                                  disabled={createItemMutation.isPending || !newItemContent.trim()}
                                  className="bg-teal-600 hover:bg-teal-700 h-8 rounded-sm"
                                >
                                  {createItemMutation.isPending ? (
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowAddItemForm(null);
                                    setNewItemContent("");
                                  }}
                                  className="h-8 rounded-sm"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3 h-8 text-xs"
                                onClick={() => setShowAddItemForm(checklist.id)}
                              >
                                Add an item
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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


            {/* Right Column */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto scrollbar-thin border-l border-slate-400 dark:border-slate-800 bg-slate-200 dark:bg-[#0D1117]">
              {/* Comments Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
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
                  {showDetails ? "Hide details" : "Show details"}
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
                              className="border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-900 rounded-lg resize-none"
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
                        className="bg-teal-600 hover:bg-teal-700 text-white"
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
                <div className="space-y-4">
                  {/* Comments Section */}
                  {card.comments.length > 0 && (
                    <div className="space-y-3">
                    {(showDetails ? card.comments : card.comments.slice(0, 5)).map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 border items-start border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900">
                          <ConditionalUserProfile user={comment.user as UserWithAvatar} size="md" />
                          <div className="flex-1">
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
                                    className="text-strong dark:text-slate-300"
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
                                  className="text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                              <p className="text-sm text-strong dark:text-slate-300 leading-relaxed">
                                {comment.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                )}

                {/* Show more comments indicator when details are hidden */}
                {!showDetails && card.comments.length > 5 && (
                  <div className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(true)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      Show {card.comments.length - 5} more comments
                    </Button>
                    </div>
                  )}

                  {/* Activities Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-strong dark:text-slate-300">
                      <Clock className="w-4 h-4" />
                      Recent Activity
                    </div>
                    <div className="space-y-2">
                      {activitiesLoading ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading activities...</div>
                      ) : activities && activities.length > 0 ? (
                        (showDetails ? activities : activities.slice(0, 1)).map((activity: { id: string; message: string; user: { name?: string; email: string; avatarUrl?: string }; createdAt: string }) => (
                          <div key={activity.id} className="flex gap-3 items-center">
                            <ConditionalUserProfile user={activity.user} size="md" />
                            <div className="flex-1 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-strong dark:text-slate-300">
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
                      {/* Show more activities indicator when details are hidden */}
                      {!showDetails && activities && activities.length > 1 && (
                        <div className="text-center py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDetails(true)}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            Show {activities.length - 1} more activities
                          </Button>
                        </div>
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



      {/* Copy Checklist Modal */}
      {checklistToCopy && (
        <CopyChecklistModal
          isOpen={isCopyChecklistOpen}
          onClose={() => {
            setIsCopyChecklistOpen(false);
            setChecklistToCopy(null);
          }}
          checklist={checklistToCopy}
          cardId={card.id}
          boardId={boardId}
        />
      )}

      {/* Mobile Checklist Title Edit Popup */}
      <Dialog open={isMobileEditTitleOpen} onOpenChange={setIsMobileEditTitleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Checklist Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={mobileEditTitle}
                onChange={(e) => setMobileEditTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleMobileUpdateChecklist()}
                placeholder="Enter checklist title..."
                className="w-full h-10 text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleMobileCancelEdit}
                className="h-10 rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMobileUpdateChecklist}
                disabled={updateChecklistMutation.isPending || !mobileEditTitle.trim()}
                className="h-10 rounded-sm"
              >
                {updateChecklistMutation.isPending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Checklist Confirmation Modal */}
      <Dialog open={isDeleteChecklistOpen} onOpenChange={setIsDeleteChecklistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this checklist? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteChecklistOpen(false)}
                className="h-10 rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteChecklist}
                disabled={deleteChecklistMutation.isPending}
                className="h-10 rounded-sm bg-slate-600 hover:bg-slate-700"
              >
                {deleteChecklistMutation.isPending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}