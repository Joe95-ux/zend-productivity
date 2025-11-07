"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceFormProps {
  onSuccess?: () => void;
  organizationId?: string;
}

export function CreateWorkspaceForm({ onSuccess, organizationId }: CreateWorkspaceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateWorkspaceFormData) => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          organizationId: organizationId || organization?.id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create workspace");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch workspaces
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.refetchQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace created successfully!");
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    setIsSubmitting(true);
    try {
      await createWorkspaceMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter workspace name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter workspace description..." 
                  {...field} 
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Describe what this workspace is for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess?.()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

