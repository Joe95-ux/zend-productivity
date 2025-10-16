"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail } from "lucide-react";

interface UserProfileButtonProps {
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  size?: "sm" | "md" | "lg";
  showDropdown?: boolean;
}

export function UserProfileButton({ user, size = "md", showDropdown = true }: UserProfileButtonProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const avatar = (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage src={user.avatarUrl || ""} />
      <AvatarFallback className="bg-slate-100 dark:bg-slate-600 text-strong dark:text-slate-300 font-medium">
        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  if (!showDropdown) {
    return avatar;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          {avatar}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="bg-slate-100 dark:bg-slate-600 text-strong dark:text-slate-300 font-medium text-lg">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-slate-900 dark:text-white truncate ${textSizeClasses[size]}`}>
              {user.name || "User"}
            </p>
            <p className={`text-slate-500 dark:text-slate-400 truncate ${textSizeClasses[size]}`}>
              {user.email}
            </p>
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
