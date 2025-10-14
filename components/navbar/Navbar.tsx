"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcherBtn } from "@/components/ThemeSwitcherBtn";
import Logo from "@/components/Logo";
import { Menu, User, LogIn, UserPlus, Search, Filter, X, MessageSquare, Bell, Info, Palette, LogOut, Plus, Kanban, Layout } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import Link from "next/link";

export function Navbar() {
  const { isLoaded, isSignedIn } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

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
                    <Filter className="h-4 w-4" />
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
        <div className="w-full px-[18px] lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo fontSize="xl" iconSize={24} />

          {/* Search Bar - Responsive */}
          <div className="hidden min-[320px]:flex flex-1 max-w-md mx-2 sm:mx-4 lg:mx-8">
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
                    <Filter className="h-4 w-4" />
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

          {/* Mobile Search Icon */}
          <div className="flex min-[320px]:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-8 w-8 p-0 hover:bg-muted/80"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Create CTA - Desktop */}
          {isSignedIn && (
            <div className="hidden min-[320px]:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
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
                          <div className="text-[15px] font-medium text-slate-900 dark:text-white">Create board</div>
                          <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                            A board is made up of cards ordered on lists. Use it to manage projects, track information or organize anything.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Start with Template */}
                    <div className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-md transition-colors">
                      <div className="flex items-start gap-3">
                        <Layout className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-[15px] font-medium text-slate-900 dark:text-white">Start with a template</div>
                          <div className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">
                            Get started faster with a board template.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-4">
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <>
                    <Button asChild variant="ghost">
                      <Link href="/dashboard">
                        Dashboard
                      </Link>
                    </Button>
                    <UserButton 
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8"
                        }
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
                <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-200 hover:scale-105">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-[14px] pb-0 flex-shrink-0 flex items-center justify-between border-b">
                    <div className="flex items-center space-x-2">
                      <Logo fontSize="lg" iconSize={20} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeMobileMenu}
                      className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
                                  <span className="text-sm font-normal">Create board</span>
                                </div>
                              </div>

                              <Separator />

                              {/* Account Section */}
                              <div className="space-y-0">
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <User className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Account</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors" onClick={closeMobileMenu}>
                                  <Link href="/dashboard" className="flex items-center gap-3 w-full">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">Dashboard</span>
                                  </Link>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <MessageSquare className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Feedback</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <Bell className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Notifications</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <Info className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Information</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <Palette className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Theme</span>
                                  <div className="ml-auto">
                                    <ThemeSwitcherBtn />
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Logout Section */}
                              <div className="space-y-0">
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-md transition-colors text-red-500">
                                  <LogOut className="h-4 w-4" />
                                  <span className="text-sm font-normal">Logout</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Guest Section */}
                              <div className="space-y-0">
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors" onClick={closeMobileMenu}>
                                  <Link href="/sign-in" className="flex items-center gap-3 w-full">
                                    <LogIn className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">Sign In</span>
                                  </Link>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors" onClick={closeMobileMenu}>
                                  <Link href="/sign-up" className="flex items-center gap-3 w-full">
                                    <UserPlus className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-normal">Get Started</span>
                                  </Link>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <Info className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Information</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors">
                                  <Palette className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-normal">Theme</span>
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
    </>
  );
}
