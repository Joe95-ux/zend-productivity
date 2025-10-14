"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcherBtn } from "@/components/ThemeSwitcherBtn";
import Logo from "@/components/Logo";
import { Menu, User, LogIn, UserPlus, Search, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export function Navbar() {
  const { isLoaded, isSignedIn } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-[18px] lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo fontSize="xl" iconSize={24} />

          {/* Search Bar - Responsive */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8">
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
            <ThemeSwitcherBtn />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="cursor-pointer transition-all duration-200 hover:scale-105">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Logo fontSize="lg" iconSize={20} />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Mobile Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search..."
                      className="pl-10 pr-4 py-2 w-full bg-muted/50 border-muted-foreground/20"
                    />
                  </div>
                  
                  {isLoaded && (
                    <>
                      {isSignedIn ? (
                        <>
                          <Button asChild variant="ghost" className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80" onClick={closeMobileMenu}>
                            <Link href="/dashboard">
                              <User className="w-4 h-4 mr-2" />
                              Dashboard
                            </Link>
                          </Button>
                          <div className="flex items-center justify-between p-2">
                            <span className="text-sm font-medium">Account</span>
                            <UserButton 
                              afterSignOutUrl="/"
                              appearance={{
                                elements: {
                                  avatarBox: "w-8 h-8"
                                }
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <Button asChild variant="ghost" className="w-full justify-start cursor-pointer transition-all duration-200 hover:bg-muted/80" onClick={closeMobileMenu}>
                            <Link href="/sign-in">
                              <LogIn className="w-4 h-4 mr-2" />
                              Sign In
                            </Link>
                          </Button>
                          <Button asChild className="w-full cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md" onClick={closeMobileMenu}>
                            <Link href="/sign-up">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Get Started
                            </Link>
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
