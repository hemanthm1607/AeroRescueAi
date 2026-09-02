import { cn } from "@/lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>
    );
  }
  return <div className={cn("h-px bg-slate-700/60", className)} />;
}
