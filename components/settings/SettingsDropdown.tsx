"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Settings, 
  Bell, 
  Mail, 
  Clock, 
  Palette, 
  User, 
  ChevronRight,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { HoverHint } from "@/components/HoverHint";

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current email preferences
  const { data: preferences } = useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/email-preferences");
      if (!response.ok) throw new Error("Failed to fetch email preferences");
      return response.json();
    },
    enabled: isOpen,
  });

  // Update email notifications mutation
  const updateEmailNotificationsMutation = useMutation({
    mutationFn: async (emailNotifications: boolean) => {
      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update email notifications");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Email notifications updated");
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update email frequency mutation
  const updateEmailFrequencyMutation = useMutation({
    mutationFn: async (emailFrequency: string) => {
      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFrequency }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update email frequency");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Email frequency updated");
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update notify own actions mutation
  const updateNotifyOwnActionsMutation = useMutation({
    mutationFn: async (notifyOwnActions: boolean) => {
      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOwnActions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update notification preference");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Notification preference updated");
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEmailNotificationsToggle = (checked: boolean) => {
    updateEmailNotificationsMutation.mutate(checked);
  };

  const handleEmailFrequencyChange = (frequency: string) => {
    updateEmailFrequencyMutation.mutate(frequency);
  };

  const handleNotifyOwnActionsToggle = (checked: boolean) => {
    updateNotifyOwnActionsMutation.mutate(checked);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <HoverHint label="Settings" side="bottom">
            <Settings className="h-4 w-4" />
          </HoverHint>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Quick Settings</span>
          </div>

          {/* Email Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Email Notifications</span>
              </div>
              <Switch
                checked={preferences?.emailNotifications || false}
                onCheckedChange={handleEmailNotificationsToggle}
                disabled={updateEmailNotificationsMutation.isPending}
              />
            </div>

            {/* Email Frequency */}
            {preferences?.emailNotifications && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Frequency</span>
                </div>
                <Select
                  value={preferences?.emailFrequency || "immediate"}
                  onValueChange={handleEmailFrequencyChange}
                  disabled={updateEmailFrequencyMutation.isPending}
                >
                  <SelectTrigger className="w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3 w-3" />
                        <span>Immediate</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="daily">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Daily</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="weekly">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Weekly</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notify Own Actions */}
            {preferences?.emailNotifications && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Notify for My Actions</span>
                </div>
                <Switch
                  checked={preferences?.notifyOwnActions || false}
                  onCheckedChange={handleNotifyOwnActionsToggle}
                  disabled={updateNotifyOwnActionsMutation.isPending}
                />
              </div>
            )}
          </div>

          <DropdownMenuSeparator className="my-3" />

          {/* Quick Actions */}
          <div className="space-y-1">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>All Settings</span>
                <ChevronRight className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Theme & Appearance</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
