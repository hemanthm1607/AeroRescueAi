import { NextResponse } from "next/server";
import { isDroneConnected, peekFrame, consumeFrame } from "@/lib/droneState";

export interface DroneStatusResponse {
  connected: boolean;
  pendingFrame?: { imageBase64: string; mimeType: string };
}

/**
 * GET /api/drone/status
 * Returns connection state and optionally the pending frame.
 * consume=1 reads + clears the pending frame so it is delivered once.
 */
export async function GET(req: Request): Promise<NextResponse<DroneStatusResponse>> {
  const { searchParams } = new URL(req.url);
  const consume = searchParams.get("consume") === "1";

  console.log(`[/api/drone/status] Laptop polled — consume=${consume}`);

  const connected = isDroneConnected();
  const frame = consume ? consumeFrame() : peekFrame();

  console.log(`[/api/drone/status] Result: connected=${connected} hasFrame=${!!frame}`);

  const response: DroneStatusResponse = {
    connected,
    ...(frame ? { pendingFrame: { imageBase64: frame.imageBase64, mimeType: frame.mimeType } } : {}),
  };

  return NextResponse.json(response);
}
