"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableItemProps = {
  id: string;
  children: ReactNode;
  onClick?: () => void; // add optional onClick prop
};

export function SortableItem({ id, children, onClick }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  // Track if a drag occurred
  const moved = !!transform?.x || !!transform?.y;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-item"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!moved && onClick) {
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}
