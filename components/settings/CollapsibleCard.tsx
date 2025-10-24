"use client";

import { useState, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleCard({ 
  icon: Icon, 
  title, 
  description, 
  children, 
  defaultExpanded = false 
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <CardHeader 
        className="pt-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="py-8">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
