import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Patient } from "@/models/Patient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    console.log("CONNECTION");
    // Prefer manual priority_order if present, then by level, then by priority
    const docs = await Patient.find().sort({ priority_order: 1, level: 1, priority: 1 });
    console.log(docs);
    // Map to shape expected by UI
    const TRIAGE_TEXT: Record<number, string> = {
      1: "Emergency",
      2: "High",
      3: "Urgent",
      4: "Less-Urgent",
      5: "Non-Urgent",
    };

    const patients = docs.map((d: any) => ({
      _id: d._id.toString(),
      name: d.name,
      symptoms: d.symptoms,
      urgency_level: d.level,
      urgency_level_text: TRIAGE_TEXT[d.level] || String(d.level),
      // priority_order and priority not exposed by default
    }));

    return NextResponse.json(patients);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
