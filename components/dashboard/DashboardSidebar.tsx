"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Plus, Folder, FolderKanban, Building2, UsersRound, ChevronRight, ChevronDown, Clock, Kanban, Home, Inbox, AlertCircle, FileText, HardDrive, Paperclip, Sparkles } from "lucide-react";
import { ConditionalOrganizationSwitcher } from "@/components/organizations/ConditionalOrganizationSwitcher";
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

interface TeamBoard {
  id: string;
  title: string;
  description?: string;
  updatedAt: string;
}

interface TeamProject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  boards: TeamBoard[];
  _count: {
    boards: number;
  };
}

interface TeamWorkspace {
  id: string;
  name: string;
  slug: string;
  projects: TeamProject[];
  boards: TeamBoard[];
  _count: {
    projects: number;
    boards: number;
  };
}

interface Team {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    _count: {
      members: number;
      workspaces: number;
    };
  };
  role: string;
  workspaces: TeamWorkspace[];
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [recentBoards, setRecentBoards] = useState<string[]>([]);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectWorkspaceId, setCreateProjectWorkspaceId] = useState<string | null>(null);
  const [isStorageExpanded, setIsStorageExpanded] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedTeamWorkspaces, setExpandedTeamWorkspaces] = useState<Set<string>>(new Set());
  const [expandedTeamProjects, setExpandedTeamProjects] = useState<Set<string>>(new Set());
  // Removed unused organization variable

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

  const { data: workspacesData, isLoading, error } = useQuery<WorkspacesResponse>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch workspaces" }));
        throw new Error(errorData.error || "Failed to fetch workspaces");
      }
      const data = await response.json();
      console.log("Workspaces data:", data);
      return data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
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

  // Fetch teams (organizations with projects and boards)
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch("/api/organizations/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
  });

  // Check if user has premium subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/user/subscription");
      if (!response.ok) return { plan: "FREE" };
      return response.json();
    },
  });

  const isPremium = subscriptionData?.plan && subscriptionData.plan !== "FREE";

  // Group organization workspaces by organization
  const organizationGroups = useMemo(() => {
    return workspacesData?.organization.reduce((acc, workspace) => {
      // Skip workspaces without organization
      if (!workspace.organization) {
        console.warn("Workspace without organization:", workspace);
        return acc;
      }
      
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
  }, [workspacesData?.organization]);

  // Debug: Log organization groups
  useEffect(() => {
    if (workspacesData?.organization) {
      console.log("Organization workspaces:", workspacesData.organization);
      console.log("Organization groups:", organizationGroups);
    }
  }, [workspacesData, organizationGroups]);

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

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const toggleTeamWorkspace = (workspaceId: string) => {
    setExpandedTeamWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const toggleTeamProject = (projectId: string) => {
    setExpandedTeamProjects((prev) => {
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
                          <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
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
                                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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

        {/* Your Teams - Organizations with Projects and Boards */}
        {teamsData && teamsData.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <UsersRound className="h-3.5 w-3.5" />
              Your Teams
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teamsData.map((team: Team) => {
                  const isExpanded = expandedTeams.has(team.organization.id);

                  return (
                    <Collapsible
                      key={team.organization.id}
                      open={isExpanded}
                      onOpenChange={() => toggleTeam(team.organization.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "w-full justify-between",
                              isActive(`/dashboard/organizations/${team.organization.id}`) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Building2 className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{team.organization.name}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
                            {team.workspaces.map((workspace: TeamWorkspace) => {
                              const isWorkspaceExpanded = expandedTeamWorkspaces.has(workspace.id);

                              return (
                                <Collapsible
                                  key={workspace.id}
                                  open={isWorkspaceExpanded}
                                  onOpenChange={() => toggleTeamWorkspace(workspace.id)}
                                >
                                  <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton
                                        className={cn(
                                          "w-full justify-between h-8",
                                          isActive(`/dashboard/workspaces/${workspace.id}`) && "bg-accent"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                          <span className="text-xs truncate">{workspace.name}</span>
                                        </div>
                                        {isWorkspaceExpanded ? (
                                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                        )}
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
                                        {/* Projects */}
                                        {workspace.projects.map((project: TeamProject) => {
                                          const isProjectExpanded = expandedTeamProjects.has(project.id);

                                          return (
                                            <Collapsible
                                              key={project.id}
                                              open={isProjectExpanded}
                                              onOpenChange={() => toggleTeamProject(project.id)}
                                            >
                                              <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                  <SidebarMenuButton
                                                    className={cn(
                                                      "w-full justify-between h-8",
                                                      isActive(`/dashboard/projects/${project.id}`) && "bg-accent"
                                                    )}
                                                  >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      <FolderKanban className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                      <span className="text-xs truncate">{project.name}</span>
                                                    </div>
                                                    {isProjectExpanded ? (
                                                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                    )}
                                                  </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
                                                    {project.boards.map((board: TeamBoard) => (
                                                      <SidebarMenuItem key={board.id}>
                                                        <SidebarMenuButton
                                                          asChild
                                                          className={cn(
                                                            "h-8",
                                                            isActive(`/dashboard/boards/${board.id}`) && "bg-accent"
                                                          )}
                                                        >
                                                          <Link href={`/dashboard/boards/${board.id}`}>
                                                            <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="text-xs truncate">{board.title}</span>
                                                          </Link>
                                                        </SidebarMenuButton>
                                                      </SidebarMenuItem>
                                                    ))}
                                                  </SidebarMenu>
                                                </CollapsibleContent>
                                              </SidebarMenuItem>
                                            </Collapsible>
                                          );
                                        })}

                                        {/* Direct Boards */}
                                        {workspace.boards.map((board: TeamBoard) => (
                                          <SidebarMenuItem key={board.id}>
                                            <SidebarMenuButton
                                              asChild
                                              className={cn(
                                                "h-8",
                                                isActive(`/dashboard/boards/${board.id}`) && "bg-accent"
                                              )}
                                            >
                                              <Link href={`/dashboard/boards/${board.id}`}>
                                                <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs truncate">{board.title}</span>
                                              </Link>
                                            </SidebarMenuButton>
                                          </SidebarMenuItem>
                                        ))}
                                      </SidebarMenu>
                                    </CollapsibleContent>
                                  </SidebarMenuItem>
                                </Collapsible>
                              );
                            })}
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

        {/* Workspaces - Grouped by Organization */}
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
                          <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
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
                                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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
                          <SidebarMenu className="ml-3 pl-3 border-l w-auto mt-1">
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
                                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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
                                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
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

        {/* Storage Grouping */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible
                open={isStorageExpanded}
                onOpenChange={setIsStorageExpanded}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Files & Attachments</span>
                      </div>
                      {isStorageExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-6 mt-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            "h-8",
                            pathname === "/dashboard/storage/your-files" && "bg-accent"
                          )}
                        >
                          <Link href="/dashboard/storage/your-files" className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            <span className="text-xs truncate">Your files</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          disabled
                          className="h-8 opacity-50 cursor-not-allowed"
                        >
                          <Folder className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="text-xs truncate flex-1 min-w-0">All files</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">Soon</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          disabled
                          className="h-8 opacity-50 cursor-not-allowed"
                        >
                          <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="text-xs truncate flex-1 min-w-0">Attachments</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">Soon</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Boards */}
        {recentBoards.length > 0 && allBoards && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-semibold">
              Recent
            </SidebarGroupLabel>
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
                        <Link href={`/dashboard/boards/${boardId}`} className="flex items-center gap-2 min-w-0">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
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

        {isLoading && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Loading workspaces...
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {error && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-4 py-2 text-sm text-destructive">
                Error loading workspaces: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isLoading && !error && workspacesData && 
         (!workspacesData.personal || workspacesData.personal.length === 0) &&
         (!workspacesData.organization || workspacesData.organization.length === 0) &&
         (!workspacesData.shared || workspacesData.shared.length === 0) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No workspaces yet. Create one to get started.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        {!isPremium ? (
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            onClick={() => {
              // TODO: Navigate to pricing/upgrade page when implemented
              window.location.href = "/pricing";
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            <span>Upgrade to Pro</span>
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => setIsCreateWorkspaceOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>New Workspace</span>
          </Button>
        )}
      </SidebarFooter>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <CreateWorkspaceForm 
            onSuccess={() => setIsCreateWorkspaceOpen(false)}
            // Don't automatically pass organizationId - let user choose in the form
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

