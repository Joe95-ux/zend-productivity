"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  // Check if we're on a board page (path ends with an ID like /dashboard/boards/[boardId])
  // MongoDB ObjectId pattern: 24 hex characters
  const isBoardPage = /\/boards\/[a-f0-9]{24}(\/|$)/.test(pathname);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access the dashboard.</p>
          <Link href="/sign-in" className="text-primary hover:underline">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // For board pages, render without sidebar (no distractions)
  if (isBoardPage) {
    return (
      <div className="h-[calc(100vh-114px)] bg-background">
          <main className="w-full overflow-auto scrollbar-thin h-full mx-auto px-4 py-6">
            {children}
          </main>
        </div>
    );
  }

  // For other dashboard pages, render with sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <DashboardBreadcrumb />
          <div className="flex-1" />
        </header>
        <div className="h-[calc(100vh-4rem)] overflow-auto">
          <main className="w-full h-full mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
