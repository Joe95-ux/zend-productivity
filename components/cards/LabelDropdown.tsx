"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Plus, Palette, Edit } from "lucide-react";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";
import { Card } from "@/lib/types";

type CardModalCard = Omit<Card, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
  isCompleted: boolean;
};

interface LabelDropdownProps {
  card: CardModalCard;
  boardId: string;
  trigger?: React.ReactNode;
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

export function LabelDropdown({ card, boardId, trigger }: LabelDropdownProps) {
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);
  const [customColor, setCustomColor] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("");
  const [editCustomColor, setEditCustomColor] = useState("");
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
        body: JSON.stringify({ name, color, boardId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create label");
      }

      return response.json();
    },
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      // Auto-assign newly created board label to current card
      try {
        await assignLabelMutation.mutateAsync(created.id);
      } catch {}
      toast.success("Label created successfully!");
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

  const updateLabelMutation = useMutation({
    mutationFn: async ({ labelId, name, color }: { labelId: string; name: string; color: string }) => {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update label");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      toast.success("Label updated successfully!");
      setEditingLabel(null);
      setEditLabelName("");
      setEditLabelColor("");
      setEditCustomColor("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteBoardLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete label");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      toast.success("Label deleted");
      setEditingLabel(null);
      setEditLabelName("");
      setEditLabelColor("");
      setEditCustomColor("");
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
    setCustomColor("");
    setEditingLabel(null);
    setEditLabelName("");
    setEditLabelColor("");
    setEditCustomColor("");
    setIsCreatingNew(false);
    setIsOpen(false);
  }, []);

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }

    // Use custom color if provided, otherwise use selected predefined color
    const colorToUse = customColor.trim() || newLabelColor;

    createLabelMutation.mutate({
      name: newLabelName.trim(),
      color: colorToUse,
    });
  };

  const handleAssignLabel = (labelId: string) => {
    assignLabelMutation.mutate(labelId);
  };

  const handleEditLabel = (label: { id: string; name: string; color: string }) => {
    setEditingLabel(label);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
    setEditCustomColor("");
  };

  const handleUpdateLabel = () => {
    if (!editingLabel || !editLabelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }

    const colorToUse = editCustomColor.trim() || editLabelColor;
    updateLabelMutation.mutate({
      labelId: editingLabel.id,
      name: editLabelName.trim(),
      color: colorToUse,
    });
  };

  const handleRemoveLabel = (labelId: string) => {
    removeLabelMutation.mutate(labelId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingLabel) {
        handleUpdateLabel();
      } else {
        handleCreateLabel();
      }
    }
  };

  const getDisplayText = () => {
    if (card.labels.length > 0) {
      return `${card.labels.length} Label${card.labels.length > 1 ? 's' : ''}`;
    }
    return "Labels";
  };

  const isChecked = (boardLabelId: string) =>
    card.labels.some((l) => l.boardLabelId === boardLabelId);

  const toggleLabel = (boardLabelId: string, checked: boolean) => {
    if (checked) {
      assignLabelMutation.mutate(boardLabelId);
    } else {
      removeLabelMutation.mutate(boardLabelId);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
          >
            <Tag className="w-4 h-4 mr-2" />
            {getDisplayText()}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0 dark:bg-[#0D1117] max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
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
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {/* Board Labels with checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Labels
            </Label>
            <div className="flex flex-col gap-2">
              {availableLabels.map((label: { id: string; name: string; color: string }) => {
                const checked = isChecked(label.id);
                return (
                  <label key={label.id} className="flex items-center justify-between gap-3 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={checked}
                        onChange={(e) => toggleLabel(label.id, e.target.checked)}
                      />
                      <div className="w-10 h-3 rounded-sm" style={{ backgroundColor: label.color }} />
                      <span className="text-sm text-slate-800 dark:text-slate-200">{label.name}</span>
                    </div>
                    <button
                      onClick={() => handleEditLabel({ id: label.id, name: label.name, color: label.color })}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors"
                      title="Edit label"
                      type="button"
                    >
                      <Edit className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Edit Label Form */}
          {editingLabel && (
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Edit Label Name
                </Label>
                <Input
                  value={editLabelName}
                  onChange={(e) => setEditLabelName(e.target.value)}
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
                      onClick={() => {
                        setEditLabelColor(color.value);
                        setEditCustomColor(""); // Clear custom color when selecting predefined
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editLabelColor === color.value && !editCustomColor
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
                    <Label className="text-xs text-slate-600 dark:text-slate-400">
                      Or choose custom color:
                    </Label>
                    {!editCustomColor && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCustomColor(editLabelColor)}
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
                        style={{ backgroundColor: editCustomColor || editLabelColor }}
                        onClick={() => {
                          if (!editCustomColor) {
                            setEditCustomColor(editLabelColor);
                          }
                        }}
                      />
                      <Input
                        type="text"
                        value={editCustomColor}
                        onChange={(e) => {
                          setEditCustomColor(e.target.value);
                          setEditLabelColor(e.target.value);
                        }}
                        placeholder="#000000"
                        className="flex-1 h-8 text-sm"
                      />
                      {editCustomColor && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditCustomColor("")}
                          className="h-8 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editCustomColor && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-700">
                        <HexColorPicker
                          color={editCustomColor}
                          onChange={(color) => {
                            setEditCustomColor(color);
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
                  onClick={handleUpdateLabel}
                  disabled={updateLabelMutation.isPending || !editLabelName.trim()}
                  size="sm"
                  className="flex-1 bg-blue-700 hover:bg-blue-900 text-slate-100"
                >
                  {updateLabelMutation.isPending ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  ) : null}
                  {updateLabelMutation.isPending ? "Updating..." : "Update Label"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editingLabel && deleteBoardLabelMutation.mutate(editingLabel.id)}
                  className="px-3 border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLabel(null);
                    setEditLabelName("");
                    setEditLabelColor("");
                    setEditCustomColor("");
                  }}
                  className="px-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Removed old Current/Available sections; Trello-style list is above */}

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
                      onClick={() => {
                        setNewLabelColor(color.value);
                        setCustomColor(""); // Clear custom color when selecting predefined
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newLabelColor === color.value && !customColor
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
                    <Label className="text-xs text-slate-600 dark:text-slate-400">
                      Or choose custom color:
                    </Label>
                    {!customColor && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomColor(newLabelColor)}
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
                        style={{ backgroundColor: customColor || newLabelColor }}
                        onClick={() => {
                          if (!customColor) {
                            setCustomColor(newLabelColor);
                          }
                        }}
                      />
                      <Input
                        type="text"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setNewLabelColor(e.target.value);
                        }}
                        placeholder="#000000"
                        className="flex-1 h-8 text-sm"
                      />
                      {customColor && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomColor("")}
                          className="h-8 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {customColor && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-700">
                        <HexColorPicker
                          color={customColor}
                          onChange={(color) => {
                            setCustomColor(color);
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
