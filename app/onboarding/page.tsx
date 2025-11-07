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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, UsersRound, Mail, ArrowRight, X, Check, ArrowLeft, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invitation {
  email: string;
  role: "MEMBER" | "OBSERVER";
}

type OnboardingStep = "welcome" | "choice" | "name" | "invite" | "setting-up" | "goal" | "team-size" | "workspace";

// Steps to show in progress indicator (excluding transient steps like "setting-up")
const steps: OnboardingStep[] = ["welcome", "choice", "name", "invite", "goal", "team-size", "workspace"];

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hasChecked, setHasChecked] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<"MEMBER" | "OBSERVER">("MEMBER");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [teamSize, setTeamSize] = useState<string>("");

  // Check if user already has organizations
  useEffect(() => {
    const checkOrganizations = async () => {
      try {
        const response = await fetch("/api/organizations");
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Non-JSON response from organizations API");
          setHasChecked(true);
          return;
        }

        if (response.ok) {
          const orgs = await response.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            router.push("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking organizations:", error);
        // Continue with onboarding even if check fails
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

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMessage = "Failed to create organization";
        
        if (isJson) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
        } else {
          // Handle HTML error pages (like 405 Method Not Allowed)
          const text = await response.text();
          if (response.status === 405) {
            errorMessage = "Method not allowed. Please check your API configuration.";
          } else {
            errorMessage = response.statusText || `HTTP ${response.status}`;
          }
          console.error("Non-JSON error response:", text.substring(0, 200));
        }
        
        throw new Error(errorMessage);
      }

      if (isJson) {
        try {
          return await response.json();
        } catch {
          throw new Error("Invalid JSON response from server");
        }
      } else {
        throw new Error("Server returned non-JSON response");
      }
    },
    onSuccess: (organization) => {
      // Invalidate queries to refresh organization data
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["clerkOrganizations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      
      // Force Clerk to refresh organization list
      // Clerk's useOrganizationList should auto-refresh, but we'll give it a moment
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["clerkOrganizations"] });
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      }, 1000);
      
      // Show transition screen immediately
      setStep("setting-up");
      
      // Process invitations in background
      if (invitations.length > 0) {
        sendInvitations(organization.id);
      } else {
        // No invitations - go to goal step after setting-up
        setTimeout(() => {
          setStep("goal");
        }, 1500);
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

      // Wait a moment for everything to process, then go to goal step
      setTimeout(() => {
        setStep("goal");
      }, 1000);
    } catch {
      // Even if invitations fail, go to goal step
      // User can invite members later
      setTimeout(() => {
        setStep("goal");
      }, 1000);
    }
  };

  const handleSkip = () => {
    // If skipping from choice, go to goal step
    if (step === "choice") {
      setStep("goal");
    } else {
      // Otherwise, skip to dashboard
      router.push("/dashboard");
    }
  };

  const handleNext = () => {
    if (step === "goal") {
      setStep("team-size");
    } else if (step === "team-size") {
      setStep("workspace");
    } else if (step === "workspace") {
      // Invalidate queries before navigating to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      router.push("/dashboard");
    }
  };

  const handleSkipStep = () => {
    if (step === "goal") {
      setStep("team-size");
    } else if (step === "team-size") {
      setStep("workspace");
    } else if (step === "workspace") {
      // Invalidate queries before navigating to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      router.push("/dashboard");
    }
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

  // Calculate current step index for progress indicator
  // "setting-up" is a transient step, so show progress as if we're at "goal" step
  const currentStepIndex = step === "setting-up" 
    ? steps.findIndex((s) => s === "goal")
    : steps.findIndex((s) => s === step);

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
                      <UsersRound className="w-6 h-6 text-primary" />
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
                          className="flex items-center justify-between p-4 rounded-lg border border-teal-900 bg-background hover:bg-muted/50 transition-colors"
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

          {/* Setting Up Step */}
          {step === "setting-up" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-6 mx-auto max-w-[35rem] w-full text-center">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping"></div>
                    <div className="relative rounded-full bg-teal-500/10 p-6">
                      <Loader2 className="h-12 w-12 text-teal-600 dark:text-teal-400 animate-spin" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-[2rem] font-semibold tracking-tight">
                    Setting up your workspace
                  </h1>
                  <p className="text-[1rem] text-muted-foreground max-w-md mx-auto">
                    We&apos;re creating your organization and {invitations.length > 0 ? "sending invitations" : "preparing everything"}. This will just take a moment...
                  </p>
                </div>
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span>Organization created</span>
                  </div>
                  {invitations.length > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 text-teal-600 dark:text-teal-400 animate-spin" />
                      <span>Sending {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Goal Step */}
          {step === "goal" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 mx-auto max-w-[35rem] w-full text-center">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  What&apos;s your primary goal?
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  Help us personalize your experience
                </p>
              </div>

              <div className="space-y-3 max-w-[35rem] w-full mx-auto">
                {[
                  { value: "project-management", label: "Project Management", icon: "📋" },
                  { value: "task-tracking", label: "Task Tracking", icon: "✅" },
                  { value: "team-collaboration", label: "Team Collaboration", icon: "👥" },
                  { value: "personal-organization", label: "Personal Organization", icon: "📝" },
                  { value: "other", label: "Other", icon: "💡" },
                ].map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => setPrimaryGoal(goal.value)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all",
                      primaryGoal === goal.value
                        ? "border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-950/20"
                        : "border-border hover:border-teal-300 dark:hover:border-teal-700 bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{goal.icon}</span>
                      <span className="font-medium">{goal.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-[35rem] w-full mx-auto">
                <Button
                  onClick={handleSkipStep}
                  variant="ghost"
                  className="flex-1 sm:flex-initial text-[1rem] h-11"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!primaryGoal}
                  className="flex-1 bg-teal-700 hover:bg-teal-900 text-white text-[1rem] h-11"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Team Size Step */}
          {step === "team-size" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 mx-auto max-w-[35rem] w-full text-center">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  What&apos;s your team size?
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  This helps us recommend the right features
                </p>
              </div>

              <div className="space-y-3 max-w-[35rem] w-full mx-auto">
                {[
                  { value: "just-me", label: "Just me", description: "Solo work" },
                  { value: "2-5", label: "2-5 people", description: "Small team" },
                  { value: "6-15", label: "6-15 people", description: "Growing team" },
                  { value: "16-50", label: "16-50 people", description: "Medium team" },
                  { value: "50+", label: "50+ people", description: "Large organization" },
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setTeamSize(size.value)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all",
                      teamSize === size.value
                        ? "border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-950/20"
                        : "border-border hover:border-teal-300 dark:hover:border-teal-700 bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{size.label}</div>
                        <div className="text-sm text-muted-foreground">{size.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-[35rem] w-full mx-auto">
                <Button
                  onClick={handleSkipStep}
                  variant="ghost"
                  className="flex-1 sm:flex-initial text-[1rem] h-11"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!teamSize}
                  className="flex-1 bg-teal-700 hover:bg-teal-900 text-white text-[1rem] h-11"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Workspace Creation Step */}
          {step === "workspace" && (
            <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 mx-auto max-w-[35rem] w-full text-center">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  Create your first workspace
                </h1>
                <p className="text-[1rem] text-muted-foreground">
                  Workspaces help you organize your projects and boards
                </p>
              </div>

              <div className="space-y-6 max-w-[35rem] w-full mx-auto">
                <div className="p-6 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold">Why create a workspace?</h3>
                        <p className="text-sm text-muted-foreground">
                          Workspaces let you group related projects and boards together. You can create multiple workspaces for different purposes.
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-13">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span>Organize projects by client, department, or initiative</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span>Invite team members to collaborate</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span>Create as many workspaces as you need</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      // TODO: Open create workspace modal/dialog
                      // For now, just go to dashboard
                      router.push("/dashboard");
                    }}
                    className="w-full bg-teal-700 hover:bg-teal-900 text-white text-[1rem] h-11"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You can create workspaces later from your dashboard
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-[35rem] w-full mx-auto">
                <Button
                  onClick={handleSkipStep}
                  variant="ghost"
                  className="flex-1 sm:flex-initial text-[1rem] h-11"
                >
                  Skip for now
                </Button>
                  <Button
                    onClick={() => {
                      // Invalidate queries before navigating to ensure fresh data
                      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                      queryClient.invalidateQueries({ queryKey: ["organizations"] });
                      router.push("/dashboard");
                    }}
                    variant="outline"
                    className="flex-1 text-[1rem] h-11"
                  >
                    Go to Dashboard
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
