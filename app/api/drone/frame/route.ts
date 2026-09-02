import { NextRequest, NextResponse } from "next/server";
import { postFrame } from "@/lib/droneState";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let imageBase64: string;
  let mimeType: string;

  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing imageBase64." },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(mimeType)) mimeType = "image/jpeg";
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  await postFrame(imageBase64, mimeType);
  return NextResponse.json({ success: true });
}
