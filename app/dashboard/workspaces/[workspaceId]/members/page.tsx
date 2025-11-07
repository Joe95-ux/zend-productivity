"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function WorkspaceMembersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  // Fetch workspace details
  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>({
    queryKey: ["workspace", workspaceId],
    queryFn: async (): Promise<Workspace> => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) throw new Error("Failed to fetch workspace");
      return response.json() as Promise<Workspace>;
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

  if (workspaceLoading) {
    return (
      <div className="w-full space-y-8 h-full lg:px-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            {workspace?.name ? `Members of ${workspace.name}` : "Manage workspace members"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Workspace Members
          </CardTitle>
          <CardDescription>
            Member management features coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will allow you to view and manage members of {workspace?.name || "this workspace"}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

