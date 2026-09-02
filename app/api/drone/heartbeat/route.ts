import { NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/droneState";

export async function POST(): Promise<NextResponse> {
  console.log("[/api/drone/heartbeat] Heartbeat received from phone");
  recordHeartbeat();
  return NextResponse.json({ ok: true });
}
