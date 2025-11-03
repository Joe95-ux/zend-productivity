"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Users, Mail, ArrowRight, X, Check, ArrowLeft } from "lucide-react";

interface Invitation {
  email: string;
  role: "MEMBER" | "OBSERVER";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);
  const [step, setStep] = useState<"choice" | "name" | "invite">("choice");
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<"MEMBER" | "OBSERVER">("MEMBER");

  // Check if user already has organizations
  useEffect(() => {
    const checkOrganizations = async () => {
      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const orgs = await response.json();
          // If user already has organizations, skip onboarding
          if (orgs.length > 0) {
            router.push("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking organizations:", error);
      }
      setHasChecked(true);
    };

    checkOrganizations();
  }, [router]);

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create organization");
      }

      return response.json();
    },
    onSuccess: (organization) => {
      if (invitations.length > 0) {
        // Send invitations
        sendInvitations(organization.id);
      } else {
        toast.success("Organization created successfully!");
        router.push("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const sendInvitations = async (orgId: string) => {
    try {
      const emails = invitations.map((inv) => inv.email);
      const response = await fetch(`/api/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          role: invitations[0]?.role || "MEMBER", // Use first role, or make it per-invite
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitations");
      }

      toast.success("Organization created and invitations sent!");
      router.push("/dashboard");
    } catch {
      toast.error("Organization created but failed to send invitations");
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    // User chooses to continue without organization
    // They can create one later from dashboard
    router.push("/dashboard");
  };

  const handleCreateOrg = () => {
    setStep("name");
  };

  const handleCreate = () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    createOrgMutation.mutate({
      name: orgName,
      description: orgDescription || undefined,
    });
  };

  const addInvitation = () => {
    if (!newInviteEmail.trim() || !newInviteEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    if (invitations.some((inv) => inv.email === newInviteEmail.trim().toLowerCase())) {
      toast.error("Email already added");
      return;
    }

    setInvitations([
      ...invitations,
      {
        email: newInviteEmail.trim().toLowerCase(),
        role: newInviteRole,
      },
    ]);
    setNewInviteEmail("");
  };

  const removeInvitation = (email: string) => {
    setInvitations(invitations.filter((inv) => inv.email !== email));
  };

  // Show loading while checking
  if (!hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <Card className="w-full max-w-4xl shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="px-8 pt-8 pb-6">
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {step === "choice" ? "Welcome to Your Workspace" : "Create Your Organization"}
          </CardTitle>
          <CardDescription className="text-base mt-2 text-slate-600 dark:text-slate-400">
            {step === "choice"
              ? "Choose how you'd like to get started. You can always change this later."
              : step === "name"
              ? "Let's set up your organization. This will be your team's shared workspace."
              : "Invite your team members to collaborate. You can add more people later."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8 space-y-8">
          {step === "choice" && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Account Option */}
                <Card
                  className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 group border-2 border-slate-100 dark:border-slate-800"
                  onClick={handleSkip}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Personal Workspace
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Perfect for individual use
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Create and manage personal boards</span>
                      </li>
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Invite collaborators when needed</span>
                      </li>
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Upgrade to organization anytime</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Start Personal Workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Organization Option */}
                <Card
                  className="cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 group border-2 border-slate-100 dark:border-slate-800"
                  onClick={handleCreateOrg}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                        <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Organization
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Ideal for teams and collaboration
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Shared team boards and projects</span>
                      </li>
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Advanced member management</span>
                      </li>
                      <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">Role-based permissions</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                      Create Organization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You can create an organization anytime from your dashboard
                </p>
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Acme Inc., Marketing Team, Project Alpha"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full h-11"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This will be the display name for your organization
                  </p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Description <span className="text-slate-400 dark:text-slate-500">(Optional)</span>
                  </label>
                  <Textarea
                    placeholder="Briefly describe your organization's purpose or focus..."
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Help team members understand your organization&apos;s purpose
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  onClick={() => setStep("choice")}
                  variant="outline"
                  className="flex-1 order-2 sm:order-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Options
                </Button>
                <Button
                  onClick={() => setStep("invite")}
                  disabled={!orgName.trim()}
                  className="flex-1 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Team Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center">
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Skip organization setup for now
                </Button>
              </div>
            </>
          )}

          {step === "invite" && (
            <>
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-4 pb-2">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Invite Your Team
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Add members to collaborate in your organization. This is optional - you can invite people later.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="teammate@company.com"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addInvitation();
                        }
                      }}
                      className="flex-1 h-11"
                    />
                    <Select
                      value={newInviteRole}
                      onValueChange={(value: "MEMBER" | "OBSERVER") =>
                        setNewInviteRole(value)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[140px] h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="OBSERVER">Observer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={addInvitation}
                      className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add
                    </Button>
                  </div>

                  {invitations.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {invitations.length} {invitations.length === 1 ? "member" : "members"} to invite
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {invitations.map((inv) => (
                          <div
                            key={inv.email}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block truncate">
                                  {inv.email}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {inv.role === "MEMBER" ? "Can edit and collaborate" : "View-only access"}
                                </span>
                              </div>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex-shrink-0">
                                {inv.role === "MEMBER" ? "Member" : "Observer"}
                              </span>
                            </div>
                            <Button
                              onClick={() => removeInvitation(inv.email)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex-shrink-0 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  onClick={() => setStep("name")}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Details
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrgMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createOrgMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Organization...
                    </>
                  ) : (
                    <>
                      Create Organization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}