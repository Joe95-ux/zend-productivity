"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  _count: {
    boards: number;
  };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function WorkspaceProjectsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

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

  // Fetch projects for this workspace
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["projects", workspaceId],
    queryFn: async (): Promise<Project[]> => {
      const response = await fetch(`/api/workspaces/${workspaceId}/projects`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json() as Promise<Project[]>;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 h-full lg:px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {workspace?.name ? `Projects in ${workspace.name}` : "Manage your projects"}
          </p>
        </div>

        <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <CreateProjectForm
              workspaceId={workspaceId}
              onSuccess={() => setIsCreateProjectOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {projectsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{project.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <CardDescription className="text-xs mb-2">
                      {project.description}
                    </CardDescription>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {project._count?.boards || 0} board{project._count?.boards !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to organize your boards.
          </p>
          <Button onClick={() => setIsCreateProjectOpen(true)} className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
}

