"use client";

import { Draggable } from "@hello-pangea/dnd";
import { ChecklistItem as ChecklistItemType } from "@/lib/types";

interface DraggableChecklistItemProps {
  item: ChecklistItemType;
  index: number;
  children: React.ReactNode;
}

export function DraggableChecklistItem({ item, index, children }: DraggableChecklistItemProps) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => {
        // Don't override the library's positioning - use it exactly as provided
        // The library uses fixed positioning during drag, which must be preserved
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`
              ${!snapshot.isDragging && !snapshot.isDropAnimating ? 'transition-colors duration-200 ease-out' : ''}
              ${snapshot.isDragging 
                ? 'opacity-90 shadow-2xl z-50 bg-white dark:bg-slate-800 rounded-md border-2 border-blue-300 dark:border-blue-600' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md'
              }
              ${snapshot.draggingOver && !snapshot.isDragging
                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600' 
                : ''
              }
            `}
            style={provided.draggableProps.style}
          >
            {children}
          </div>
        );
      }}
    </Draggable>
  );
}
