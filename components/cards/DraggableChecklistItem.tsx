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
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`transition-all duration-200 ${snapshot.isDragging ? 'opacity-90 scale-105 rotate-2 shadow-2xl z-50' : ''}`}
        >
          {children}
        </div>
      )}
    </Draggable>
  );
}
