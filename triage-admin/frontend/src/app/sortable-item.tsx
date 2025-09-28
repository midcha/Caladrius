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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  // Track if a drag occurred
  const moved = !!transform?.x || !!transform?.y;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-item flex items-stretch gap-2"
      onClick={() => {
        if (!moved && onClick) {
          onClick();
        }
      }}
    >
      {/* Dedicated drag handle so only this area starts a drag */}
      <button
        type="button"
        aria-label="Drag"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="shrink-0 select-none"
        style={{
          cursor: "grab",
          touchAction: "none",
          padding: "0.25rem 0.4rem",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#fff",
          color: "#6b7280",
          alignSelf: "center",
        }}
        onClick={(e) => e.stopPropagation()} // clicking handle shouldn't trigger row click
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
