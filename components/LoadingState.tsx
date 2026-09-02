import { ScanSearch, Wifi, Cpu, Eye, Brain } from "lucide-react";

const steps = [
  { icon: <Wifi className="w-3.5 h-3.5" />, label: "Connecting to AI engine" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Scanning flood scene" },
  { icon: <Brain className="w-3.5 h-3.5" />, label: "Identifying people & hazards" },
  { icon: <Cpu className="w-3.5 h-3.5" />, label: "Calculating rescue priority" },
];

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-6 py-10 px-6">
      {/* Animated radar ring */}
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Outer ring ping */}
        <span className="absolute inline-flex w-24 h-24 rounded-full bg-blue-500/10 animate-ping" />
        {/* Middle ring */}
        <span className="absolute inline-flex w-16 h-16 rounded-full border-2 border-blue-500/30 animate-pulse" />
        {/* Center icon */}
        <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-600/40 to-blue-800/40 border-2 border-blue-500/50 shadow-lg shadow-blue-900/40">
          <ScanSearch className="w-7 h-7 text-blue-300 animate-pulse" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-base font-bold text-slate-100 tracking-tight">
          Analyzing Disaster Scene
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          AI processing in progress — please wait…
        </p>
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/40"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <span className="text-blue-400 shrink-0">{step.icon}</span>
            <span className="text-xs text-slate-300 flex-1">{step.label}</span>
            {/* Animated dots */}
            <span className="flex gap-0.5">
              {[0, 1, 2].map((j) => (
                <span
                  key={j}
                  className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.3 + j * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
