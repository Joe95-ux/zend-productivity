"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  topPx?: number;
  bottomPx?: number;
  leftPx?: number;
  rightPx?: number;
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
      newPosition.topPx = containerRect.bottom + spacing;
    } else if (spaceAbove >= pickerHeight + spacing) {
      // Enough space above - open upward
      newPosition.bottomPx = viewportHeight - containerRect.top + spacing;
    } else {
      // Not enough space either way - use available space and allow scrolling
      if (spaceBelow > spaceAbove) {
        newPosition.topPx = containerRect.bottom + spacing;
        newPosition.maxHeight = `${spaceBelow - spacing}px`;
      } else {
        newPosition.bottomPx = viewportHeight - containerRect.top + spacing;
        newPosition.maxHeight = `${spaceAbove - spacing}px`;
      }
    }

    // Adjust horizontal position
    if (spaceRight >= pickerWidth) {
      // Enough space on right - align to left edge of container
      newPosition.leftPx = containerRect.left;
    } else if (spaceLeft >= pickerWidth) {
      // Enough space on left - align to right edge of container
      newPosition.rightPx = viewportWidth - containerRect.right;
    } else {
      // Center it if neither side has enough space
      newPosition.leftPx = containerRect.left + (containerRect.width / 2);
      newPosition.transform = "translateX(-50%)";
    }

    setPosition(newPosition);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      adjustPosition();
      // Also adjust position on scroll/resize
      window.addEventListener("scroll", adjustPosition, true);
      window.addEventListener("resize", adjustPosition);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", adjustPosition, true);
        window.removeEventListener("resize", adjustPosition);
      };
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[9999]"
          style={{
            top: position.topPx ? `${position.topPx}px` : undefined,
            bottom: position.bottomPx ? `${position.bottomPx}px` : undefined,
            left: position.leftPx ? `${position.leftPx}px` : undefined,
            right: position.rightPx ? `${position.rightPx}px` : undefined,
            maxHeight: position.maxHeight,
            transform: position.transform,
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
        </div>,
        document.body
      )}
    </div>
  );
}
