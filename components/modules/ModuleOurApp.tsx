import {
  Info,
  ScanSearch,
  Video,
  ShieldAlert,
  Target,
  ArrowRight,
  ExternalLink,
  Brain,
} from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    color: "text-blue-400",
    border: "border-blue-500/25",
    bg: "bg-blue-500/10",
    title: "AI Image Analysis",
    desc: "Deep-learning vision models scan flood images to count survivors, measure water depth and detect structural damage.",
  },
  {
    icon: Video,
    color: "text-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/10",
    title: "Live Drone Detection",
    desc: "Stream live camera footage from any connected device and capture frames for instant AI analysis.",
  },
  {
    icon: ShieldAlert,
    color: "text-orange-400",
    border: "border-orange-500/25",
    bg: "bg-orange-500/10",
    title: "Hazard Detection",
    desc: "Automatically flags electrical, biological, structural, and debris hazards with severity ratings and safety warnings.",
  },
  {
    icon: Target,
    color: "text-red-400",
    border: "border-red-500/25",
    bg: "bg-red-500/10",
    title: "Rescue Prioritization",
    desc: "Ranks scenes CRITICAL → LOW and generates specific rescue action recommendations for ground teams.",
  },
];

const STEPS = [
  { num: 1, label: "Upload or capture", detail: "Upload a flood image or capture a frame from the live drone camera." },
  { num: 2, label: "AI analyses the scene", detail: "The AI engine scans the image using computer vision to identify key elements." },
  { num: 3, label: "People & hazards identified", detail: "Survivors, flood severity, water conditions and hazards are detected and catalogued." },
  { num: 4, label: "Priority & actions generated", detail: "A rescue priority level and specific recommended actions are delivered to your team." },
];

export default function ModuleOurApp() {
  return (
    <div className="flex flex-col gap-8">

      {/* Hero banner */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-900/80 to-[#080e1a] overflow-hidden shadow-xl shadow-cyan-950/20">
        <div className="px-6 py-8 flex flex-col sm:flex-row items-start gap-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 shrink-0">
            <Brain className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Aero<span className="text-blue-400">Ai</span>Rescue
            </h1>
            <p className="text-base text-cyan-300 font-semibold mt-1">AI-Powered Disaster Response Platform</p>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-2xl">
              AeroAiRescue combines AI-powered image analysis and drone monitoring to detect people, identify hazards,
              assess flood conditions and prioritize rescue operations — putting life-saving intelligence directly into
              the hands of emergency commanders in real time.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Platform Operational</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-xs text-slate-500">v1.0.0</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-xs text-slate-500">Powered by Groq AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-5 rounded-full bg-cyan-500" />
          <Info className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Features</h2>
          <div className="flex-1 h-px bg-slate-800/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, color, border, bg, title, desc }) => (
            <div key={title} className={`flex flex-col gap-3 p-5 rounded-2xl border ${border} ${bg} hover:brightness-110 transition-all`}>
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${bg} border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-0.5 h-5 rounded-full bg-blue-500" />
          <ArrowRight className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">How AeroAiRescue Works</h2>
          <div className="flex-1 h-px bg-slate-800/60" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STEPS.map(({ num, label, detail }) => (
            <div key={num} className="relative flex flex-col gap-3 p-5 rounded-2xl border border-slate-700/40 bg-slate-900/50">
              {/* Step number */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 shrink-0">
                <span className="text-base font-black text-blue-400">{num}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{label}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{detail}</p>
              </div>
              {/* Connector arrow — hidden on last */}
              {num < 4 && (
                <div className="hidden xl:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-slate-400">
          AI analysis powered by{" "}
          <span className="text-white font-semibold">Groq</span> vision models.
          Analysis history is stored locally in your browser — no data is sent to external servers except the AI model.
        </p>
        <a
          href="https://groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Learn More
        </a>
      </div>
    </div>
  );
}
