"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, MoreHorizontal, UserPlus, Trash2, Shield, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  role: "admin" | "member";
  createdAt: string;
}

interface MembersResponse {
  members: WorkspaceMember[];
  total: number;
}

export default function WorkspaceMembersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");
  const [sortBy, setSortBy] = useState<"name" | "role" | "joined">("name");
  const [deletingMember, setDeletingMember] = useState<WorkspaceMember | null>(null);

  const { data, isLoading, error } = useQuery<MembersResponse>({
    queryKey: ["workspace-members", workspaceId, search, roleFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        role: roleFilter,
        sortBy,
      });
      const response = await fetch(`/api/workspaces/${workspaceId}/members?${params}`);
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: !!workspaceId,
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      toast.success("Member removed successfully");
      setDeletingMember(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    },
  });

  if (!workspaceId) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invalid workspace ID</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6 h-full lg:px-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="border rounded-lg">
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="text-center py-12">
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Failed to load members"}
          </p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (deletingMember && deletingMember.id.startsWith("owner-")) {
      toast.error("Cannot remove workspace owner");
      setDeletingMember(null);
      return;
    }
    if (deletingMember) {
      deleteMemberMutation.mutate(deletingMember.id);
    }
  };

  return (
    <div className="w-full space-y-6 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} {data?.total === 1 ? "member" : "members"}
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Role: {roleFilter === "all" ? "All" : roleFilter === "admin" ? "Admin" : "Member"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>
              All Roles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("admin")}>
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("member")}>
              Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Sort: {sortBy === "name" ? "Name" : sortBy === "role" ? "Role" : "Joined"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("name")}>
              Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("role")}>
              Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("joined")}>
              Joined
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Members Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Member</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Role</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Joined</th>
              <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!data?.members || data.members.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No members found
                </td>
              </tr>
            ) : (
              data.members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b hover:bg-accent transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ConditionalUserProfile user={member.user} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user.name || member.user.email}
                        </p>
                        {member.user.name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role === "admin" ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {member.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingMember(member)}
                            className="text-destructive focus:text-destructive"
                            disabled={member.id.startsWith("owner-")}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingMember?.user.name || deletingMember?.user.email} from this workspace? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingMember(null)}
              disabled={deleteMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
