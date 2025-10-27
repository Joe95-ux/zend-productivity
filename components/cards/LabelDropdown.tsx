"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Plus, Palette } from "lucide-react";
import { toast } from "sonner";

interface LabelDropdownProps {
  card: {
    id: string;
    title: string;
    labels: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  boardId: string;
}

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

export function LabelDropdown({ card, boardId }: LabelDropdownProps) {
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available labels for this board
  const { data: availableLabels = [] } = useQuery({
    queryKey: ["labels", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/labels?boardId=${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch labels");
      return response.json();
    },
    enabled: isOpen,
  });

  const createLabelMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, cardId: card.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create label");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      toast.success("Label created and assigned successfully!");
      setNewLabelName("");
      setNewLabelColor(LABEL_COLORS[0].value);
      setIsCreatingNew(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assignLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign label");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Label assigned successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await fetch(`/api/cards/${card.id}/labels?labelId=${labelId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove label");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Label removed successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = useCallback(() => {
    setNewLabelName("");
    setNewLabelColor(LABEL_COLORS[0].value);
    setIsCreatingNew(false);
    setIsOpen(false);
  }, []);

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }

    createLabelMutation.mutate({
      name: newLabelName.trim(),
      color: newLabelColor,
    });
  };

  const handleAssignLabel = (labelId: string) => {
    assignLabelMutation.mutate(labelId);
  };

  const handleRemoveLabel = (labelId: string) => {
    removeLabelMutation.mutate(labelId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateLabel();
    }
  };

  const getDisplayText = () => {
    if (card.labels.length > 0) {
      return `${card.labels.length} Label${card.labels.length > 1 ? 's' : ''}`;
    }
    return "Labels";
  };

  // Filter out labels that are already assigned to this card
  const unassignedLabels = availableLabels.filter(
    (label: any) => !card.labels.some(cardLabel => cardLabel.id === label.id)
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
        >
          <Tag className="w-4 h-4 mr-2" />
          {getDisplayText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Labels
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Current Labels */}
          {card.labels.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Current Labels
              </Label>
              <div className="flex flex-wrap gap-2">
                {card.labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: label.color }}
                      className="px-2 py-1 text-xs font-medium rounded-full border-0 text-white shadow-sm"
                    >
                      {label.name}
                    </Badge>
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors"
                    >
                      <X className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Labels */}
          {unassignedLabels.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Available Labels
              </Label>
              <div className="flex flex-wrap gap-2">
                {unassignedLabels.map((label: any) => (
                  <button
                    key={label.id}
                    onClick={() => handleAssignLabel(label.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {label.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Label */}
          {!isCreatingNew ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingNew(true)}
              className="w-full h-8 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Label
            </Button>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Label Name
                </Label>
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Enter label name..."
                  className="w-full h-8 text-sm"
                  autoFocus
                  onKeyPress={handleKeyPress}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewLabelColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newLabelColor === color.value
                          ? "border-slate-900 dark:border-white scale-110"
                          : "border-slate-300 dark:border-slate-600 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateLabel}
                  disabled={createLabelMutation.isPending || !newLabelName.trim()}
                  size="sm"
                  className="flex-1 bg-teal-700 hover:bg-teal-900 text-slate-100"
                >
                  {createLabelMutation.isPending ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  ) : null}
                  {createLabelMutation.isPending ? "Creating..." : "Create"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
