"use client";

import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash, Copy, Move } from "lucide-react";

export function KeyboardShortcuts() {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { key: "Ctrl + /", description: "Open command palette", icon: Search },
        { key: "Ctrl + K", description: "Quick search", icon: Search },
        { key: "Esc", description: "Close modals", icon: null },
      ]
    },
    {
      category: "Cards",
      items: [
        { key: "N", description: "Create new card", icon: Plus },
        { key: "E", description: "Edit card", icon: Edit },
        { key: "D", description: "Delete card", icon: Trash },
        { key: "C", description: "Copy card", icon: Copy },
        { key: "M", description: "Move card", icon: Move },
      ]
    },
    {
      category: "Lists",
      items: [
        { key: "L", description: "Create new list", icon: Plus },
        { key: "Shift + L", description: "Edit list title", icon: Edit },
      ]
    },
    {
      category: "General",
      items: [
        { key: "Ctrl + S", description: "Save changes", icon: null },
        { key: "Ctrl + Z", description: "Undo", icon: null },
        { key: "Ctrl + Y", description: "Redo", icon: null },
        { key: "F11", description: "Toggle fullscreen", icon: null },
      ]
    }
  ];

  return (
    <div className="space-y-6">
          {shortcuts.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                {category.category}
              </h4>
              <div className="space-y-2">
                {category.items.map((shortcut, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {shortcut.icon && (
                        <shortcut.icon className="h-4 w-4 text-slate-500" />
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {shortcut.description}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Pro Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Hold <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Shift</kbd> while dragging to copy cards</li>
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Tab</kbd> to navigate between form fields</li>
              <li>• Press <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Enter</kbd> to quickly save changes</li>
            </ul>
          </div>
        </div>
  );
}
