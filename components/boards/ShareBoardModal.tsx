"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Link as LinkIcon, Check, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUserId } from "@/hooks/use-current-user-id";

interface ShareBoardModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface BoardMember {
  id: string;
  user: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
    clerkId: string;
  };
  role: "admin" | "member";
}

interface JoinRequest {
  id: string;
  user: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
    clerkId: string;
  };
  requestedAt: string;
}

export function ShareBoardModal({ boardId, isOpen, onClose }: ShareBoardModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [shareLink, setShareLink] = useState("");
  const currentUserId = useCurrentUserId();

  // Fetch board members
  const { data: boardMembers, refetch: refetchMembers, error: membersError } = useQuery<BoardMember[]>({
    queryKey: ["board-members", boardId],
    queryFn: async (): Promise<BoardMember[]> => {
      const response = await fetch(`/api/boards/${boardId}/members`);
      if (!response.ok) {
        throw new Error("Failed to fetch board members");
      }
      return response.json();
    },
    enabled: isOpen && !!boardId,
    retry: 1,
  });

  // Fetch join requests
  const { data: joinRequests, refetch: refetchRequests, error: requestsError } = useQuery<JoinRequest[]>({
    queryKey: ["board-join-requests", boardId],
    queryFn: async (): Promise<JoinRequest[]> => {
      const response = await fetch(`/api/boards/${boardId}/join-requests`);
      if (!response.ok) {
        throw new Error("Failed to fetch join requests");
      }
      return response.json();
    },
    enabled: isOpen && !!boardId,
    retry: 1,
  });

  // Log errors if they occur
  useEffect(() => {
    if (membersError) {
      console.error("Error fetching board members:", membersError);
    }
    if (requestsError) {
      console.error("Error fetching join requests:", requestsError);
    }
  }, [membersError, requestsError]);

  // Fetch share link
  useEffect(() => {
    if (isOpen && boardId && typeof window !== "undefined") {
      setShareLink(`${window.location.origin}/dashboard/boards/${boardId}`);
    }
  }, [isOpen, boardId]);

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: "admin" | "member" }) => {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite member");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Member invited successfully!");
      setEmail("");
      refetchMembers();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: "admin" | "member" }) => {
      const response = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Role updated successfully!");
      refetchMembers();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve join request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, role }: { requestId: string; role?: "admin" | "member" }) => {
      const response = await fetch(`/api/boards/${boardId}/join-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role || "member" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve request");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Join request approved!");
      refetchRequests();
      refetchMembers();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject join request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/boards/${boardId}/join-requests/${requestId}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject request");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Join request rejected");
      refetchRequests();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Copy link to clipboard
  const [copied, setCopied] = useState(false);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Handle invite
  const handleInvite = () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    inviteMemberMutation.mutate({ email: email.trim(), role });
  };

  if (!isOpen) return null;

  // Combine owner and members for display
  const allMembers: BoardMember[] = Array.isArray(boardMembers) ? boardMembers : [];
  const membersCount = allMembers.length;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Share board
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Invite form */}
          <div className="flex gap-2">
            <Input
              placeholder="Email address or name"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInvite();
                }
              }}
              className="flex-1"
            />
            <Select value={role} onValueChange={(value) => setRole(value as "admin" | "member")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member" className="font-medium">
                  Member
                </SelectItem>
                <SelectLabel className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                  Can view and edit this board
                </SelectLabel>
                <SelectItem value="admin" className="font-medium">
                  Admin
                </SelectItem>
                <SelectLabel className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                  Can view, edit, and manage board settings
                </SelectLabel>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={inviteMemberMutation.isPending}
              className="px-4"
            >
              Share
            </Button>
          </div>

          {/* Link section */}
          <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
            <LinkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Share this as a link
              </p>
              <button
                onClick={handleCopyLink}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 mt-0.5"
              >
                Copy link
              </button>
            </div>
            {copied && (
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          {/* Board members and join requests tabs */}
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">
                Board members ({membersCount})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1">
                Join requests ({Array.isArray(joinRequests) ? joinRequests.length : 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="members" className="mt-4 space-y-2">
              {allMembers.map((member) => {
                const isCurrentUser = member.user.id === currentUserId;
                // Check if this is the owner (id starts with "owner-")
                const isOwner = member.id.startsWith("owner-");
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ConditionalUserProfile user={member.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {member.user.name || member.user.email}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              (you)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>@{member.user.email.split("@")[0]}</span>
                          <span>•</span>
                          <span>
                            {isOwner ? "Owner" : member.role === "admin" ? "Admin" : "Member"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isOwner && (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            memberId: member.id,
                            newRole: value as "admin" | "member",
                          })
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
              {allMembers.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No members yet. Invite someone to get started!
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4 space-y-2">
              {Array.isArray(joinRequests) && joinRequests.length > 0 ? (
                joinRequests.map((request: JoinRequest) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ConditionalUserProfile user={request.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {request.user.name || request.user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>@{request.user.email.split("@")[0]}</span>
                          <span>•</span>
                          <span>
                            Requested {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rejectRequestMutation.mutate(request.id)}
                        disabled={rejectRequestMutation.isPending}
                        className="h-8 px-3 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => approveRequestMutation.mutate({ requestId: request.id })}
                        disabled={approveRequestMutation.isPending}
                        className="h-8 px-3 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No pending join requests
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );

  // Render modal in portal to avoid z-index and stacking context issues
  if (typeof document === "undefined") return null;
  
  return createPortal(modalContent, document.body);
}

