import React from "react";
import PriorityBadge from "./PriorityBadge";

type Patient = {
  _id: string;
  name: string;
  symptoms: string;
  urgency_level: number;
  urgency_level_text: string;
  differential_diagnosis?: {
    rank: number;
    diagnosis: string;
    probability_percent: number;
  }[];
  notes?: string;
};

type Props = {
  patient: Patient | null;
  onClose: () => void;
};

export default function PatientDetailsPanel({ patient, onClose }: Props) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 transform transition-transform duration-300 ${
        patient ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Patient Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {patient && (
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          <div>
            <p className="font-bold text-gray-800">{patient.name}</p>
            <PriorityBadge level={patient.urgency_level} />
            <p className="text-sm text-gray-600 mt-1">
              Urgency: {patient.urgency_level_text}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Symptoms</h3>
            <p className="text-gray-600">{patient.symptoms}</p>
          </div>

          {patient.differential_diagnosis && (
            <div>
              <h3 className="font-semibold text-gray-700">Differential Diagnosis</h3>
              <ul className="list-disc list-inside text-gray-600">
                {patient.differential_diagnosis.map((d) => (
                  <li key={d.rank}>
                    {d.rank}. {d.diagnosis} ({d.probability_percent}%)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {patient.notes && (
            <div>
              <h3 className="font-semibold text-gray-700">Notes</h3>
              <p className="text-gray-600">{patient.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
