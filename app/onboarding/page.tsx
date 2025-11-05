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
import { Building2, Users, Mail, ArrowRight, X, Check, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
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
  icon: React.ReactNode;
}

const steps: StepItem[] = [
  {
    id: "welcome",
    title: "Welcome aboard",
    description: "You've successfully signed up",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "choice",
    title: "Choose account type",
    description: "Personal workspace or organization",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "name",
    title: "Organization details",
    description: "Set up your organization",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: "invite",
    title: "Invite team members",
    description: "Add collaborators (optional)",
    icon: <Mail className="w-5 h-5" />,
  },
];

// Board Preview Component
function BoardPreview({ step }: { step: OnboardingStep }) {
  const getPreviewState = () => {
    switch (step) {
      case "welcome":
        return { lists: 0, cards: 0 };
      case "choice":
        return { lists: 1, cards: 0 };
      case "name":
        return { lists: 2, cards: 3 };
      case "invite":
        return { lists: 3, cards: 6 };
      default:
        return { lists: 0, cards: 0 };
    }
  };

  const { lists, cards } = getPreviewState();

  return (
    <div className="hidden lg:block w-full max-w-md">
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-medium text-muted-foreground">Board Preview</span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: Math.max(1, lists) }).map((_, listIdx) => (
            <div
              key={listIdx}
              className={cn(
                "flex-shrink-0 w-48 rounded-lg border-2 transition-all duration-500",
                listIdx < lists
                  ? "border-primary/30 bg-background shadow-sm"
                  : "border-dashed border-border bg-muted/30 opacity-50"
              )}
            >
              <div className="p-3 space-y-2">
                <div
                  className={cn(
                    "h-5 rounded transition-all duration-300",
                    listIdx < lists
                      ? "bg-primary/20 w-24"
                      : "bg-muted w-16 opacity-50"
                  )}
                />
                {listIdx < lists && (
                  <div className="space-y-1.5 pt-2">
                    {Array.from({
                      length: listIdx === 0 ? Math.min(cards, 2) : listIdx === 1 ? Math.max(0, cards - 2) : Math.max(0, cards - 4),
                    }).map((_, cardIdx) => (
                      <div
                        key={cardIdx}
                        className={cn(
                          "h-16 rounded border transition-all duration-300 animate-in fade-in slide-in-from-top-2",
                          cardIdx < cards
                            ? "bg-background border-border shadow-sm"
                            : "bg-muted border-dashed opacity-50"
                        )}
                        style={{
                          animationDelay: `${cardIdx * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Sidebar - Full Height Step Indicator */}
          <div className="lg:col-span-3">
            <div className="sticky top-8">
              <div className="space-y-1 mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Get Started</h1>
                <p className="text-sm text-muted-foreground">
                  Complete your setup in a few steps
                </p>
              </div>

              {/* Step List with Full-Height Connections */}
              <div className="relative">
                {steps.map((stepItem, index) => {
                  const isCompleted = isStepCompleted(stepItem.id);
                  const isActive = isStepActive(stepItem.id);
                  const isLast = index === steps.length - 1;

                  return (
                    <div key={stepItem.id} className="relative">
                      <div className="flex gap-4 pb-8">
                        {/* Step Circle and Connecting Line Container */}
                        <div className="flex flex-col items-center">
                          {/* Step Circle */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 relative",
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : isActive
                                ? "bg-primary/10 border-primary text-primary shadow-md"
                                : "bg-muted border-border text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <div className="text-primary-foreground">{stepItem.icon}</div>
                            )}
                          </div>
                          
                          {/* Full-Height Connecting Line (except for last step) */}
                          {!isLast && (
                            <div
                              className={cn(
                                "absolute top-10 left-1/2 -translate-x-1/2 w-0.5 transition-all duration-500",
                                isCompleted ? "bg-primary" : "bg-border",
                                index === 0 ? "h-full" : "h-full"
                              )}
                              style={{ height: "calc(100% + 2rem)" }}
                            />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 pt-2 pb-8">
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
                          <p className="text-xs text-muted-foreground leading-relaxed">
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

          {/* Center Column - Main Content */}
          <div className="lg:col-span-6">
            <div className="max-w-2xl mx-auto">
              {/* Welcome Step */}
              {step === "welcome" && (
                <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-semibold tracking-tight">Welcome!</h2>
                      <p className="text-lg text-muted-foreground">
                        You&apos;ve successfully signed up. Let&apos;s set up your workspace.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span>Preparing your workspace...</span>
                  </div>
                </div>
              )}

              {/* Choice Step */}
              {step === "choice" && (
                <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2 text-center">
                    <h2 className="text-4xl font-semibold tracking-tight">
                      Choose Your Account Type
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Start with a personal workspace or create an organization for your team
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    {/* Personal Account Option */}
                    <button
                      onClick={handleSkip}
                      className="group relative p-8 rounded-xl border-2 border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-lg bg-background"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                          <Users className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-xl">Personal Account</h3>
                          <p className="text-sm text-muted-foreground">
                            Start with a personal workspace
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-3 text-sm pt-2">
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span>Create personal boards</span>
                        </li>
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span>Invite collaborators later</span>
                        </li>
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span>Upgrade anytime</span>
                        </li>
                      </ul>
                    </button>

                    {/* Organization Option */}
                    <button
                      onClick={handleCreateOrg}
                      className="group relative p-8 rounded-xl border-2 border-border hover:border-primary transition-all text-left space-y-4 hover:shadow-lg bg-background"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                          <Building2 className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-xl">Organization</h3>
                          <p className="text-sm text-muted-foreground">
                            Create an organization for your team
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-3 text-sm pt-2">
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span>Team boards & collaboration</span>
                        </li>
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span>Member management</span>
                        </li>
                        <li className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
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
                  <div className="space-y-2 text-center">
                    <h2 className="text-4xl font-semibold tracking-tight">
                      Create Your Organization
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Set up your workspace to collaborate with your team
                    </p>
                  </div>

                  <div className="space-y-6 pt-4">
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-6">
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
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                  <div className="space-y-2 text-center">
                    <h2 className="text-4xl font-semibold tracking-tight">
                      Invite Team Members
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Add members to your organization. You can invite more later.
                    </p>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row gap-3">
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
                      <div className="space-y-2 sm:w-[160px]">
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
                      <div className="flex items-end sm:flex-shrink-0">
                        <Button
                          onClick={addInvitation}
                          className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto w-full"
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
                              className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-6">
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
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Board Preview */}
          <div className="lg:col-span-3">
            <div className="sticky top-8">
              <BoardPreview step={step} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
