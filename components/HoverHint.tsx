"use client";

import * as React from "react";

type HoverHintProps = {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function HoverHint({ label, children, side = "top" }: HoverHintProps) {
  return (
    <div className="relative group inline-flex items-center justify-center">
      {children}
      <span
        role="tooltip"
        className={`absolute opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-all duration-200 ease-in-out z-50 px-2 py-1 text-xs font-medium 
                    rounded-md whitespace-nowrap shadow-md
                    bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900
                    ${
                      side === "top"
                        ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
                        : side === "bottom"
                        ? "top-full mt-2 left-1/2 -translate-x-1/2"
                        : side === "left"
                        ? "right-full mr-2 top-1/2 -translate-y-1/2"
                        : "left-full ml-2 top-1/2 -translate-y-1/2"
                    }`}
      >
        {label}
      </span>
    </div>
  );
}
