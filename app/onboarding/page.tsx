"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Users, Mail, ArrowRight, X, Check } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === "choice" ? "Welcome!" : "Create Your Organization"}
          </CardTitle>
          <CardDescription>
            {step === "choice"
              ? "Get started with your personal workspace or create an organization to collaborate with your team"
              : "Set up your workspace to collaborate with your team"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "choice" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Personal Account Option */}
                <Card
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={handleSkip}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-lg">Personal Account</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Start with a personal workspace. You can create organizations later.
                    </CardDescription>
                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Create personal boards
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Invite collaborators later
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Upgrade anytime
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Organization Option */}
                <Card
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={handleCreateOrg}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <CardTitle className="text-lg">Organization</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Create an organization to collaborate with your team right away.
                    </CardDescription>
                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Team boards & collaboration
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Member management
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Role-based access
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                You can always create an organization later from your dashboard
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name *</label>
                <Input
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  placeholder="What does your organization do?"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={3}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("choice")}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep("invite")}
                  disabled={!orgName.trim()}
                  className="flex-1"
                >
                  Next: Invite Members
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!orgName.trim() || createOrgMutation.isPending}
                  variant="default"
                  className="flex-1"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create & Skip Invites"}
                </Button>
              </div>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full"
              >
                Skip for Now
              </Button>
            </>
          )}

          {step === "invite" && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Invite Team Members (Optional)</h3>
                </div>

                <div className="flex gap-2">
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
                    className="flex-1"
                  />
                  <select
                    value={newInviteRole}
                    onChange={(e) =>
                      setNewInviteRole(e.target.value as "MEMBER" | "OBSERVER")
                    }
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OBSERVER">Observer</option>
                  </select>
                  <Button onClick={addInvitation} size="sm">
                    Add
                  </Button>
                </div>

                {invitations.length > 0 && (
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div
                        key={inv.email}
                        className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{inv.email}</span>
                          <span className="text-xs text-slate-500">
                            ({inv.role})
                          </span>
                        </div>
                        <Button
                          onClick={() => removeInvitation(inv.email)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("name")}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrgMutation.isPending}
                  className="flex-1"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

