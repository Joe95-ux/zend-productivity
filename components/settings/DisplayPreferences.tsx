"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, Calendar, Clock, Grid } from "lucide-react";

export function DisplayPreferences() {
  const [cardDensity, setCardDensity] = useState("comfortable");
  const [dateFormat, setDateFormat] = useState("relative");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <Card>
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Display Preferences
        </CardTitle>
        <CardDescription>
          Customize how content is displayed in your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="py-8">
        <div className="space-y-6">
          {/* Card Density */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Card Density</span>
            </div>
            <Select value={cardDensity} onValueChange={setCardDensity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select card density" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Adjust the spacing between cards and content
            </p>
          </div>

          {/* Date Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Date Format</span>
            </div>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relative">Relative (2 hours ago)</SelectItem>
                <SelectItem value="absolute">Absolute (Dec 15, 2024)</SelectItem>
                <SelectItem value="both">Both (2 hours ago • Dec 15)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Time Format</span>
            </div>
            <Select value={timeFormat} onValueChange={setTimeFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                <SelectItem value="24h">24-hour (14:30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Show Timestamps</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Display creation and update times on cards
                </p>
              </div>
              <Switch
                checked={showTimestamps}
                onCheckedChange={setShowTimestamps}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Compact Mode</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Reduce spacing for more content on screen
                </p>
              </div>
              <Switch
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
