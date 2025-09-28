import { NextRequest, NextResponse } from "next/server";
import { notifyClients } from "../events/route";

interface ConnectRequest {
  sessionId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ConnectRequest = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    notifyClients(sessionId, "PHONE_CONNECTED");

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}