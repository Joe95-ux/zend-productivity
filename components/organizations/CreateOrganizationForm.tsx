"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
  showDescription?: boolean;
}

export function CreateOrganizationForm({ 
  onSuccess, 
  showDescription = true 
}: CreateOrganizationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActive } = useOrganizationList();
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

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
    onSuccess: async (organization) => {
      // Invalidate queries to refresh organization data
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["clerkOrganizations"] });
      
      // Force Clerk to refresh organization list
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["clerkOrganizations"] });
      }, 1000);

      // Set the newly created organization as active
      if (setActive) {
        try {
          // We need to get the Clerk org ID from the response or fetch it
          // For now, we'll reload the page to let Clerk sync
          toast.success("Organization created successfully!");
          
          // Give Clerk a moment to sync, then reload
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error("Error setting active organization:", error);
          toast.success("Organization created! Please refresh the page.");
        }
      } else {
        toast.success("Organization created successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setIsSubmitting(true);
    createOrgMutation.mutate({
      name: orgName,
      description: orgDescription || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization Name *</Label>
        <Input
          id="org-name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Enter organization name"
          required
          minLength={3}
          maxLength={100}
          disabled={isSubmitting || createOrgMutation.isPending}
        />
        <p className="text-xs text-muted-foreground">
          Must be at least 3 characters long
        </p>
      </div>

      {showDescription && (
        <div className="space-y-2">
          <Label htmlFor="org-description">Description (Optional)</Label>
          <Textarea
            id="org-description"
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value)}
            placeholder="Enter organization description"
            rows={3}
            maxLength={500}
            disabled={isSubmitting || createOrgMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {orgDescription.length}/500 characters
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || createOrgMutation.isPending || !orgName.trim()}
      >
        {isSubmitting || createOrgMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4 mr-2" />
            Create Organization
          </>
        )}
      </Button>
    </form>
  );
}

