"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Theme</span>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose your preferred theme. System will follow your device settings.
            </p>
          </div>

          {/* Theme Preview */}
          <div className="space-y-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Preview</span>
            <div className="grid grid-cols-3 gap-3">
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'light' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                onClick={() => setTheme('light')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-4 w-4" />
                  <span className="text-sm font-medium">Light</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-200 rounded"></div>
                  <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                </div>
              </div>
              
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'dark' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                onClick={() => setTheme('dark')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4" />
                  <span className="text-sm font-medium">Dark</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-700 rounded"></div>
                  <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                </div>
              </div>
              
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  theme === 'system' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                onClick={() => setTheme('system')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm font-medium">System</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
