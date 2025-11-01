"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcherBtn } from "@/components/ThemeSwitcherBtn";
import Logo from "@/components/Logo";
import {
  Menu,
  User,
  LogIn,
  UserPlus,
  Search,
  Filter,
  MessageSquare,
  Bell,
  Megaphone,
  Info,
  Palette,
  LogOut,
  Plus,
  Kanban,
  Layout,
  Settings,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { FeedbackModal } from "@/components/FeedbackModal";
import { HoverHint } from "@/components/HoverHint";
import { SettingsDropdown } from "@/components/settings/SettingsDropdown";
import { HelpDropdown } from "@/components/navbar/HelpDropdown";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isLoaded, isSignedIn } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const queryClient = useQueryClient();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Fetch notifications
  const { data: notifications, isLoading: notificationsLoading, error: notificationsError } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch notifications");
      }
      return response.json();
    },
    enabled: isSignedIn && isNotificationsOpen,
    refetchInterval: 60000, // Refetch every 60 seconds (WSL2 optimization)
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });
      if (!response.ok) throw new Error("Failed to mark notifications as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate(undefined);
  };

  // Fetch current email preferences for notification settings
  const { data: notificationPreferences } = useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/email-preferences");
      if (!response.ok) throw new Error("Failed to fetch email preferences");
      return response.json();
    },
    enabled: isNotificationSettingsOpen,
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

  const pathname = usePathname();
  const isDashboardPage = pathname.startsWith("/dashboard");


  return (
    <>
      {/* Animated Search Bar */}
      {isSearchOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b animate-in slide-in-from-top-2 duration-200">
          <div className="w-full px-[18px] lg:px-8 py-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search boards, cards, or members..."
                className="pl-10 pr-4 py-2 w-full bg-muted/50 border-muted-foreground/20 focus:bg-background transition-all duration-200 text-sm"
                autoFocus
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/80"
                  >
                    <HoverHint label="Filter search" side="bottom">
                      <Filter className="h-4 w-4" />
                    </HoverHint>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>All Boards</DropdownMenuItem>
                  <DropdownMenuItem>My Boards</DropdownMenuItem>
                  <DropdownMenuItem>Shared Boards</DropdownMenuItem>
                  <DropdownMenuItem>Recent</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className={cn(
            !isDashboardPage ? "px-4 md:px-6 lg:px-8 container mx-auto" : "w-full px-[18px] lg:px-8"
          )}
        >
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo fontSize="xl" iconSize={24} />

            {/* Search Bar and Create CTA Group - Desktop */}
            {isSignedIn && (
              <div className="hidden min-[422px]:flex items-center gap-4 flex-1 max-w-lg mx-2 sm:mx-4 lg:mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 w-full bg-muted/50 border-muted-foreground/20 focus:bg-background transition-all duration-200 text-sm"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/80"
                      >
                        <HoverHint label="Filter search" side="bottom">
                          <Filter className="h-4 w-4" />
                        </HoverHint>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>All Boards</DropdownMenuItem>
                      <DropdownMenuItem>My Boards</DropdownMenuItem>
                      <DropdownMenuItem>Shared Boards</DropdownMenuItem>
                      <DropdownMenuItem>Recent</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Create CTA */}
                {isSignedIn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Create</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0">
                      <div className="p-4 space-y-3">
                        {/* Create Board */}
                        <div
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-md transition-colors"
                          onClick={() => setIsCreateBoardOpen(true)}
                        >
                          <div className="flex items-start gap-3">
                            <Kanban className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-[15px] font-medium text-slate-900 dark:text-white">
                                Create board
                              </div>
                              <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                                A board is made up of cards ordered on lists.
                                Use it to manage projects, track information or
                                organize anything.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Start with Template */}
                        <div className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-md transition-colors">
                          <div className="flex items-start gap-3">
                            <Layout className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-[15px] font-medium text-slate-900 dark:text-white">
                                Start with a template
                              </div>
                              <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                                Get started faster with a board template.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
            {/* Mobile Search Icon, Create CTA, and Menu Icon */}

            <div className="flex min-[422px]:hidden items-center gap-4">
              {isSignedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="h-8 w-8 p-0 hover:bg-muted/80"
                >
                  <HoverHint label="Search" side="bottom">
                    <Search className="h-4 w-4" />
                  </HoverHint>
                </Button>
              )}
              {/* Create CTA - Mobile */}
              {isSignedIn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0">
                    <div className="p-4 space-y-3">
                      {/* Create Board */}
                      <div
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-md transition-colors"
                        onClick={() => setIsCreateBoardOpen(true)}
                      >
                        <div className="flex items-start gap-3">
                          <Kanban className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-[15px] font-medium text-slate-900 dark:text-white">
                              Create board
                            </div>
                            <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                              A board is made up of cards ordered on lists. Use
                              it to manage projects, track information or
                              organize anything.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Start with Template */}
                      <div className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-md transition-colors">
                        <div className="flex items-start gap-3">
                          <Layout className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-[15px] font-medium text-slate-900 dark:text-white">
                              Start with a template
                            </div>
                            <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                              Get started faster with a board template.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <>
                      <Button asChild variant="ghost">
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>

                      {/* Feedback, Notifications, Information Icons */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer transition-all duration-200 hover:scale-105"
                        onClick={() => setIsFeedbackOpen(true)}
                      >
                        <HoverHint label="Feedback" side="bottom">
                          <Megaphone className="h-4 w-4" />
                        </HoverHint>
                      </Button>
                      <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer transition-all duration-200 hover:scale-105 relative"
                          >
                            <HoverHint label="Notifications" side="bottom">
                              <Bell className="h-4 w-4" />
                            </HoverHint>
                            {notifications?.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 h-96 p-0">
                          <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">Notifications</h3>
                              <div className="flex items-center gap-2">
                                {notifications?.unreadCount > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs"
                                  >
                                    Mark all as read
                                  </Button>
                                )}
                                <DropdownMenu open={isNotificationSettingsOpen} onOpenChange={setIsNotificationSettingsOpen}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <HoverHint label="Notification Settings" side="bottom">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </HoverHint>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-80 p-0">
                                    <div className="p-4">
                                      <div className="flex items-center gap-2 mb-4">
                                        <Settings className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">Notification Settings</span>
                                      </div>

                                      {/* Email Notifications */}
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Bell className="h-4 w-4 text-slate-500" />
                                            <span className="text-sm font-medium">Email Notifications</span>
                                          </div>
                                          <Switch
                                            checked={notificationPreferences?.emailNotifications || false}
                                            onCheckedChange={(checked) => updateEmailNotificationsMutation.mutate(checked)}
                                            disabled={updateEmailNotificationsMutation.isPending}
                                          />
                                        </div>

                                        {/* Email Frequency */}
                                        {notificationPreferences?.emailNotifications && (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-slate-500" />
                                              <span className="text-sm font-medium">Frequency</span>
                                            </div>
                                            <Select
                                              value={notificationPreferences?.emailFrequency || "immediate"}
                                              onValueChange={(frequency) => updateEmailFrequencyMutation.mutate(frequency)}
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
                                        {notificationPreferences?.emailNotifications && (
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-slate-500" />
                                              <span className="text-sm font-medium">Notify for My Actions</span>
                                            </div>
                                            <Switch
                                              checked={notificationPreferences?.notifyOwnActions || false}
                                              onCheckedChange={(checked) => updateNotifyOwnActionsMutation.mutate(checked)}
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
                                            <Settings className="h-4 w-4" />
                                            <span>All Settings</span>
                                          </Link>
                                        </DropdownMenuItem>
                                      </div>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                          {/* Notifications Content with Custom Scrollbar */}
                          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                            {notificationsLoading ? (
                              <div className="p-4 text-center text-sm text-slate-500">
                                Loading notifications...
                              </div>
                            ) : notificationsError ? (
                              <div className="p-4 text-center text-sm text-red-500">
                                Failed to load notifications. Please try again.
                              </div>
                            ) : notifications?.notifications?.length > 0 ? (
                              <div className="p-2">
                                {notifications.notifications.map((notification: {
                                  id: string;
                                  title: string;
                                  message: string;
                                  isRead: boolean;
                                  createdAt: string;
                                }) => (
                                  <div
                                    key={notification.id}
                                    className={`p-3 border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                                      !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                    onClick={() => {
                                      if (!notification.isRead) {
                                        markAsReadMutation.mutate([notification.id]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0">
                                        <Bell className="h-4 w-4 text-slate-400 mt-0.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                          {notification.title}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                          {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                      {!notification.isRead && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-sm text-slate-500">
                                No notifications yet
                              </div>
                            )}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <SettingsDropdown />
                      <HelpDropdown />

                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            avatarBox: "w-8 h-8",
                          },
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Button asChild variant="ghost">
                        <Link href="/sign-in">
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href="/sign-up">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Get Started
                        </Link>
                      </Button>
                    </>
                  )}
                  <ThemeSwitcherBtn />
                </>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="flex lg:hidden items-center space-x-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    <HoverHint label="Menu" side="bottom">
                      <Menu className="h-5 w-5" />
                    </HoverHint>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[280px] min-[320px]:w-80 sm:w-96 p-0"
                >
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-[14px] pb-0 flex-shrink-0 flex items-center justify-center border-b">
                      <h3 className="text-[17px] font-bold">Menu</h3>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      <div className="p-[14px] space-y-2">
                        {isLoaded && (
                          <>
                            {isSignedIn ? (
                              <>
                                {/* Create Section */}
                                <div className="space-y-0">
                                  <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                                    onClick={() => {
                                      setIsCreateBoardOpen(true);
                                      closeMobileMenu();
                                    }}
                                  >
                                    <Plus className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Create board
                                    </span>
                                  </div>
                                </div>

                                <Separator />

                                {/* Account Section */}
                                <div className="space-y-0">
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <UserButton
                                      afterSignOutUrl="/"
                                      appearance={{
                                        elements: {
                                          avatarBox: "w-4 h-4",
                                        },
                                      }}
                                    />
                                    <span className="text-sm font-normal">
                                      Account
                                    </span>
                                  </div>
                                  <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                                    onClick={closeMobileMenu}
                                  >
                                    <Link
                                      href="/dashboard"
                                      className="flex items-center gap-3 w-full"
                                    >
                                      <User className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm font-normal">
                                        Dashboard
                                      </span>
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Feedback
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <Bell className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Notifications
                                    </span>
                                  </div>
                                  <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                                    onClick={closeMobileMenu}
                                  >
                                    <Link
                                      href="/settings"
                                      className="flex items-center gap-3 w-full"
                                    >
                                      <Settings className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm font-normal">
                                        Settings
                                      </span>
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <Palette className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Theme
                                    </span>
                                    <div className="ml-auto">
                                      <ThemeSwitcherBtn />
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Logout Section */}
                                <div className="space-y-0">
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <LogOut className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal text-slate-900 dark:text-white">
                                      Logout
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Guest Section */}
                                <div className="space-y-0">
                                  <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                                    onClick={closeMobileMenu}
                                  >
                                    <Link
                                      href="/sign-in"
                                      className="flex items-center gap-3 w-full"
                                    >
                                      <LogIn className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm font-normal">
                                        Sign In
                                      </span>
                                    </Link>
                                  </div>
                                  <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                                    onClick={closeMobileMenu}
                                  >
                                    <Link
                                      href="/sign-up"
                                      className="flex items-center gap-3 w-full"
                                    >
                                      <UserPlus className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm font-normal">
                                        Get Started
                                      </span>
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <Info className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Information
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                    <Palette className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">
                                      Theme
                                    </span>
                                    <div className="ml-auto">
                                      <ThemeSwitcherBtn />
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Board Modal */}
      <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <CreateBoardForm onSuccess={() => setIsCreateBoardOpen(false)} />
        </DialogContent>
      </Dialog>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  );
}
