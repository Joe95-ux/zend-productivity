"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

interface Invitation {
  email: string;
  role: "MEMBER" | "OBSERVER";
}

type OnboardingStep = "welcome" | "choice" | "name" | "invite";

const steps: OnboardingStep[] = ["welcome", "choice", "name", "invite"];

export default function OnboardingPage() {
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
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

  // Auto-advance from welcome step
  useEffect(() => {
    if (hasChecked && step === "welcome") {
      const timer = setTimeout(() => {
        setStep("choice");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasChecked, step]);

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create organization";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      try {
        return await response.json();
      } catch {
        throw new Error("Invalid response from server");
      }
    },
    onSuccess: (organization) => {
      if (invitations.length > 0) {
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
          role: invitations[0]?.role || "MEMBER",
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

  const currentStepIndex = steps.findIndex((s) => s === step);

  // Show loading while checking
  if (!hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Indicator - Top */}
      <div className="w-full border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            {steps.map((stepItem, index) => {
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              
              return (
                <div key={stepItem} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                      isCompleted
                        ? "bg-teal-800 text-white"
                        : isActive
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-12 h-0.5 transition-all duration-300",
                        isCompleted ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Welcome Step */}
          {step === "welcome" && (
            <div className="space-y-6 text-center animate-in fade-in-50 duration-500">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                  Welcome to Zend
                </h1>
                <p className="text-lg text-muted-foreground">
                  You&apos;ve successfully signed up. Let&apos;s set up your workspace.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span>Preparing your workspace...</span>
              </div>
            </div>
          )}

          {/* Choice Step */}
          {step === "choice" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 text-center max-w-[35rem] w-full mx-auto">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  Choose your account type
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  Start with a personal workspace or create an organization for your team
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                {/* Personal Account Option */}
                <button
                  onClick={handleSkip}
                  className="group relative p-8 rounded-xl border border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-md bg-background"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-lg">Personal Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Start with a personal workspace
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-sm pt-2">
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Create personal boards</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Invite collaborators later</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Upgrade anytime</span>
                    </li>
                  </ul>
                </button>

                {/* Organization Option */}
                <button
                  onClick={handleCreateOrg}
                  className="group relative p-8 rounded-xl border border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-md bg-background"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-lg">Organization</h3>
                      <p className="text-sm text-muted-foreground">
                        Create an organization for your team
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-sm pt-2">
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Team boards & collaboration</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Member management</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Role-based access</span>
                    </li>
                  </ul>
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-2">
                You can always create an organization later from your dashboard
              </p>
            </div>
          )}

          {/* Organization Name Step */}
          {step === "name" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-1
               mx-auto max-w-[35rem] w-full text-center">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  Create your organization
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  Set up your workspace to collaborate with your team
                </p>
              </div>

              <div className="space-y-6 pt-4 max-w-[35rem] w-full mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-[15px]">
                    Organization name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Inc."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-11"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be visible to all members
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-description" className="text-[15px]">
                    Description <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="org-description"
                    placeholder="What does your organization do?"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 max-w-[35rem] w-full mx-auto">
                <Button
                  onClick={() => setStep("choice")}
                  variant="outline"
                  className="flex-1 sm:flex-initial h-11 text-[1rem]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep("invite")}
                  disabled={!orgName.trim()}
                  className="flex-1 bg-teal-700 hover:bg-teal-900 text-white h-11 text-[1rem]"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!orgName.trim() || createOrgMutation.isPending}
                  variant="ghost"
                  className="flex-1 sm:flex-initial h-11 text-[1rem]"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Skip for now"}
                </Button>
              </div>
            </div>
          )}

          {/* Invite Members Step */}
          {step === "invite" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 mx-auto max-w-[35rem] w-full text-center">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  Invite team members
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  Add members to your organization. You can invite more later.
                </p>
              </div>

              <div className="space-y-6 pt-4 max-w-[35rem] w-full mx-auto">
                <div className="flex flex-col sm:flex-row gap-3 text-[15px]">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invite-email" className="text-[15px]">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addInvitation();
                        }
                      }}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2 flex-1 sm:flex-initial text-[15px]">
                    <Label htmlFor="invite-role" className="text-[15px]">Role</Label>
                    <Select
                      value={newInviteRole}
                      onValueChange={(value: "MEMBER" | "OBSERVER") =>
                        setNewInviteRole(value)
                      }
                    >
                      <SelectTrigger id="invite-role" className="h-11 min-h-11 text-[15px] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="OBSERVER">Observer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end flex-1 sm:flex-initial">
                    <Button
                      onClick={addInvitation}
                      className="h-11 px-6 bg-teal-700 hover:bg-teal-900 text-white sm:w-auto w-full text-[15px]"
                      disabled={!newInviteEmail.trim() || !newInviteEmail.includes("@")}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {invitations.length > 0 && (
                  <div className="space-y-3 max-w-[35rem] w-full mx-auto">
                    <p className="text-sm font-medium">
                      {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"} added
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {invitations.map((inv) => (
                        <div
                          key={inv.email}
                          className="flex items-center justify-between p-4 rounded-lg border border-teal-300 bg-background hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {inv.email}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0">
                              {inv.role === "MEMBER" ? "Member" : "Observer"}
                            </span>
                          </div>
                          <Button
                            onClick={() => removeInvitation(inv.email)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-[35rem] w-full mx-auto">
                <Button
                  onClick={() => setStep("name")}
                  variant="outline"
                  className="flex-1 sm:flex-initial text-[1rem] h-11"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrgMutation.isPending}
                  className="flex-1 bg-teal-700 hover:bg-teal-9000 text-white text-[1rem] h-11"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create organization"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
