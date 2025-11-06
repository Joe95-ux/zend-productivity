"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Folder, FolderKanban, Building2 } from "lucide-react";

interface AssignBoardModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Workspace {
  id: string;
  name: string;
  organization?: {
    name: string;
  };
  projects: Array<{
    id: string;
    name: string;
  }>;
}

export function AssignBoardModal({ boardId, isOpen, onClose }: AssignBoardModalProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch workspaces
  const { data: workspacesData } = useQuery<{
    personal: Workspace[];
    organization: Workspace[];
    shared: Workspace[];
  }>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json();
    },
    enabled: isOpen,
  });

  // Get current board data
  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
    enabled: isOpen,
  });

  // Update values when board data loads or modal opens
  useEffect(() => {
    if (boardData && isOpen) {
      setSelectedWorkspaceId(boardData.workspaceId || "");
      setSelectedProjectId(boardData.projectId || "");
    }
  }, [boardData, isOpen]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/boards/${boardId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId || null,
          projectId: selectedProjectId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign board");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Board assigned successfully!");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const allWorkspaces = [
    ...(workspacesData?.personal || []),
    ...(workspacesData?.organization || []),
    ...(workspacesData?.shared || []),
  ];

  const selectedWorkspace = allWorkspaces.find((w) => w.id === selectedWorkspaceId);
  const availableProjects = selectedWorkspace?.projects || [];

  const handleAssign = () => {
    assignMutation.mutate();
  };

  const handleUnassign = () => {
    setSelectedWorkspaceId("");
    setSelectedProjectId("");
    assignMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Board</DialogTitle>
          <DialogDescription>
            Move this board to a workspace or project, or leave it unassigned (personal).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace (Optional)</Label>
            <Select
              value={selectedWorkspaceId}
              onValueChange={(value) => {
                setSelectedWorkspaceId(value);
                setSelectedProjectId(""); // Reset project when workspace changes
              }}
            >
              <SelectTrigger id="workspace">
                <SelectValue placeholder="Select a workspace or leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Personal Board)</SelectItem>
                {allWorkspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{workspace.name}</span>
                      {workspace.organization && (
                        <span className="text-xs text-muted-foreground">
                          ({workspace.organization.name})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWorkspaceId && availableProjects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project or leave in workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Direct in Workspace)</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {(selectedWorkspaceId || boardData?.workspaceId) && (
              <Button variant="outline" onClick={handleUnassign}>
                Unassign
              </Button>
            )}
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

