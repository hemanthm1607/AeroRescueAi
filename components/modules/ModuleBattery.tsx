"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const BATTERY_PERCENT = 85;

// ─── Simulation data ─────────────────────────────────────────────────────────
const SIM = {
  flightTimeRemaining: 25,
  flightStatus: "Ready for Deployment",
  batteryHealth: "Excellent",
  signalStrength: 92,
  altitude: 0,
  speed: 0,
};

const SUB_SYSTEMS = [
  { label: "Drone Systems",  value: 92, color: "bg-blue-500"   },
  { label: "Camera Module",  value: 88, color: "bg-purple-500" },
  { label: "Comms Module",   value: 78, color: "bg-cyan-500"   },
  { label: "AI Processor",   value: 85, color: "bg-green-500"  },
];

function batteryColor(p: number) {
  if (p >= 60) return { bar: "bg-green-500", text: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10" };
  if (p >= 30) return { bar: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
  return { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10" };
}

function batteryLabel(p: number) {
  if (p >= 80) return "Excellent";
  if (p >= 60) return "Good";
  if (p >= 30) return "Moderate";
  return "Low";
}

export default function ModuleBattery() {
  const p = BATTERY_PERCENT;
  const c = batteryColor(p);
  const label = batteryLabel(p);

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
            Simulation Data — no physical drone connected.{" "}
            <span className="text-amber-400">Values are illustrative only.</span>
          </p>
        </div>
      </div>

      {/* Main battery card */}
      <div className={cn("rounded-2xl border p-6 shadow-lg", c.border, "bg-gradient-to-br from-slate-900/80 to-[#080e1a]")}>
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
                    stroke={p >= 60 ? "#22c55e" : p >= 30 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - p / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-black leading-none", c.text)}>{p}%</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <InfoRow icon={<Clock className="w-4 h-4 text-slate-400" />} label="Flight Time Left" value={`${SIM.flightTimeRemaining} min`} />
                <InfoRow icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} label="Flight Status" value={SIM.flightStatus} valueClass="text-green-300" />
                <InfoRow icon={<Zap className="w-4 h-4 text-amber-400" />} label="Battery Health" value={SIM.batteryHealth} valueClass="text-amber-300" />
              </div>
            </div>

            {/* Battery bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <div className="flex-1 h-5 bg-slate-800 rounded-xl overflow-hidden border border-slate-700/40 relative">
                  <div
                    className={cn("h-full rounded-xl transition-all duration-700", c.bar)}
                    style={{ width: `${p}%` }}
                  />
                  {[25, 50, 75].map((t) => (
                    <div key={t} className="absolute top-0 bottom-0 w-px bg-slate-900/60" style={{ left: `${t}%` }} />
                  ))}
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80 mix-blend-overlay pointer-events-none">
                    {p}% · {label}
                  </span>
                </div>
                <div className="w-2.5 h-3.5 rounded-r-sm bg-slate-600 shrink-0" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 font-mono px-0.5">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* Right — sub-systems + telemetry */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sub-system Charge</p>
              <div className="flex flex-col gap-2.5">
                {SUB_SYSTEMS.map(({ label: l, value, color }) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28 shrink-0">{l}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${value}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-8 text-right shrink-0">{value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Telemetry */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Telemetry{" "}
                <span className="text-amber-500/80 normal-case tracking-normal font-normal">(Simulation)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <TelemetryCard icon={<Wifi className="w-4 h-4 text-cyan-400" />} label="Signal" value={`${SIM.signalStrength}%`} color="text-cyan-300" />
                <TelemetryCard icon={<Navigation className="w-4 h-4 text-blue-400" />} label="Altitude" value={`${SIM.altitude} m`} color="text-blue-300" />
                <TelemetryCard icon={<Gauge className="w-4 h-4 text-purple-400" />} label="Speed" value={`${SIM.speed} km/h`} color="text-purple-300" />
                <TelemetryCard icon={<Radio className="w-4 h-4 text-green-400" />} label="Comms" value="Online" color="text-green-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BatteryCharging className="w-5 h-5 text-green-400" />, label: "Battery Level", value: `${p}%`, sub: label, border: "border-green-500/20", bg: "bg-green-500/5" },
          { icon: <Clock className="w-5 h-5 text-blue-400" />, label: "Est. Flight Time", value: `${SIM.flightTimeRemaining} min`, sub: "Remaining", border: "border-blue-500/20", bg: "bg-blue-500/5" },
          { icon: <Cpu className="w-5 h-5 text-purple-400" />, label: "Flight Status", value: "Ready", sub: SIM.flightStatus, border: "border-purple-500/20", bg: "bg-purple-500/5" },
          { icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, label: "Battery Health", value: SIM.batteryHealth, sub: "Based on charge cycles", border: "border-amber-500/20", bg: "bg-amber-500/5" },
        ].map(({ icon, label: l, value, sub, border, bg }) => (
          <div key={l} className={cn("rounded-xl border p-4 flex flex-col gap-2", border, bg)}>
            {icon}
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{l}</p>
            <p className="text-lg font-bold text-slate-100 leading-tight">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Simulation disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <strong className="text-amber-300">Simulation Data:</strong>{" "}
          No physical drone hardware is connected. All battery, telemetry, and flight data shown here are illustrative values for demonstration purposes only.
        </p>
      </div>
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
