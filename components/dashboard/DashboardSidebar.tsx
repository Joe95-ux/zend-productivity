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
import { Plus, LayoutDashboard, Folder, FolderKanban, Building2, Users, ChevronRight, ChevronDown, Clock, Kanban, Home } from "lucide-react";
import { ConditionalOrganizationSwitcher } from "@/components/organizations/ConditionalOrganizationSwitcher";
import { useOrganizationList, useOrganization } from "@clerk/nextjs";
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
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
        // Also collapse all projects in this workspace
        setExpandedProjects((prevProjects) => {
          const nextProjects = new Set(prevProjects);
          const workspace = workspacesData?.personal
            .concat(workspacesData?.organization || [])
            .concat(workspacesData?.shared || [])
            .find((w) => w.id === workspaceId);
          workspace?.projects?.forEach((project) => {
            nextProjects.delete(project.id);
          });
          return nextProjects;
        });
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Check if user has organizations to conditionally show header
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList();
  const hasOrgs = orgsLoaded && (userMemberships?.data?.length || 0) > 0;

  return (
    <Sidebar>
      {/* Only show header if user has organizations */}
      {hasOrgs && (
      <SidebarHeader className="border-b px-4 py-3">
          <ConditionalOrganizationSwitcher />
      </SidebarHeader>
      )}

      <SidebarContent>
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
                  asChild
                  isActive={pathname === "/dashboard/boards"}
                >
                  <Link href="/dashboard/boards">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>All Boards</span>
                  </Link>
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
                  const directBoards = workspace.boards || [];
                  const projects = workspace.projects || [];

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
                            {/* Direct Boards (not in projects) */}
                            {directBoards.length > 0 && (
                              <>
                                {directBoards.map((board) => (
                                  <SidebarMenuItem key={board.id}>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                        pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                                )}
                              >
                                      <Link href={`/dashboard/boards/${board.id}`}>
                                        <Kanban className="h-3.5 w-3.5" />
                                        <span className="text-xs truncate">{board.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                                ))}
                              </>
                            )}

                            {/* Projects Section */}
                            {projects.length > 0 && (
                              <>
                                <SidebarMenuItem>
                                  <div className="px-2 py-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">Projects</span>
                                  </div>
                                </SidebarMenuItem>
                            {projects.map((project) => {
                              const isProjectExpanded = expandedProjects.has(project.id);
                                  const projectBoards = project.boards || [];
                              return (
                                <SidebarMenuItem key={project.id}>
                                  <Collapsible
                                    open={isProjectExpanded}
                                    onOpenChange={() => toggleProject(project.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton
                                        className={cn(
                                          "h-8 w-full justify-between",
                                          isActive(`/dashboard/projects/${project.id}`) && "bg-accent"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span className="truncate text-xs">{project.name}</span>
                                        </div>
                                        {isProjectExpanded ? (
                                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                        )}
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenu className="ml-4 mt-1">
                                            {projectBoards.length > 0 ? (
                                              projectBoards.map((board) => (
                                                <SidebarMenuItem key={board.id}>
                                          <SidebarMenuButton
                                            asChild
                                            className={cn(
                                              "h-7",
                                                      pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                                            )}
                                          >
                                                    <Link href={`/dashboard/boards/${board.id}`}>
                                                      <Kanban className="h-3 w-3" />
                                                      <span className="text-xs truncate">{board.title}</span>
                                            </Link>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                              ))
                                            ) : (
                                              <SidebarMenuItem>
                                                <div className="px-2 py-1">
                                                  <span className="text-xs text-muted-foreground">No boards</span>
                                                </div>
                                              </SidebarMenuItem>
                                            )}
                                      </SidebarMenu>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </SidebarMenuItem>
                              );
                            })}
                              </>
                            )}

                            {/* Create Project Button */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                className="h-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setCreateProjectWorkspaceId(workspace.id);
                                  setIsCreateProjectOpen(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span className="text-xs">New Project</span>
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
                      const directBoards = workspace.boards || [];
                      const projects = workspace.projects || [];

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
                                {/* Direct Boards (not in projects) */}
                                {directBoards.length > 0 && (
                                  <>
                                    {directBoards.map((board) => (
                                      <SidebarMenuItem key={board.id}>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "h-8",
                                            pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                                )}
                              >
                                          <Link href={`/dashboard/boards/${board.id}`}>
                                            <Kanban className="h-3.5 w-3.5" />
                                            <span className="text-xs truncate">{board.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                                    ))}
                                  </>
                                )}

                                {/* Projects Section */}
                                {projects.length > 0 && (
                                  <>
                                    <SidebarMenuItem>
                                      <div className="px-2 py-1.5">
                                        <span className="text-xs font-medium text-muted-foreground">Projects</span>
                                      </div>
                                    </SidebarMenuItem>
                            {projects.map((project) => {
                              const isProjectExpanded = expandedProjects.has(project.id);
                                      const projectBoards = project.boards || [];
                              return (
                                <SidebarMenuItem key={project.id}>
                                  <Collapsible
                                    open={isProjectExpanded}
                                    onOpenChange={() => toggleProject(project.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton
                                        className={cn(
                                          "h-8 w-full justify-between",
                                          isActive(`/dashboard/projects/${project.id}`) && "bg-accent"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span className="truncate text-xs">{project.name}</span>
                                        </div>
                                        {isProjectExpanded ? (
                                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                        )}
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenu className="ml-4 mt-1">
                                                {projectBoards.length > 0 ? (
                                                  projectBoards.map((board) => (
                                                    <SidebarMenuItem key={board.id}>
                                          <SidebarMenuButton
                                            asChild
                                            className={cn(
                                              "h-7",
                                                          pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                                            )}
                                          >
                                                        <Link href={`/dashboard/boards/${board.id}`}>
                                                          <Kanban className="h-3 w-3" />
                                                          <span className="text-xs truncate">{board.title}</span>
                                            </Link>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                                  ))
                                                ) : (
                                                  <SidebarMenuItem>
                                                    <div className="px-2 py-1">
                                                      <span className="text-xs text-muted-foreground">No boards</span>
                                                    </div>
                                                  </SidebarMenuItem>
                                                )}
                                      </SidebarMenu>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </SidebarMenuItem>
                              );
                            })}
                                  </>
                                )}

                            {/* Create Project Button */}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                className="h-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  // TODO: Open create project modal
                                  console.log("Create project for workspace:", workspace.id);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span className="text-xs">New Project</span>
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
                  const directBoards = workspace.boards || [];
                  const projects = workspace.projects || [];

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
                              <Users className="h-4 w-4 flex-shrink-0" />
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
                            {/* Direct Boards (not in projects) */}
                            {directBoards.length > 0 && (
                              <>
                                {directBoards.map((board) => (
                                  <SidebarMenuItem key={board.id}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                                        "h-8",
                                        pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                      )}
                    >
                                      <Link href={`/dashboard/boards/${board.id}`}>
                                        <Kanban className="h-3.5 w-3.5" />
                                        <span className="text-xs truncate">{board.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                              </>
                            )}

                            {/* Projects Section */}
                            {projects.length > 0 && (
                              <>
                                <SidebarMenuItem>
                                  <div className="px-2 py-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">Projects</span>
                                  </div>
                                </SidebarMenuItem>
                                {projects.map((project) => {
                                  const isProjectExpanded = expandedProjects.has(project.id);
                                  const projectBoards = project.boards || [];
                                  return (
                                    <SidebarMenuItem key={project.id}>
                                      <Collapsible
                                        open={isProjectExpanded}
                                        onOpenChange={() => toggleProject(project.id)}
                                      >
                                        <CollapsibleTrigger asChild>
                                          <SidebarMenuButton
                                            className={cn(
                                              "h-8 w-full justify-between",
                                              isActive(`/dashboard/projects/${project.id}`) && "bg-accent"
                                            )}
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                                              <span className="truncate text-xs">{project.name}</span>
                                            </div>
                                            {isProjectExpanded ? (
                                              <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                            )}
                                          </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <SidebarMenu className="ml-4 mt-1">
                                            {projectBoards.length > 0 ? (
                                              projectBoards.map((board) => (
                                                <SidebarMenuItem key={board.id}>
                                                  <SidebarMenuButton
                                                    asChild
                                                    className={cn(
                                                      "h-7",
                                                      pathname === `/dashboard/boards/${board.id}` && "bg-accent"
                                                    )}
                                                  >
                                                    <Link href={`/dashboard/boards/${board.id}`}>
                                                      <Kanban className="h-3 w-3" />
                                                      <span className="text-xs truncate">{board.title}</span>
                                                    </Link>
                                                  </SidebarMenuButton>
                                                </SidebarMenuItem>
                                              ))
                                            ) : (
                                              <SidebarMenuItem>
                                                <div className="px-2 py-1">
                                                  <span className="text-xs text-muted-foreground">No boards</span>
                                                </div>
                                              </SidebarMenuItem>
                                            )}
                                          </SidebarMenu>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </SidebarMenuItem>
                                  );
                                })}
                              </>
                            )}
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

