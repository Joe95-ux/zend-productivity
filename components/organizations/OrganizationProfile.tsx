"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Calendar, Shield, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from "date-fns";

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  role: string;
  joinedAt: string;
  _count: {
    members: number;
    boards: number;
  };
}

export function OrganizationProfile() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: orgListLoaded, setActive } = useOrganizationList();

  // Fetch organization details from our API
  const { data: orgData, isLoading } = useQuery<OrganizationData[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
    enabled: orgListLoaded,
  });

  // Find the current organization in our data
  const currentOrg = orgData?.find(
    (org) => org.slug === organization?.slug || org.name === organization?.name
  );

  if (!orgLoaded || !orgListLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Organization Selected</CardTitle>
          <CardDescription>
            Select an organization from the switcher in the navbar to view its profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Organizations allow teams to collaborate on shared workspaces and boards.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const role = currentOrg?.role || "MEMBER";
  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
    MEMBER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    OBSERVER: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {organization.imageUrl ? (
                <img
                  src={organization.imageUrl}
                  alt={organization.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">{organization.name}</CardTitle>
                <CardDescription className="mt-1">
                  {currentOrg?.description || "No description provided"}
                </CardDescription>
              </div>
            </div>
            <Badge className={roleColors[role] || roleColors.MEMBER}>
              {role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{currentOrg?._count.members || 0} Members</p>
                <p className="text-xs text-muted-foreground">Total members</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{currentOrg?._count.boards || 0} Boards</p>
                <p className="text-xs text-muted-foreground">Organization boards</p>
              </div>
            </div>
            {currentOrg?.joinedAt && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(currentOrg.joinedAt), "MMM yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Joined</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="text-sm mt-1">{organization.slug}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organization ID</p>
              <p className="text-sm mt-1 font-mono text-xs">{organization.id}</p>
            </div>
            {currentOrg?.slug && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Role</p>
                  <Badge className={`mt-1 ${roleColors[role] || roleColors.MEMBER}`}>
                    {role}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/dashboard/organizations/${currentOrg?.slug || organization.slug}`}>
                <Building2 className="h-4 w-4 mr-2" />
                View Organization Dashboard
              </Link>
            </Button>
            {role === "ADMIN" && (
              <>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/organizations/${currentOrg?.slug || organization.slug}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Organization Settings
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/organizations/${currentOrg?.slug || organization.slug}/members`}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" className="w-full justify-start" asChild>
              <a
                href={`https://dashboard.clerk.com/organizations/${organization.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Clerk Dashboard
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* All Organizations */}
      {orgListLoaded && userMemberships?.data && userMemberships.data.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Organizations</CardTitle>
            <CardDescription>
              You are a member of {userMemberships.data.length} organization{userMemberships.data.length !== 1 ? "s" : ""}. Click to switch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userMemberships.data.map((membership) => {
                const org = membership.organization;
                const isActive = org.id === organization?.id;
                
                const handleSwitchOrg = async () => {
                  if (!isActive && setActive) {
                    try {
                      await setActive({ organization: org.id });
                      toast.success(`Switched to ${org.name}`);
                      // Refresh the page to update all organization-dependent data
                      window.location.reload();
                    } catch (error) {
                      console.error("Error switching organization:", error);
                      toast.error("Failed to switch organization");
                    }
                  }
                };

                return (
                  <div
                    key={org.id}
                    onClick={handleSwitchOrg}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? "bg-accent border-primary"
                        : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {org.imageUrl ? (
                        <img
                          src={org.imageUrl}
                          alt={org.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

