"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  Info, 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { HoverHint } from "@/components/HoverHint";

export function HelpDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <HoverHint label="Help & Info" side="bottom">
            <Info className="h-4 w-4" />
          </HoverHint>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Help & Information</span>
          </div>

          {/* Quick Help */}
          <div className="space-y-1">
            <DropdownMenuItem asChild>
              <Link href="/about-us" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Getting Started</span>
                <ChevronRight className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/about-us" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/contact-us" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>Contact Support</span>
                <ChevronRight className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-3" />

          {/* App Info */}
          <div className="space-y-1">
            <DropdownMenuLabel className="text-xs text-slate-500 px-2 py-1">
              About Zend Productivity
            </DropdownMenuLabel>
            <div className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400">
              <p>Version 1.0.0</p>
              <p>Built with Next.js & React</p>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
