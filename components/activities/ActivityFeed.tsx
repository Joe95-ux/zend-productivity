"use client";

import { useQuery } from "@tanstack/react-query";
import { ConditionalUserProfile } from "@/components/ConditionalUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  message: string;
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

interface ActivityFeedProps {
  boardId: string;
}

export function ActivityFeed({ boardId }: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useQuery<Activity[]>({
    queryKey: ["activities", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/activities?boardId=${boardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      return response.json();
    },
  });

  if (error) {
    return (
      <Card className="py-6">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load activities</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-6">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <ConditionalUserProfile user={activity.user} size="md" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.user.name || activity.user.email}
                    </span>{" "}
                    {activity.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </CardContent>
    </Card>
  );
}
