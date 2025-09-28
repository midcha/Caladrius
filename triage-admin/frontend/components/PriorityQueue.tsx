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

import { SortableItem } from "../src/app/sortable-item"; // keep drag on row only
import PriorityBadge from "./PriorityBadge";
import styles from "./ui.module.css";
import PatientDetailsPanel from "./PatientDetailsPanel";

type Patient = {
  _id: string;
  name: string;
  symptoms: string;
  urgency_level: number;       // 1–5
  urgency_level_text: string;  // "Emergency", "High", etc.
  differential_diagnosis?: {
    rank: number;
    diagnosis: string;
    probability_percent: number;
  }[];
  clinical_summary?: string;
  disclaimer?: string;
  age?: number;
  notes?: string;
};

export default function PriorityQueue() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Fetch patients from backend
  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch("/api/patients", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          console.error("/api/patients failed:", res.status, text);
          setPatients([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setPatients(data);
        } else {
          console.warn("/api/patients returned non-array:", data);
          setPatients([]);
        }
      } catch (err) {
        console.error("Error fetching patients:", err);
      }
    }
    fetchPatients();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // must move 6px before drag starts
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = patients.findIndex((p) => p._id === active.id);
      const newIndex = patients.findIndex((p) => p._id === over.id);
      const reordered = arrayMove(patients, oldIndex, newIndex);

      setPatients(reordered);

      // Send new order to backend
      try {
        const orderedIds = reordered.map((p) => p._id);
        await fetch("/api/patients/reorder", {
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
    <div className="w-full h-full flex items-stretch gap-6 overflow-y-auto">
      <div className="flex-1 min-w-0 h-full pr-1 flex flex-col">
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
                <div className={`${styles.card} flex justify-between items-center`}>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {idx + 1}. {patient.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Symptoms: {patient.symptoms}
                    </p>
                    {/* Urgency text removed; the badge conveys urgency */}
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityBadge level={patient.urgency_level} />
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={async (e) => {
                        e.stopPropagation(); // don't trigger drag
                        try {
                          // Use Next.js API route (filesystem); proxy only catches unmatched paths
                          const res = await fetch(`/api/patients/${patient._id}`, { cache: 'no-store' });
                          if (!res.ok) {
                            const text = await res.text();
                            console.error('Failed to load patient details', res.status, text);
                            setSelectedPatient(patient);
                            return;
                          }
                          const full = await res.json();
                          setSelectedPatient(full);
                        } catch (err) {
                          console.error('Error fetching patient details', err);
                          setSelectedPatient(patient);
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Side-by-side patient details panel */}
      <div className="w-[22rem] shrink-0 h-full pb-4">
        <PatientDetailsPanel
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      </div>
    </div>
  );
}
