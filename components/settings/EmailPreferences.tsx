"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Bell, Clock } from "lucide-react";

export function EmailPreferences() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [emailFrequency, setEmailFrequency] = useState("immediate");
  const [notifyOwnActions, setNotifyOwnActions] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current email preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/email-preferences");
      if (!response.ok) throw new Error("Failed to fetch email preferences");
      return response.json();
    }
  });

  // Update email preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { emailNotifications?: boolean; emailFrequency?: string; notifyOwnActions?: boolean }) => {
      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update email preferences");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Email preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update local state when preferences are fetched
  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.emailNotifications);
      setEmailFrequency(preferences.emailFrequency);
      setNotifyOwnActions(preferences.notifyOwnActions);
    }
  }, [preferences]);

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({
      emailNotifications,
      emailFrequency,
      notifyOwnActions
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pt-8">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive email notifications for watched items
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="space-y-6">
            {/* Email Notifications Toggle Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
              <div className="animate-pulse">
                <div className="h-6 w-11 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>

            {/* Frequency Dropdown Skeleton */}
            <div className="space-y-3">
              <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-md"></div>
              </div>
            </div>

            {/* Notify Own Actions Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
              <div className="animate-pulse">
                <div className="h-6 w-11 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>

            {/* Save Button Skeleton */}
            <div className="flex justify-end">
              <div className="animate-pulse">
                <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
              </div>
            </div>

            {/* Info Text Skeleton */}
            <div className="animate-pulse">
              <div className="h-16 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Configure how you receive email notifications for watched items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 py-8">
        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Email Notifications</span>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Receive email notifications when watched items are updated
            </p>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
            disabled={updatePreferencesMutation.isPending}
          />
        </div>

        {/* Email Frequency */}
        {emailNotifications && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Notification Frequency</span>
            </div>
            <Select
              value={emailFrequency}
              onValueChange={setEmailFrequency}
              disabled={updatePreferencesMutation.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notify Own Actions */}
        {emailNotifications && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-500" />
                <span className="font-medium">Notify for My Own Actions</span>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Receive notifications when you perform actions on watched items
              </p>
            </div>
            <Switch
              checked={notifyOwnActions}
              onCheckedChange={setNotifyOwnActions}
              disabled={updatePreferencesMutation.isPending}
            />
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSavePreferences}
            disabled={updatePreferencesMutation.isPending}
            className="min-w-24"
          >
            {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Info Text */}
        <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Note:</strong> Email notifications are sent for activities on items you&apos;re watching. 
            You can watch cards, lists, or entire boards by using the watch feature in the app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
