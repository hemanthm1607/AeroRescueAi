import {
  Brain,
  Video,
  ShieldCheck,
  Bell,
  Info,
  ExternalLink,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    title: "AI Image Analysis",
    desc: "Deep-learning models identify people, assess flood depth, and detect structural damage from aerial images.",
  },
  {
    icon: Video,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/25",
    title: "Live Drone Monitoring",
    desc: "Connect any browser-accessible camera as a drone feed for real-time scene capture and analysis.",
  },
  {
    icon: ShieldCheck,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/25",
    title: "Rescue Prioritization",
    desc: "Automatically ranks rescue urgency (CRITICAL → LOW) so commanders deploy resources where they matter most.",
  },
  {
    icon: Bell,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
    title: "Real-time Hazard Alerts",
    desc: "Identifies electrical, biological, structural, and debris hazards with severity ratings and recommended actions.",
  },
];

export default function OurApp() {
  return (
    <section
      id="ourapp-section"
      className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-cyan-950/20 to-slate-900/80 overflow-hidden shadow-xl shadow-slate-950/40"
    >
      {/* Header band */}
      <div className="px-6 py-5 border-b border-slate-700/40 bg-slate-900/50 flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 shrink-0">
          <Info className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-white tracking-tight">Our App</h2>
          <p className="text-sm text-cyan-300 font-medium mt-0.5">AI-Powered Disaster Response Platform</p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-2xl">
            AeroAiRescue uses AI-powered image analysis and drone technology to detect hazards, identify people,
            assess flood severity, and prioritize rescue operations — putting life-saving intelligence into the hands
            of emergency commanders in real time.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-6">
        {features.map(({ icon: Icon, color, bg, title, desc }) => (
          <div
            key={title}
            className={`flex flex-col gap-3 p-4 rounded-xl border ${bg} transition-colors hover:brightness-110`}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer row */}
      <div className="px-6 pb-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">Platform operational · v1.0.0</span>
        </div>
        <a
          href="https://groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Learn More
        </a>
      </div>
    </section>
  );
}
