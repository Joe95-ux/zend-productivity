"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// Common emoji sets (Trello-style)
const EMOJI_CATEGORIES = {
  frequentlyUsed: ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏", "🔥"],
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑"],
  gestures: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  objects: ["⭐", "🌟", "💫", "✨", "🔥", "💯", "🎉", "🎊", "🏆", "🥇", "🥈", "🥉", "✅", "❌", "⭕", "❓", "❗", "💡"],
};

const ALL_EMOJIS = [
  ...EMOJI_CATEGORIES.frequentlyUsed,
  ...EMOJI_CATEGORIES.smileys,
  ...EMOJI_CATEGORIES.gestures,
  ...EMOJI_CATEGORIES.hearts,
  ...EMOJI_CATEGORIES.objects,
];

export function EmojiPicker({ onEmojiSelect, trigger, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={pickerRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Add reaction"
        >
          <Smile className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 w-64 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {/* Frequently Used */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Frequently Used
              </p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES.frequentlyUsed.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-lg transition-colors"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* All Emojis */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                All
              </p>
              <div className="grid grid-cols-8 gap-1">
                {ALL_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-lg transition-colors"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

