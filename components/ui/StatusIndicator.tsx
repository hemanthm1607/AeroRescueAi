import { cn } from "@/lib/utils";

type Status = "online" | "offline" | "standby" | "alert";

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusConfig: Record<Status, { color: string; pulse: boolean; label: string }> = {
  online: { color: "bg-green-500", pulse: true, label: "Online" },
  offline: { color: "bg-gray-500", pulse: false, label: "Offline" },
  standby: { color: "bg-yellow-500", pulse: false, label: "Standby" },
  alert: { color: "bg-red-500", pulse: true, label: "Alert" },
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              config.color
            )}
          />
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2.5 w-2.5", config.color)}
        />
      </span>
      <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
        {label ?? config.label}
      </span>
    </div>
  );
}

export default StatusIndicator;
