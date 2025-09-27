"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableItem } from "../src/app/sortable-item"; // adjust path if needed
import PriorityBadge from "./PriorityBadge";


type Patient = {
  _id: string;
  name: string;
  symptoms: string;
  priority: number;
};

export default function PriorityQueue() {
  const [patients, setPatients] = useState<Patient[]>([]);

  // Fetch patients from backend
  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch("http://localhost:5000/api/patients");
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
      }
    }
    fetchPatients();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = patients.findIndex((p) => p._id === active.id);
      const newIndex = patients.findIndex((p) => p._id === over.id);
      const reordered = arrayMove(patients, oldIndex, newIndex);

      setPatients(reordered);

      // Send new order to backend
      try {
        const orderedIds = reordered.map((p) => p._id);
        await fetch("http://localhost:5000/api/patients/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
      } catch (err) {
        console.error("Error saving new order:", err);
      }
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={patients.map((p) => p._id)}
          strategy={verticalListSortingStrategy}
        >
          {patients.map((patient, idx) => (
            <SortableItem key={patient._id} id={patient._id}>
              <div className="p-4 rounded-xl shadow bg-white flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">
                    {idx + 1}. {patient.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Symptoms: {patient.symptoms}
                  </p>
                </div>                         
                <PriorityBadge level={patient.priority} />
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
