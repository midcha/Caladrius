import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Patient } from "@/models/Patient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await connectToDatabase();
    const doc = await Patient.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payload = { ...doc, _id: doc._id?.toString?.() ?? String(doc._id) } as any;
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
