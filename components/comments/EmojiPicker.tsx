"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

type PickerPosition = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  marginTop?: string;
  marginBottom?: string;
  maxHeight?: string;
  transform?: string;
};

export function EmojiPickerComponent({ onEmojiSelect, trigger, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const adjustPosition = () => {
    if (!containerRef.current || !pickerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const pickerHeight = 435;
    const pickerWidth = 352;
    const spacing = 8;
    
    // Calculate available space
    const spaceBelow = viewportHeight - containerRect.bottom;
    const spaceAbove = containerRect.top;
    const spaceRight = viewportWidth - containerRect.left;
    const spaceLeft = containerRect.left;
    
    const newPosition: PickerPosition = {};

    // Adjust vertical position - prefer opening downward, but open upward if not enough space
    if (spaceBelow >= pickerHeight + spacing) {
      // Enough space below - open downward
      newPosition.top = "100%";
      newPosition.marginTop = `${spacing}px`;
    } else if (spaceAbove >= pickerHeight + spacing) {
      // Enough space above - open upward
      newPosition.bottom = "100%";
      newPosition.marginBottom = `${spacing}px`;
    } else {
      // Not enough space either way - use available space and allow scrolling
      if (spaceBelow > spaceAbove) {
        newPosition.top = "100%";
        newPosition.marginTop = `${spacing}px`;
        newPosition.maxHeight = `${spaceBelow - spacing}px`;
      } else {
        newPosition.bottom = "100%";
        newPosition.marginBottom = `${spacing}px`;
        newPosition.maxHeight = `${spaceAbove - spacing}px`;
      }
    }

    // Adjust horizontal position
    if (spaceRight >= pickerWidth) {
      // Enough space on right - align to left
      newPosition.left = "0";
    } else if (spaceLeft >= pickerWidth) {
      // Enough space on left - align to right
      newPosition.right = "0";
    } else {
      // Center it if neither side has enough space
      newPosition.left = "50%";
      newPosition.transform = "translateX(-50%)";
    }

    setPosition(newPosition);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      adjustPosition();
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
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
        <div
          ref={pickerRef}
          className="absolute z-50"
          style={{
            ...position,
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={352}
            height={position.maxHeight ? undefined : 435}
            style={position.maxHeight ? { maxHeight: position.maxHeight } : undefined}
            skinTonesDisabled
            previewConfig={{
              showPreview: false,
            }}
          />
        </div>
      )}
    </div>
  );
}
