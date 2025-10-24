"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accessibility, Eye, Type, MousePointer } from "lucide-react";

export function AccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusIndicators, setFocusIndicators] = useState(true);
  const [fontSize, setFontSize] = useState("medium");
  const [cursorSize, setCursorSize] = useState("normal");

  return (
    <Card>
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibility
        </CardTitle>
        <CardDescription>
          Customize the interface for better accessibility and usability
        </CardDescription>
      </CardHeader>
      <CardContent className="py-8">
        <div className="space-y-6">
          {/* Visual Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visual Settings
            </h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">High Contrast</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={setHighContrast}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Large Text</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Increase text size throughout the interface
                </p>
              </div>
              <Switch
                checked={largeText}
                onCheckedChange={setLargeText}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Reduced Motion</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
              />
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Font Size</span>
            </div>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="extra-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interaction */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Interaction
            </h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Focus Indicators</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Show clear focus indicators for keyboard navigation
                </p>
              </div>
              <Switch
                checked={focusIndicators}
                onCheckedChange={setFocusIndicators}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-slate-500" />
                <span className="font-medium">Cursor Size</span>
              </div>
              <Select value={cursorSize} onValueChange={setCursorSize}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select cursor size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Keyboard Navigation Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              ⌨️ Keyboard Navigation
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Tab</kbd> to navigate between elements</li>
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Space</kbd> to activate buttons</li>
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Escape</kbd> to close modals</li>
              <li>• Use arrow keys to navigate within lists and menus</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
