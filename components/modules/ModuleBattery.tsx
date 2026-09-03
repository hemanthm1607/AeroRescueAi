"use client";

import { useEffect, useState, useRef } from "react";
import {
  BatteryCharging,
  Wifi,
  Gauge,
  Navigation,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  WifiOff,
  Camera,
} from "lucide-react";
import { Realtime } from "ably";
import type { Message } from "ably";
import { cn } from "@/lib/utils";
import type { DroneTelemetry } from "@/types";
import { DRONE_CHANNEL, EVENT_TELEMETRY } from "@/lib/ablyConfig";

function batteryColor(p: number | string) {
  if (typeof p === "string") return { bar: "bg-slate-600", text: "text-slate-400", border: "border-slate-600/30", bg: "bg-slate-600/10" };
  if (p >= 60) return { bar: "bg-green-500", text: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10" };
  if (p >= 30) return { bar: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
  return { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10" };
}

function batteryLabel(p: number | string) {
  if (typeof p === "string") return p;
  if (p >= 80) return "Excellent";
  if (p >= 60) return "Good";
  if (p >= 30) return "Moderate";
  return "Low";
}

export default function ModuleBattery() {
  const [telemetry, setTelemetry] = useState<DroneTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ablyRef = useRef<Realtime | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[ModuleBattery] NEXT_PUBLIC_ABLY_KEY is not set");
      return;
    }

    const ably = new Realtime({ key, autoConnect: true });
    ablyRef.current = ably;

    ably.connection.on("connected", () => {
      console.log("[ModuleBattery] Ably connected");
      setIsConnected(true);
    });

    ably.connection.on("disconnected", () => {
      console.log("[ModuleBattery] Ably disconnected");
      setIsConnected(false);
    });

    const ch = ably.channels.get(DRONE_CHANNEL);

    // Subscribe to telemetry updates
    const telemetryHandler = (msg: Message) => {
      const payload = msg.data as DroneTelemetry;
      console.log("[ModuleBattery] Telemetry received:", payload);
      setTelemetry(payload);
    };

    ch.subscribe(EVENT_TELEMETRY, telemetryHandler);

    return () => {
      ch.unsubscribe();
      ably.close();
    };
  }, []);

  const batteryPercent = telemetry?.battery?.level ?? 0;
  const batteryHealth = telemetry?.battery?.health ?? "Unavailable";
  const c = batteryColor(batteryPercent);
  const label = batteryLabel(batteryPercent);

  const altitude = telemetry?.altitude ?? null;
  const speed = telemetry?.speed ?? null;
  const signalStrength = telemetry?.comms?.connected ? "Online" : "Offline";
  const cameraActive = telemetry?.camera?.active ?? false;

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl border", c.bg, c.border)}>
          <BatteryCharging className={cn("w-5 h-5", c.text)} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">Drone Battery & Flight Status</h1>
          <p className="text-xs text-slate-500">
            {!telemetry ? "Waiting for phone telemetry…" : "Real device telemetry from phone camera"}
          </p>
        </div>
      </div>

      {/* Main battery card */}
      <div className={cn("rounded-2xl border p-6 shadow-lg", c.border, "bg-gradient-to-br from-slate-900/80 to-[#080e1a]")}>
        {!telemetry ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No telemetry data available</p>
            <p className="text-xs text-slate-500 mt-2">Start the phone camera to begin receiving telemetry</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left — big indicator */}
            <div className="flex flex-col gap-5">
              {/* Circular indicator (CSS only) */}
              <div className="flex items-center gap-5">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={batteryPercent >= 60 ? "#22c55e" : batteryPercent >= 30 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - batteryPercent / 100)}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-2xl font-black leading-none", c.text)}>{batteryPercent}%</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <InfoRow icon={<Clock className="w-4 h-4 text-slate-400" />} label="Flight Time Left" value="Unavailable" />
                  <InfoRow icon={<CheckCircle2 className={cn("w-4 h-4", telemetry.camera?.active ? "text-green-400" : "text-slate-600")} />} label="Camera Status" value={telemetry.camera?.active ? "Active" : "Inactive"} valueClass={telemetry.camera?.active ? "text-green-300" : "text-slate-400"} />
                  <InfoRow icon={<Zap className="w-4 h-4 text-slate-400" />} label="Battery Health" value={batteryHealth} valueClass="text-slate-300" />
                </div>
              </div>

              {/* Battery bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-5 bg-slate-800 rounded-xl overflow-hidden border border-slate-700/40 relative">
                    <div
                      className={cn("h-full rounded-xl transition-all duration-700", c.bar)}
                      style={{ width: `${batteryPercent}%` }}
                    />
                    {[25, 50, 75].map((t) => (
                      <div key={t} className="absolute top-0 bottom-0 w-px bg-slate-900/60" style={{ left: `${t}%` }} />
                    ))}
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80 mix-blend-overlay pointer-events-none">
                      {batteryPercent}% · {label}
                    </span>
                  </div>
                  <div className="w-2.5 h-3.5 rounded-r-sm bg-slate-600 shrink-0" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 font-mono px-0.5">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* Right — telemetry */}
            <div className="flex flex-col gap-5">
              {/* Device Status */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Device Status</p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-24 shrink-0">Battery Charge</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", c.bar)} style={{ width: `${batteryPercent}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-8 text-right shrink-0">{batteryPercent}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-24 shrink-0">Charging</span>
                    <div className="flex-1">
                      <span className={cn("text-xs font-semibold", telemetry.battery?.charging ? "text-green-300" : "text-slate-400")}>
                        {telemetry.battery?.charging ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Telemetry (Real-time)</p>
                <div className="grid grid-cols-2 gap-2">
                  <TelemetryCard icon={<Radio className="w-4 h-4 text-green-400" />} label="Comms" value={signalStrength} color={telemetry.comms?.connected ? "text-green-300" : "text-red-300"} />
                  <TelemetryCard icon={<Navigation className="w-4 h-4 text-blue-400" />} label="Altitude" value={altitude !== null && altitude !== undefined ? `${altitude} m` : "Unavailable"} color="text-blue-300" />
                  <TelemetryCard icon={<Gauge className="w-4 h-4 text-purple-400" />} label="Speed" value={speed !== null && speed !== undefined ? `${speed} km/h` : "Unavailable"} color="text-purple-300" />
                  <TelemetryCard icon={<Camera className="w-4 h-4 text-cyan-400" />} label="Camera" value={cameraActive ? "Active" : "Inactive"} color={cameraActive ? "text-cyan-300" : "text-slate-400"} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BatteryCharging className={cn("w-5 h-5", c.text)} />, label: "Battery Level", value: `${batteryPercent}%`, sub: label, border: batteryPercent >= 60 ? "border-green-500/20" : batteryPercent >= 30 ? "border-amber-500/20" : "border-red-500/20", bg: batteryPercent >= 60 ? "bg-green-500/5" : batteryPercent >= 30 ? "bg-amber-500/5" : "bg-red-500/5" },
          { icon: <Clock className="w-5 h-5 text-blue-400" />, label: "Est. Flight Time", value: "Unavailable", sub: "No drone data", border: "border-slate-500/20", bg: "bg-slate-500/5" },
          { icon: <Camera className={cn("w-5 h-5", cameraActive ? "text-cyan-400" : "text-slate-600")} />, label: "Camera Status", value: cameraActive ? "Active" : "Inactive", sub: cameraActive ? "Recording" : "Standby", border: cameraActive ? "border-cyan-500/20" : "border-slate-500/20", bg: cameraActive ? "bg-cyan-500/5" : "bg-slate-500/5" },
          { icon: telemetry?.comms?.connected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />, label: "Connection", value: telemetry?.comms?.connected ? "Online" : "Offline", sub: "Ably link", border: telemetry?.comms?.connected ? "border-green-500/20" : "border-red-500/20", bg: telemetry?.comms?.connected ? "bg-green-500/5" : "bg-red-500/5" },
        ].map(({ icon, label: l, value, sub, border, bg }) => (
          <div key={l} className={cn("rounded-xl border p-4 flex flex-col gap-2", border, bg)}>
            {icon}
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{l}</p>
            <p className="text-lg font-bold text-slate-100 leading-tight">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      {!telemetry ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/80 leading-relaxed">
            <strong className="text-blue-300">Waiting for telemetry:</strong>{" "}
            Open the drone camera on your phone to start sending real device telemetry (battery, GPS, camera status, connection state).
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-xs text-green-300/80 leading-relaxed">
            <strong className="text-green-300">Real-time telemetry:</strong>{" "}
            Displaying actual device data from the phone. Values update every 2 seconds while camera is active. "Unavailable" indicates data not provided by the browser or device.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, valueClass = "text-slate-200" }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <span className={cn("text-xs font-semibold", valueClass)}>{value}</span>
    </div>
  );
}

function TelemetryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
      {icon}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={cn("text-xs font-bold", color)}>{value}</p>
      </div>
    </div>
  );
}
