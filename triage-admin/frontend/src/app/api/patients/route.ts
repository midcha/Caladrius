import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Patient, IPatient } from "@/models/Patient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    // Prefer manual priority_order if present, then by urgency_level or legacy level
    const docs = await Patient.find()
      .sort({ priority_order: 1, urgency_level: 1, level: 1 })
      .lean();

    const TRIAGE_TEXT: Record<number, string> = {
      1: "Emergency",
      2: "High",
      3: "Moderate",
      4: "Low",
      5: "Routine",
    };

    const payload = docs.map((d: any) => {
      const levelNum: number = d.urgency_level ?? d.level ?? 3;
      const levelText: string = d.urgency_level_text ?? TRIAGE_TEXT[levelNum] ?? "Moderate";
      return {
        _id: d._id?.toString?.() ?? String(d._id),
        name: d.name,
        symptoms: d.symptoms,
        urgency_level: levelNum,
        urgency_level_text: levelText,
        differential_diagnosis: d.differential_diagnosis,
        clinical_summary: d.clinical_summary,
        age: d.age,
        disclaimer: d.disclaimer,
        priority_order: d.priority_order,
      };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
