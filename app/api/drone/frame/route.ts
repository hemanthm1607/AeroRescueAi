import { NextRequest, NextResponse } from "next/server";
import { postFrame } from "@/lib/droneState";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("[/api/drone/frame] Frame received from phone");

  let imageBase64: string;
  let mimeType: string;

  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";

    if (!imageBase64 || typeof imageBase64 !== "string") {
      console.warn("[/api/drone/frame] Missing or invalid imageBase64");
      return NextResponse.json(
        { success: false, error: "Missing imageBase64." },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(mimeType)) mimeType = "image/jpeg";

    console.log(`[/api/drone/frame] Storing frame — mimeType=${mimeType} base64Length=${imageBase64.length}`);
  } catch {
    console.error("[/api/drone/frame] Failed to parse request body");
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  postFrame(imageBase64, mimeType);
  console.log("[/api/drone/frame] Frame stored successfully");
  return NextResponse.json({ success: true });
}
