"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  // Parse the pathname to generate breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  
  // Remove "dashboard" from segments if present
  const segments = pathSegments.filter((seg) => seg !== "dashboard");

  // If we're on the dashboard root, don't show breadcrumbs
  if (segments.length === 0) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems: Array<{ label: string; href: string; isActive: boolean }> = [];

  // Always start with Dashboard
  breadcrumbItems.push({
    label: "Dashboard",
    href: "/dashboard",
    isActive: pathname === "/dashboard",
  });

  // Build path incrementally
  let currentPath = "/dashboard";
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Skip dynamic route segments (IDs) - we'll fetch names for them
    const isDynamicRoute = segment.match(/^[a-f0-9]{24}$/i); // MongoDB ObjectId pattern
    
    if (isDynamicRoute) {
      // For dynamic routes, we'll try to fetch the name
      // For now, just use a generic label
      const routeType = i > 0 ? segments[i - 1] : "";
      let label = segment;
      
      // Try to determine label based on previous segment
      if (routeType === "workspaces") {
        label = "Workspace";
      } else if (routeType === "projects") {
        label = "Project";
      } else if (routeType === "boards") {
        label = "Board";
      } else if (routeType === "cards") {
        label = "Card";
      } else if (routeType === "organizations") {
        label = "Organization";
      }
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isActive: i === segments.length - 1,
      });
    } else {
      // For static segments, capitalize and format
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isActive: i === segments.length - 1,
      });
    }
  }

  return (
    <>
      <span className="text-muted-foreground">|</span>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <div key={item.href} className="flex items-center">
              <BreadcrumbItem>
                {item.isActive ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbItems.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
