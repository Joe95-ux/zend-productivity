"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type HoverHintProps = {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function HoverHint({ label, children, side = "top" }: HoverHintProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: side === "top" ? rect.top : rect.bottom
      });
    }
  }, [side]);

  React.useEffect(() => {
    if (isHovered) {
      updatePosition();
    }
  }, [isHovered, updatePosition]);

  return (
    <>
      <div 
        ref={ref}
        className="relative group inline-flex items-center justify-center"
        onMouseEnter={() => {
          setIsHovered(true);
          updatePosition();
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] px-2 py-1 text-xs font-medium 
                     rounded-md whitespace-nowrap shadow-lg
                     bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900
                     transition-all duration-200 ease-in-out"
          style={{
            left: position.x,
            top: side === "top" ? position.y - 26 : position.y + 10,
            transform: 'translateX(-50%)'
          }}
        >
          {label}
        </div>,
        document.body
      )}
    </>
  );
}
