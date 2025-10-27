"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, X, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@clerk/nextjs";
import { Board, User, BoardMember } from "@/lib/types";

interface MembersDropdownProps {
  card: {
    id: string;
    title: string;
    assignedTo?: string;
  };
  boardId: string;
  trigger?: React.ReactNode;
}

export function MembersDropdown({ card, boardId, trigger }: MembersDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Debug logging
  console.log('MembersDropdown render - isOpen:', isOpen, 'card.assignedTo:', card.assignedTo);

  // Fetch board members
  const { data: boardData } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error("Failed to fetch board");
      return response.json();
    },
  });

  const assignMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/cards/${card.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign member");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Member assigned successfully!");
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cards/${card.id}/members`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove member");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Member removed successfully!");
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setIsOpen(false);
  }, []);

  const handleAssignMember = (userId: string) => {
    assignMemberMutation.mutate(userId);
  };

  const handleRemoveMember = () => {
    removeMemberMutation.mutate();
  };

  const getDisplayText = () => {
    if (card.assignedTo) {
      return "1 Member";
    }
    return "Members";
  };

  // Get all board members (owner + members)
  const allMembers = boardData ? [
    boardData.owner,
    ...boardData.members.map((member: BoardMember) => member.user)
  ] : [];

  // Filter members based on search query
  const filteredMembers = allMembers.filter((member: User) =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get assigned member info
  const assignedMember = allMembers.find((member: User) => member.id === card.assignedTo);

  return (
    <DropdownMenu 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsOpen(true);
            }}
            className="h-8 px-3 text-sm font-medium border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            {getDisplayText()}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0 dark:bg-[#0D1117] max-h-96 flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Members
            </h3>
            {(assignMemberMutation.isPending || removeMemberMutation.isPending) && (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={assignMemberMutation.isPending || removeMemberMutation.isPending}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {assignedMember ? (
            // Design when card has members
            <>
              {/* Field 1: Search Members Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members..."
                    className="pl-10 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Field 2: Card Members */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Card Members
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <UserButton 
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8"
                        }
                      }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {assignedMember.name || "Unknown User"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {assignedMember.email}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveMember}
                      disabled={removeMemberMutation.isPending}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                    >
                      {removeMemberMutation.isPending ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                      ) : (
                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Members */}
              {filteredMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Available Members
                  </Label>
                  <div className="space-y-2">
                    {filteredMembers
                      .filter((member: User) => member.id !== card.assignedTo)
                      .map((member: User) => (
                        <button
                          key={member.id}
                          onClick={() => handleAssignMember(member.id)}
                          disabled={assignMemberMutation.isPending}
                          className="w-full flex items-center gap-3 p-2 rounded-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserButton 
                            afterSignOutUrl="/"
                            appearance={{
                              elements: {
                                avatarBox: "w-8 h-8"
                              }
                            }}
                          />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {member.name || "Unknown User"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                          </div>
                          {assignMemberMutation.isPending && (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                          )}
                          <Plus className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Design when no members assigned (normal design)
            <>
              {/* Search Input with no label */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members..."
                    className="pl-10 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Available Members */}
              {filteredMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Board Members
                  </Label>
                  <div className="space-y-2">
                    {filteredMembers.map((member: User) => (
                      <button
                        key={member.id}
                        onClick={() => handleAssignMember(member.id)}
                        disabled={assignMemberMutation.isPending}
                        className="w-full flex items-center gap-3 p-2 rounded-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserButton 
                          afterSignOutUrl="/"
                          appearance={{
                            elements: {
                              avatarBox: "w-8 h-8"
                            }
                          }}
                        />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {member.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {member.email}
                          </p>
                        </div>
                        {assignMemberMutation.isPending && (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                        )}
                        <Plus className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {filteredMembers.length === 0 && searchQuery && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No members found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
