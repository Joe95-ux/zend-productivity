"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, Filter, UsersRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface OrganizationMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: string | null;
  createdAt: string;
}

interface TeamResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    _count: {
      members: number;
      workspaces: number;
    };
  } | null;
  members: OrganizationMember[];
}

export default function WorkspaceTeamPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");

  const { data, isLoading, error } = useQuery<TeamResponse>({
    queryKey: ["workspace-team", workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/team`);
      if (!response.ok) throw new Error("Failed to fetch team");
      return response.json();
    },
    enabled: !!workspaceId,
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

  // Filter members
  const filteredMembers = data?.members.filter((member) => {
    const matchesSearch =
      !search ||
      member.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      member.user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && member.role === "ADMIN") ||
      (roleFilter === "member" && member.role === "MEMBER");

    return matchesSearch && matchesRole;
  }) || [];

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
            {error instanceof Error ? error.message : "Failed to load team"}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.organization) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team</h1>
            <p className="text-muted-foreground">
              Organization details for this workspace
            </p>
          </div>
        </div>
        <div className="border rounded-lg p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            This workspace is not associated with an organization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            {data.organization.name} • {data.organization._count.members} members
            {data.organization.description && (
              <span className="ml-2">• {data.organization.description}</span>
            )}
          </p>
        </div>
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
      </div>

      {/* Members Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Member</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Role</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                  No members found
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b hover:bg-accent transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ConditionalUserProfile 
                        user={{
                          name: member.user.name ?? undefined,
                          email: member.user.email,
                          avatarUrl: member.user.avatarUrl ?? undefined,
                        }} 
                        size="sm" 
                      />
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
                    <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <p className="text-sm text-muted-foreground">
                      {member.joinedAt
                        ? formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })
                        : "Pending"}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
