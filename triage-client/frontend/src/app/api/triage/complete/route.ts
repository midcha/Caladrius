import { NextRequest, NextResponse } from "next/server";
import { notifyClients } from "../events/route";

interface CompleteRequest {
  sessionId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CompleteRequest = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    notifyClients(sessionId, "BUNDLE_READY");

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
