"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Folder, FolderKanban, Building2, UsersRound, ChevronRight, ChevronDown, Clock, Kanban, Home, Inbox, AlertCircle, FileText } from "lucide-react";
import { ConditionalOrganizationSwitcher } from "@/components/organizations/ConditionalOrganizationSwitcher";
import { useOrganization } from "@clerk/nextjs";
import { CreateWorkspaceForm } from "@/components/workspaces/CreateWorkspaceForm";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Board {
  id: string;
  title: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  workspaceId: string;
  boards: Board[];
  _count: {
    boards: number;
  };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  ownerId?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  boards: Board[]; // Direct boards (not in projects)
  projects: Project[]; // Projects with their boards
  _count: {
    projects: number;
    boards: number;
  };
}

interface WorkspacesResponse {
  personal: Workspace[];
  organization: Workspace[];
  shared: Workspace[];
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [recentBoards, setRecentBoards] = useState<string[]>([]);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectWorkspaceId, setCreateProjectWorkspaceId] = useState<string | null>(null);
  const { organization } = useOrganization();

  // Load recent boards from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentBoards");
    if (stored) {
      try {
        setRecentBoards(JSON.parse(stored));
      } catch {
        setRecentBoards([]);
      }
    }
  }, []);

  // Track board views for recent boards
  useEffect(() => {
    const boardMatch = pathname.match(/\/dashboard\/boards\/([a-f0-9]{24})/);
    if (boardMatch) {
      const boardId = boardMatch[1];
      setRecentBoards((prev) => {
        const updated = [boardId, ...prev.filter((id) => id !== boardId)].slice(0, 10);
        localStorage.setItem("recentBoards", JSON.stringify(updated));
        return updated;
      });
    }
  }, [pathname]);

  const { data: workspacesData, isLoading } = useQuery<WorkspacesResponse>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json();
    },
  });

  // Fetch all boards for recent boards display
  const { data: allBoards } = useQuery({
    queryKey: ["allBoards"],
    queryFn: async () => {
      const response = await fetch("/api/boards");
      if (!response.ok) throw new Error("Failed to fetch boards");
      return response.json();
    },
  });

  // Group organization workspaces by organization
  const organizationGroups = workspacesData?.organization.reduce((acc, workspace) => {
    if (!workspace.organization) return acc; // Skip workspaces without organization
    
    const orgId = workspace.organization.id;
    if (!acc[orgId]) {
      acc[orgId] = {
        organization: workspace.organization,
        workspaces: [],
      };
    }
    acc[orgId].workspaces.push(workspace);
    return acc;
  }, {} as Record<string, { organization: { id: string; name: string; slug: string }; workspaces: Workspace[] }>) || {};

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <Sidebar>
      {/* Organization switcher - always show so users can create organizations */}
      <SidebarHeader className="flex items-center justify-start border-b px-4 h-[65px]">
        <ConditionalOrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent className="py-2">
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={pathname === "/dashboard"}
                >
                  <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  disabled
                  className="opacity-50 cursor-not-allowed"
                >
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  disabled
                  className="opacity-50 cursor-not-allowed"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>My Issues</span>
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Boards */}
        {recentBoards.length > 0 && allBoards && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentBoards.slice(0, 5).map((boardId) => {
                  const board = allBoards.find((b: { id: string }) => b.id === boardId);
                  if (!board) return null;
                  return (
                    <SidebarMenuItem key={boardId}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "h-8",
                          pathname === `/dashboard/boards/${boardId}` && "bg-accent"
                        )}
                      >
                        <Link href={`/dashboard/boards/${boardId}`}>
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs truncate">{board.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Personal Workspaces */}
        {workspacesData?.personal && workspacesData.personal.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Personal Workspaces</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspacesData.personal.map((workspace) => {
                  const isExpanded = expandedWorkspaces.has(workspace.id);

                  return (
                    <Collapsible
                      key={workspace.id}
                      open={isExpanded}
                      onOpenChange={() => toggleWorkspace(workspace.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "w-full justify-between",
                              isActive(`/dashboard/workspaces/${workspace.id}`) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Folder className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{workspace.name}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-6 mt-1">
                            {/* Projects */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/projects`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/projects`}>
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Projects</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Boards */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/boards`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/boards`}>
                                  <Kanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Boards</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Team */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/team`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/team`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Team</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Members */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/members`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/members`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Members</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Organization Workspaces - Grouped by Organization */}
        {Object.keys(organizationGroups).length > 0 && (
          <>
            {Object.values(organizationGroups).map((group) => (
              <SidebarGroup key={group.organization.id}>
                <SidebarGroupLabel className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {group.organization.name}
                </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                    {group.workspaces.map((workspace) => {
                  const isExpanded = expandedWorkspaces.has(workspace.id);

                  return (
                    <Collapsible
                      key={workspace.id}
                      open={isExpanded}
                      onOpenChange={() => toggleWorkspace(workspace.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "w-full justify-between",
                              isActive(`/dashboard/workspaces/${workspace.id}`) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Folder className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{workspace.name}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-6 mt-1">
                            {/* Projects */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/projects`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/projects`}>
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Projects</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Boards */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/boards`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/boards`}>
                                  <Kanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Boards</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Team */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/team`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/team`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Team</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Members */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/members`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/members`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Members</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
            ))}
          </>
        )}

        {/* Shared Workspaces */}
        {workspacesData?.shared && workspacesData.shared.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Shared with Me</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspacesData.shared.map((workspace) => {
                  const isExpanded = expandedWorkspaces.has(workspace.id);

                  return (
                    <Collapsible
                      key={workspace.id}
                      open={isExpanded}
                      onOpenChange={() => toggleWorkspace(workspace.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "w-full justify-between",
                              isActive(`/dashboard/workspaces/${workspace.id}`) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <UsersRound className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{workspace.name}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-6 mt-1">
                            {/* Projects */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/projects`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/projects`}>
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Projects</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Boards */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/boards`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/boards`}>
                                  <Kanban className="h-3.5 w-3.5" />
                                  <span className="text-xs">Boards</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Team */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/team`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/team`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Team</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Members */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                  isActive(`/dashboard/workspaces/${workspace.id}/members`) && "bg-accent"
                                )}
                              >
                                <Link href={`/dashboard/workspaces/${workspace.id}/members`}>
                                  <UsersRound className="h-3.5 w-3.5" />
                                  <span className="text-xs">Members</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Storage Grouping - Placeholder */}
        <SidebarGroup>
          <SidebarGroupLabel>Storage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  disabled
                  className="opacity-50 cursor-not-allowed"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs">Files & Attachments</span>
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isLoading && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Loading workspaces...
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <Button
          className="w-full"
          onClick={() => setIsCreateWorkspaceOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>New Workspace</span>
        </Button>
      </SidebarFooter>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <CreateWorkspaceForm 
            onSuccess={() => setIsCreateWorkspaceOpen(false)}
            organizationId={organization?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          {createProjectWorkspaceId && (
            <CreateProjectForm 
              workspaceId={createProjectWorkspaceId}
              onSuccess={() => {
                setIsCreateProjectOpen(false);
                setCreateProjectWorkspaceId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

