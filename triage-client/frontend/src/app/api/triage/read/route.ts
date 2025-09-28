import { NextRequest, NextResponse } from "next/server";
import { readZip } from "../../../../../lib/s3";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const key = `runs/${sessionId}/bundle.zip`;

  const { json, images, attachments } = await readZip(key);

    const imagesBase64: Record<string, string> = {};
    for (const [filename, buffer] of Object.entries(images)) {
      imagesBase64[filename] = buffer.toString("base64");
    }

    return NextResponse.json({
      json,
      images: imagesBase64,
      attachments,
    });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}