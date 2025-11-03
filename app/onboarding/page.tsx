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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6">
      <Card className="w-full max-w-2xl shadow-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {step === "choice" ? "Welcome!" : "Create Your Organization"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base mt-2 text-slate-600 dark:text-slate-400">
            {step === "choice"
              ? "Get started with your personal workspace or create an organization to collaborate with your team"
              : "Set up your workspace to collaborate with your team"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-6">
          {step === "choice" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Personal Account Option */}
                <Card
                  className="cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 group border-2"
                  onClick={handleSkip}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Personal Account
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6">
                    <CardDescription className="text-slate-600 dark:text-slate-400 mb-4">
                      Start with a personal workspace. You can create organizations later.
                    </CardDescription>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Create personal boards</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Invite collaborators later</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Upgrade anytime</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Organization Option */}
                <Card
                  className="cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-lg transition-all duration-200 group border-2"
                  onClick={handleCreateOrg}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900 transition-colors">
                        <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Organization
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6">
                    <CardDescription className="text-slate-600 dark:text-slate-400 mb-4">
                      Create an organization to collaborate with your team right away.
                    </CardDescription>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Team boards & collaboration</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Member management</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>Role-based access</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                You can always create an organization later from your dashboard
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Acme Inc."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full h-11"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This name will be visible to all members
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Description <span className="text-slate-400 dark:text-slate-500">(Optional)</span>
                  </label>
                  <Textarea
                    placeholder="What does your organization do?"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => setStep("choice")}
                  variant="outline"
                  className="flex-1 order-2 sm:order-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep("invite")}
                  disabled={!orgName.trim()}
                  className="flex-1 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next: Invite Members
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!orgName.trim() || createOrgMutation.isPending}
                  variant="secondary"
                  className="flex-1 order-3"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create & Skip"}
                </Button>
              </div>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Skip for Now
              </Button>
            </>
          )}

          {step === "invite" && (
            <>
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Invite Team Members
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Optional - You can add members later
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
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
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"} added
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {invitations.map((inv) => (
                        <div
                          key={inv.email}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {inv.email}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                              {inv.role === "MEMBER" ? "Member" : "Observer"}
                            </span>
                          </div>
                          <Button
                            onClick={() => removeInvitation(inv.email)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex-shrink-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => setStep("name")}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrgMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

