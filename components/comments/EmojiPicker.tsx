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
      const target = event.target as Node;
      
      // Check if click is outside both the picker and the trigger container
      if (
        pickerRef.current && 
        containerRef.current &&
        !pickerRef.current.contains(target) &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      adjustPosition();
      // Also adjust position on scroll/resize
      window.addEventListener("scroll", adjustPosition, true);
      window.addEventListener("resize", adjustPosition);
      
      // Use 'click' event instead of 'mousedown' so emoji clicks can process first
      // Add a small delay to ensure emoji click handlers have registered
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside, true);
      }, 50);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside, true);
        window.removeEventListener("scroll", adjustPosition, true);
        window.removeEventListener("resize", adjustPosition);
      };
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {trigger ? (
        <div onClick={handleTriggerClick} className="inline-block">{trigger}</div>
      ) : (
        <button
          onClick={handleTriggerClick}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          aria-label="Add reaction"
        >
          <Smile className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[99999]"
          onMouseDown={(e) => {
            // Stop all mouse events from propagating to modal elements
            e.stopPropagation();
          }}
          onClick={(e) => {
            // Stop all click events from propagating to modal elements
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            // Stop pointer events as well
            e.stopPropagation();
          }}
          style={{
            top: position.topPx ? `${position.topPx}px` : undefined,
            bottom: position.bottomPx ? `${position.bottomPx}px` : undefined,
            left: position.leftPx ? `${position.leftPx}px` : undefined,
            right: position.rightPx ? `${position.rightPx}px` : undefined,
            maxHeight: position.maxHeight,
            transform: position.transform,
            pointerEvents: 'auto', // Ensure the picker captures pointer events
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
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
        </div>,
        document.body
      )}
    </div>
  );
}
