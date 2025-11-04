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
import { Building2, Users, Mail, ArrowRight, X, Check, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invitation {
  email: string;
  role: "MEMBER" | "OBSERVER";
}

type OnboardingStep = "welcome" | "choice" | "name" | "invite";

interface StepItem {
  id: OnboardingStep;
  title: string;
  description: string;
}

const steps: StepItem[] = [
  {
    id: "welcome",
    title: "Welcome",
    description: "You've successfully signed up",
  },
  {
    id: "choice",
    title: "Choose Account Type",
    description: "Personal or Organization",
  },
  {
    id: "name",
    title: "Organization Details",
    description: "Set up your organization",
  },
  {
    id: "invite",
    title: "Invite Members",
    description: "Add team members (optional)",
  },
];

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

  const getCurrentStepIndex = (): number => {
    return steps.findIndex((s) => s.id === step);
  };

  const isStepCompleted = (stepId: OnboardingStep): boolean => {
    const currentIndex = getCurrentStepIndex();
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    return stepIndex < currentIndex;
  };

  const isStepActive = (stepId: OnboardingStep): boolean => {
    return step === stepId;
  };

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Sidebar - Step Indicator */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <div className="space-y-1 mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Get Started</h1>
                <p className="text-sm text-muted-foreground">
                  Complete your setup in just a few steps
                </p>
              </div>

              {/* Step List */}
              <div className="space-y-6">
                {steps.map((stepItem, index) => {
                  const isCompleted = isStepCompleted(stepItem.id);
                  const isActive = isStepActive(stepItem.id);
                  const showLine = index < steps.length - 1;

                  return (
                    <div key={stepItem.id} className="relative">
                      <div className="flex gap-4">
                        {/* Step Circle */}
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground"
                                : isActive
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-muted border-muted-foreground/20 text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <span className="text-xs font-medium">{index + 1}</span>
                            )}
                          </div>
                          {/* Connecting Line */}
                          {showLine && (
                            <div
                              className={cn(
                                "w-0.5 h-12 mt-2 transition-colors",
                                isCompleted ? "bg-primary" : "bg-border"
                              )}
                            />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 pt-1 pb-6">
                          <h3
                            className={cn(
                              "text-sm font-medium mb-1 transition-colors",
                              isActive || isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {stepItem.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {stepItem.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-8">
            <div className="max-w-2xl mx-auto">
              {/* Welcome Step */}
              {step === "welcome" && (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">Welcome!</h2>
                    <p className="text-muted-foreground">
                      You&apos;ve successfully signed up. Let&apos;s set up your workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span>Preparing your workspace...</span>
                  </div>
                </div>
              )}

              {/* Choice Step */}
              {step === "choice" && (
                <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Choose Your Account Type
                    </h2>
                    <p className="text-muted-foreground">
                      Start with a personal workspace or create an organization for your team
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Personal Account Option */}
                    <button
                      onClick={handleSkip}
                      className="group relative p-6 rounded-lg border-2 border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-md bg-background"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-lg">Personal Account</h3>
                          <p className="text-sm text-muted-foreground">
                            Start with a personal workspace
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Create personal boards</span>
                        </li>
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Invite collaborators later</span>
                        </li>
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Upgrade anytime</span>
                        </li>
                      </ul>
                    </button>

                    {/* Organization Option */}
                    <button
                      onClick={handleCreateOrg}
                      className="group relative p-6 rounded-lg border-2 border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-md bg-background"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-lg">Organization</h3>
                          <p className="text-sm text-muted-foreground">
                            Create an organization for your team
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Team boards & collaboration</span>
                        </li>
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Member management</span>
                        </li>
                        <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Role-based access</span>
                        </li>
                      </ul>
                    </button>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    You can always create an organization later from your dashboard
                  </p>
                </div>
              )}

              {/* Organization Name Step */}
              {step === "name" && (
                <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Create Your Organization
                    </h2>
                    <p className="text-muted-foreground">
                      Set up your workspace to collaborate with your team
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">
                        Organization Name <span className="text-destructive">*</span>
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
                      <Label htmlFor="org-description">
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={() => setStep("choice")}
                      variant="outline"
                      className="flex-1 sm:flex-initial"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
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
                      variant="secondary"
                      className="flex-1 sm:flex-initial"
                    >
                      {createOrgMutation.isPending ? "Creating..." : "Create & Skip"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Invite Members Step */}
              {step === "invite" && (
                <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Invite Team Members
                    </h2>
                    <p className="text-muted-foreground">
                      Add members to your organization. You can invite more later.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
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
                      <div className="space-y-2 sm:w-[140px]">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                          value={newInviteRole}
                          onValueChange={(value: "MEMBER" | "OBSERVER") =>
                            setNewInviteRole(value)
                          }
                        >
                          <SelectTrigger id="invite-role" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="OBSERVER">Observer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={addInvitation}
                          className="h-11 px-6"
                          disabled={!newInviteEmail.trim() || !newInviteEmail.includes("@")}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {invitations.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"} added
                          </p>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {invitations.map((inv) => (
                            <div
                              key={inv.email}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {inv.email}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={() => setStep("name")}
                      variant="outline"
                      className="flex-1 sm:flex-initial"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createOrgMutation.isPending}
                      className="flex-1"
                    >
                      {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
