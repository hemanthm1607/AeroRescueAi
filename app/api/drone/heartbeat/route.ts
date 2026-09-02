import { NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/droneState";

export async function POST(): Promise<NextResponse> {
  await recordHeartbeat();
  return NextResponse.json({ ok: true });
}
